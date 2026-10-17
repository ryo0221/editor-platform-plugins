// From repository root: node --import tsx --test integrations/chatgpt/tool-auth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from 'jose';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createEditorServer } from '../../src/server/mcp.ts';
import { startHttp } from '../../src/server/main.ts';
import { DeckStore } from '../../src/server/decks.ts';
import { configuration, verifier } from './gateway.mjs';
const c = configuration({resource:'https://editor.example.invalid/mcp',issuer:'https://id.example.invalid/',jwks:'https://id.example.invalid/jwks',algorithm:'RS256',subject:'owner',clientId:'client',scope:'editor:workspace',upstream:'http://127.0.0.1:8787/mcp',upstreamToken:'t'.repeat(32)});
const pair = await generateKeyPair('RS256');
const verify = verifier(c,createLocalJWKSet({keys:[await exportJWK(pair.publicKey)]}));
const token = (claims={}) => new SignJWT({iss:c.issuer,aud:c.resource,sub:c.subject,client_id:c.clientId,scope:c.scope,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...claims}).setProtectedHeader({alg:'RS256',typ:'at+jwt'}).sign(pair.privateKey);
const oauth = {resource:c.resource,issuer:c.issuer,scope:c.scope,verifyAccessToken:verify};
const challenge = (response, error='invalid_token') => {
  assert.equal(response.status,200);
  assert.equal(response.body.result.isError,true);
  assert.equal(response.body.result.structuredContent,undefined);
  const value=response.body.result._meta['mcp/www_authenticate'][0];
  assert.ok(value.includes(`error="${error}"`));
  assert.match(value,/error_description="[^"]+"/);
  assert.ok(value.includes(`scope="${c.scope}"`));
  assert.ok(value.includes('resource_metadata="https://editor.example.invalid/.well-known/oauth-protected-resource/mcp"'));
};
async function fixture(t, policy=oauth) {
  const dir=await mkdtemp(join(tmpdir(),'editor-tool-auth-'));
  const store=new DeckStore(dir);
  const server=startHttp({host:'127.0.0.1',port:0,allowedHost:'editor.example.invalid',store,oauth:policy});
  await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
  const url=`http://127.0.0.1:${server.address().port}`;
  let id=0;
  const send=(body,headers={},path='/mcp',method='POST')=>new Promise((resolve,reject)=>{
    const req=request(url+path,{method,headers:{host:'editor.example.invalid',accept:'application/json, text/event-stream','content-type':'application/json',...headers}},async res=>{
      let text='';for await(const chunk of res)text+=chunk;
      resolve({status:res.statusCode,headers:res.headers,body:text.startsWith('{')?JSON.parse(text):text});
    });req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });
  const rpc=(method,params={},headers={},extra={})=>send({jsonrpc:'2.0',id:++id,method,params,...extra},headers);
  const call=(name,args={},headers={},extra={})=>rpc('tools/call',{name,arguments:args},headers,extra);
  return {dir,store,send,rpc,call};
}

test('OAuth discovery mirrors schemes without changing schemas or human-only visibility',async t=>{
  const f=await fixture(t); const headers={authorization:`Bearer ${await token()}`};
  const metadata=await f.send(undefined,{},'/.well-known/oauth-protected-resource/mcp','GET');
  assert.equal(metadata.status,200);assert.equal(metadata.body.resource,c.resource);
  const tools=(await f.rpc('tools/list',{},headers)).body.result.tools;
  const local=createEditorServer(f.store);const client=new Client({name:'comparison',version:'1'});
  const [a,b]=InMemoryTransport.createLinkedPair();await local.connect(a);await client.connect(b);
  t.after(async()=>{await client.close();await local.close();});
  const ordinary=(await client.listTools()).tools;
  assert.equal(tools.length,ordinary.length);
  for(const tool of tools) {
    const original=ordinary.find(x=>x.name===tool.name);
    assert.deepEqual(tool.securitySchemes,[{type:'oauth2',scopes:[c.scope]}]);
    assert.deepEqual(tool._meta.securitySchemes,tool.securitySchemes);
    assert.deepEqual(tool.inputSchema,original.inputSchema);
    assert.deepEqual(tool.annotations,original.annotations);
    assert.deepEqual(tool._meta.ui,original._meta.ui);
    assert.equal(original._meta.securitySchemes,undefined);
  }
  assert.deepEqual(tools.find(x=>x.name==='save_slide_draft')._meta.ui.visibility,['app']);
});

