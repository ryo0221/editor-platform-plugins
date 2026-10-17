// Run from repository root after npm run build:
// node --import tsx --test integrations/chatgpt/mcp-smoke.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from 'jose';
import { startHttp } from '../../src/server/main.ts';
import { DeckStore } from '../../src/server/decks.ts';
import { configuration, gateway, verifier } from './gateway.mjs';

test('authenticated adapter reaches real MCP initialization, discovery and guide',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'editor-oauth-'));
  const token='t'.repeat(32);
  const backend=startHttp({host:'127.0.0.1',port:0,token,store:new DeckStore(dir)});
  await once(backend,'listening');
  const c=configuration({resource:'https://editor.example.invalid/mcp',issuer:'https://id.example.invalid/',jwks:'https://id.example.invalid/jwks',algorithm:'RS256',subject:'owner',clientId:'client',scope:'editor:workspace',upstream:`http://127.0.0.1:${backend.address().port}/mcp`,upstreamToken:token});
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const bearer=await new SignJWT({client_id:'client',scope:c.scope}).setProtectedHeader({alg:'RS256',typ:'at+jwt'}).setIssuer(c.issuer).setAudience(c.resource).setSubject('owner').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const front=gateway(c,verifier(c,createLocalJWKSet({keys:[await exportJWK(publicKey)]})));
  front.listen(0,'127.0.0.1');await once(front,'listening');
  t.after(async()=>{front.closeAllConnections();front.close();backend.closeAllConnections();backend.close();await rm(dir,{recursive:true,force:true});});
  let id=0;
  const rpc=(method,params={})=>new Promise((resolve,reject)=>{
    const req=request(`http://127.0.0.1:${front.address().port}/mcp`,{method:'POST',headers:{host:'editor.example.invalid',authorization:`Bearer ${bearer}`,'content-type':'application/json',accept:'application/json, text/event-stream'}},async res=>{let body='';for await(const chunk of res)body+=chunk;try{assert.equal(res.statusCode,200);const value=JSON.parse(body);assert.equal(value.error,undefined);resolve(value.result);}catch(e){reject(e);}});
    req.on('error',reject);req.end(JSON.stringify({jsonrpc:'2.0',id:++id,method,params}));
  });
  assert.ok((await rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'local-oauth-test',version:'1'}})).serverInfo);
  assert.ok((await rpc('tools/list')).tools.some(x=>x.name==='create_artifact'));
  assert.ok((await rpc('resources/list')).resources.some(x=>x.uri.startsWith('ui://')));
  const result=await rpc('tools/call',{name:'list_editors',arguments:{}});assert.notEqual(result.isError,true);
});
