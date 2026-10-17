// node --import tsx --test integrations/chatgpt/runtime.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { generateKeyPair, createLocalJWKSet, exportJWK, SignJWT } from 'jose';
import { DeckStore } from '../../src/server/decks.ts';
import { loadConfiguration, startRuntime } from './server.mjs';
const source=new URL('../../',import.meta.url);

async function setup(t) {
  const directory=await mkdtemp(join(tmpdir(),'chatgpt-runtime-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const config={resource:'https://editor.example.invalid/mcp',issuer:'https://identity.example.invalid/',jwks:'https://identity.example.invalid/jwks',algorithm:'RS256',subject:'owner',clientId:'client',scope:'editor:workspace',dataDirectory:join(directory,'data'),metadataFile:join(directory,'metadata.json'),port:0,registrationMode:'pre_registered',tokenEndpointAuthMethod:'none'};
  await writeFile(config.metadataFile,JSON.stringify({issuer:config.issuer,authorization_endpoint:config.issuer+'authorize',token_endpoint:config.issuer+'token',jwks_uri:config.jwks,response_types_supported:['code'],code_challenge_methods_supported:['S256'],scopes_supported:[config.scope],token_endpoint_auth_methods_supported:['none']}));
  const configFile=join(directory,'config.json');await writeFile(configFile,JSON.stringify(config));
  return {configFile,...await loadConfiguration(configFile)};
}
const rpc=(server,method,params={},token)=>new Promise((resolve,reject)=>{
  const req=request(`http://127.0.0.1:${server.address().port}/mcp`,{method:'POST',headers:{host:'editor.example.invalid',accept:'application/json, text/event-stream','content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})}},async res=>{
    let text='';for await(const chunk of res)text+=chunk;
    resolve({status:res.statusCode,body:JSON.parse(text)});
  });req.on('error',reject);req.end(JSON.stringify({jsonrpc:'2.0',id:1,method,params}));
});

test('config-only CLI is offline and does not create workspace or acquire credentials',async t=>{
  const {configFile,config}=await setup(t);
  const child=spawn(process.execPath,['--import','tsx','integrations/chatgpt/server.mjs','--check-config'],{cwd:source,env:{...process.env,EDITOR_OAUTH_CONFIG:configFile},stdio:['ignore','pipe','pipe']});
  let out='';child.stdout.on('data',x=>out+=x);let err='';child.stderr.on('data',x=>err+=x);
  const code=await new Promise(r=>child.on('exit',r));assert.equal(code,0,err);
  assert.equal(JSON.parse(out).status,'OFFLINE_METADATA_VALID');
  await assert.rejects(access(config.dataDirectory));
});

test('integrated runtime locks one workspace, authorizes real MCP, drains and permits restart',async t=>{
  const {config}=await setup(t);const pair=await generateKeyPair('RS256');
  const keys=createLocalJWKSet({keys:[await exportJWK(pair.publicKey)]});
  const runtime=await startRuntime(config,keys);t.after(()=>runtime.close());
  assert.equal(runtime.server.address().address,'127.0.0.1');
  await assert.rejects(startRuntime(config,keys),/already open/);
  const occupied={...config,dataDirectory:join(config.dataDirectory,'occupied-port'),port:runtime.server.address().port};
  await assert.rejects(startRuntime(occupied,keys),{code:'EADDRINUSE'});
  await assert.rejects(access(join(occupied.dataDirectory,'.claude-code.lock')));
  const absent=await rpc(runtime.server,'tools/call',{name:'create_deck',arguments:{title:'No auth'}});
  assert.equal(absent.body.result.isError,true);assert.ok(absent.body.result._meta['mcp/www_authenticate']);
  const bearer=await new SignJWT({scope:config.scope,client_id:config.clientId}).setProtectedHeader({alg:'RS256',typ:'at+jwt'}).setIssuer(config.issuer).setAudience(config.resource).setSubject(config.subject).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
  const made=await rpc(runtime.server,'tools/call',{name:'create_deck',arguments:{title:'Runtime retained'}},bearer);
  assert.equal(made.body.result.isError,undefined);const deck=made.body.result.structuredContent.deck;
  await runtime.close();await assert.rejects(access(join(config.dataDirectory,'.claude-code.lock')));
  const restarted=await startRuntime(config,keys);t.after(()=>restarted.close());
  const reread=await rpc(restarted.server,'tools/call',{name:'read_deck',arguments:{deckId:deck.id}},bearer);
  assert.equal(reread.body.result.structuredContent.deck.title,'Runtime retained');
});


test('shutdown retains workspace lock while a disconnected request is still writing',async t=>{
  const {config}=await setup(t);const pair=await generateKeyPair('RS256');
  const keys=createLocalJWKSet({keys:[await exportJWK(pair.publicKey)]});
  const bearer=await new SignJWT({scope:config.scope,client_id:config.clientId}).setProtectedHeader({alg:'RS256',typ:'at+jwt'}).setIssuer(config.issuer).setAudience(config.resource).setSubject(config.subject).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
  let release,started;const entered=new Promise(r=>started=r);const gate=new Promise(r=>release=r);
  const original=DeckStore.prototype.create;
  t.mock.method(DeckStore.prototype,'create',async function(...args){started();await gate;return original.apply(this,args);});
  const runtime=await startRuntime(config,keys);t.after(async()=>{release();await runtime.close().catch(()=>{});});
  const req=request(`http://127.0.0.1:${runtime.server.address().port}/mcp`,{method:'POST',headers:{host:'editor.example.invalid',accept:'application/json, text/event-stream','content-type':'application/json',authorization:`Bearer ${bearer}`}});
  req.on('error',()=>{});req.end(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'create_deck',arguments:{title:'Pending write'}}}));
  await entered;req.destroy();
  let closed=false;const closing=runtime.close().finally(()=>closed=true);
  const rejected=assert.rejects(closing,/lock retained/);
  await new Promise(r=>setImmediate(r));
  assert.equal(closed,false);await access(join(config.dataDirectory,'.claude-code.lock'));
  release();await rejected;await access(join(config.dataDirectory,'.claude-code.lock'));
});