test('missing/expired/insufficient/foreign credentials challenge without reading or writing; reconnect works',async t=>{
  const f=await fixture(t);const auth={authorization:`Bearer ${await token()}`};
  for(const method of ['initialize','tools/list','resources/list','resources/read']) {
    const response=await f.rpc(method);
    assert.equal(response.status,401);assert.match(response.headers['www-authenticate'],/error="invalid_token"/);
  }
  const batch=await f.send([{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'create_deck',arguments:{title:'blocked'}}}]);
  assert.equal(batch.status,401);
  for(const [claims,error] of [[null,'invalid_token'],[{exp:1},'invalid_token'],[{scope:'other'},'insufficient_scope'],[{sub:'other'},'invalid_token'],[{client_id:'other'},'invalid_token'],[{aud:'other'},'invalid_token']]) {
    const headers=claims?{authorization:`Bearer ${await token(claims)}`} : {};
    challenge(await f.call('create_deck',{title:'Never created'},headers),error);
    challenge(await f.call('list_artifacts',{},headers),error);
  }
  assert.deepEqual(await readdir(f.dir),[]);
  const created=await f.call('create_deck',{title:'Authorized'},auth);
  assert.equal(created.body.result.isError,undefined);
  const deck=created.body.result.structuredContent.deck;
  challenge(await f.call('read_deck',{deckId:deck.id},{authorization:`Bearer ${await token({exp:1})}`}));
  // A fresh owner-bound credential restores access; no sticky session-level authorization.
  const reread=await f.call('read_deck',{deckId:deck.id},{authorization:`Bearer ${await token()}`});
  assert.equal(reread.body.result.structuredContent.deck.id,deck.id);
  challenge(await f.call('save_slide_draft',{deckId:deck.id,baseRevision:deck.revision,content:deck.content}));
  assert.equal((await f.store.read(deck.id)).revision,deck.revision);
});

test('headers, tool arguments and RPC metadata cannot forge trusted authorization',async t=>{
  const f=await fixture(t);const valid=await token();
  const forgedHeaders={'x-forwarded-user':'owner','x-authenticated-user':'owner','x-editor-authorized':'true','x-forwarded-authorization':`Bearer ${valid}`};
  challenge(await f.call('create_deck',{title:'Spoofed'},forgedHeaders));
  challenge(await f.rpc('tools/call',{name:'create_deck',arguments:{title:'Spoofed'},_meta:{authInfo:{token:valid,scopes:[c.scope]},authorized:true}},forgedHeaders));
  assert.equal((await f.call('create_deck',{title:'Spoofed'},forgedHeaders,{_meta:{authorized:true}})).status,400);
  challenge(await f.call('create_deck',{title:'Forged session'},{...forgedHeaders,'mcp-session-id':'authorized'}));
  const argumentForgery=await f.call('create_deck',{title:'Spoofed',authorization:`Bearer ${valid}`,authInfo:{token:valid},oauth:{authorized:true}},forgedHeaders);
  // SDK validation can reject unexpected fields before the hook; either result must deny.
  assert.ok(argumentForgery.body.result?.isError || argumentForgery.body.error);
  assert.deepEqual(await readdir(f.dir),[]);
  const bad=await f.call('create_deck',{title:'Spoofed'},{...forgedHeaders,authorization:'Bearer internal-static-token'});
  challenge(bad);
  assert.deepEqual(await readdir(f.dir),[]);
});

test('tool hook revalidates and fails closed after transport check or verifier failure',async t=>{
  let count=0;
  const f=await fixture(t,{...oauth,verifyAccessToken:async value=>{if(++count===1)return verify(value);throw Error('fixture outage: do not disclose');}});
  const response=await f.call('create_deck',{title:'Never created'},{authorization:`Bearer ${await token()}`});
  challenge(response);assert.equal(count,2);assert.ok(!JSON.stringify(response).includes('fixture outage'));
  assert.deepEqual(await readdir(f.dir),[]);
});

test('model-only tools remain omitted and direct calls refused with OAuth hook',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'editor-model-auth-'));
  const server=createEditorServer(new DeckStore(dir),undefined,{modelOnly:true,oauth:{scope:c.scope,authorize:async()=>undefined}});
  const client=new Client({name:'model-only',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();
  await server.connect(a);await client.connect(b);
  t.after(async()=>{await client.close();await server.close();await rm(dir,{recursive:true,force:true});});
  const names=(await client.listTools()).tools.map(x=>x.name);
  for(const name of ['save_slide_draft','apply_slide_proposal','reject_slide_proposal','save_artifact_draft','apply_artifact_proposal','set_artifact_selection']) {
    assert.ok(!names.includes(name));assert.equal((await client.callTool({name,arguments:{}})).isError,true);
  }
  assert.ok(!(await client.callTool({name:'create_deck',arguments:{title:'Model allowed'}})).isError);
});

test('OAuth mode cannot mix internal bearer/browser/demo or bind publicly',()=>{
  const store=new DeckStore('unused');
  for(const patch of [{token:'x'.repeat(32)},{demo:true},{browserHtml:new URL('file:///unused')},{host:'0.0.0.0'},{oauth:{...oauth,scope:undefined}}]) {
    assert.throws(()=>startHttp({host:'127.0.0.1',port:0,store,oauth,...patch}));
  }
});

test('concurrent requests do not share authorization and invalid requests cannot borrow an authorized session',async t=>{
  const f=await fixture(t);const auth={authorization:`Bearer ${await token()}`,'mcp-session-id':'same-session'};
  const [allowed,denied]=await Promise.all([
    f.call('create_deck',{title:'Only authorized creation'},auth),
    f.call('create_deck',{title:'Must not exist'},{'mcp-session-id':'same-session'}),
  ]);
  assert.equal(allowed.body.result.isError,undefined);challenge(denied);
  const listed=await f.call('list_artifacts',{},auth);
  assert.ok(!JSON.stringify(listed.body).includes('Must not exist'));
  assert.ok(JSON.stringify(listed.body).includes('Only authorized creation'));
});
