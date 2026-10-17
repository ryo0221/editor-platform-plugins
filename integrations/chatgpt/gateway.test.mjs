import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { once } from 'node:events';
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from 'jose';
import { configuration, verifier, gateway } from './gateway.mjs';
const base = { resource: 'https://editor.example.invalid/mcp', issuer: 'https://id.example.invalid/', jwks: 'https://id.example.invalid/jwks', algorithm: 'RS256', subject: 'owner', clientId: 'chatgpt-client', scope: 'editor:workspace', upstream: 'http://127.0.0.1:8787/mcp', upstreamToken: 'x'.repeat(32) };
const { publicKey, privateKey } = await generateKeyPair('RS256');
const keys = createLocalJWKSet({ keys: [await exportJWK(publicKey)] });
const token = (claims = {}, options = {}) => new SignJWT({ scope: base.scope, client_id: base.clientId, ...claims })
  .setProtectedHeader({ alg: 'RS256', typ: options.typ ?? 'at+jwt' }).setIssuer(options.issuer ?? base.issuer)
  .setAudience(options.audience ?? base.resource).setSubject(options.subject ?? base.subject)
  .setIssuedAt(options.iat ?? Math.floor(Date.now()/1000)).setExpirationTime(options.exp ?? '5m').sign(options.key ?? privateKey);

test('configuration rejects insecure endpoints and incomplete binding', () => {
  for (const patch of [{resource:'http://editor.example.invalid/mcp'}, {issuer:'http://id.invalid'}, {jwks:'https://id.invalid/jwks?token=x'}, {upstream:'http://example.invalid/mcp'}, {upstreamToken:'short'}, {subject:''}, {clientId:''}, {algorithm:'HS256'}, {scope:'bad"scope'}]) assert.throws(() => configuration({...base,...patch}));
});
test('JOSE verifies signature, access-token type, expiry, issuer, audience, owner, client and scope', async () => {
  const verify = verifier(configuration(base), keys);
  assert.equal(await verify(await token()), true);
  const stranger = await generateKeyPair('RS256');
  for (const options of [{key:stranger.privateKey}, {typ:'JWT'}, {issuer:'https://wrong.invalid'}, {audience:'another-workspace'}, {subject:'another-user'}, {exp:1}, {iat:1}]) await assert.rejects(verify(await token({}, options)));
  await assert.rejects(verify(await token({client_id:'wrong-client'})));
  await assert.rejects(verify('static-bearer'));
  assert.equal(await verify(await token({scope:'editor:read'})), false);
});
test('HTTP discovery and all-request authorization; upstream receives only internal credential', async (t) => {
  const seen=[];
  const upstream=createServer(async(req,res)=>{let body=''; for await(const chunk of req) body+=chunk; seen.push({headers:req.headers,body,method:req.method}); res.setHeader('content-type','application/json');res.end('{"ok":true}');});
  upstream.listen(0,'127.0.0.1'); await once(upstream,'listening');
  const c=configuration({...base,upstream:`http://127.0.0.1:${upstream.address().port}/mcp`});
  const server=gateway(c,verifier(c,keys)); server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(()=>{server.closeAllConnections();server.close();upstream.closeAllConnections();upstream.close();});
  const url=`http://127.0.0.1:${server.address().port}`;
  const call=(path,headers={},method='POST',body)=>new Promise((resolve,reject)=>{
    const req=request(url+path,{method,headers:{host:'editor.example.invalid',...headers}},async res=>{
      let text='';for await(const chunk of res) text+=chunk;
      resolve({status:res.statusCode,headers:{get:name=>res.headers[name]},json:async()=>JSON.parse(text)});
    });req.on('error',reject);req.end(body);
  });
  const discovery=await call('/.well-known/oauth-protected-resource/mcp',{},'GET');
  assert.equal(discovery.status,200); assert.equal((await discovery.json()).resource,base.resource);
  for(const method of ['GET','POST','DELETE']) { const response=await call('/mcp',{},method); assert.equal(response.status,401);assert.match(response.headers.get('www-authenticate'),/resource_metadata=.*scope=/); }
  assert.equal((await call('/mcp',{authorization:'Bearer static'})).status,401);
  assert.equal((await call('/mcp',{authorization:`Bearer ${await token({scope:'other'})}`})).status,403);
  const auth={authorization:`Bearer ${await token()}`};
  assert.equal((await call('/mcp',{...auth,origin:'https://evil.invalid'})).status,403);
  assert.equal((await call('/mcp',{...auth,host:'evil.invalid'})).status,403);
  assert.equal((await call('/mcp?access_token=secret',auth)).status,404);
  assert.equal((await call('/demo',auth,'GET')).status,404);
  assert.equal(seen.length,0);
  const result=await call('/mcp',{...auth,cookie:'secret','x-forwarded-user':'owner','content-type':'application/json'},'POST','{"jsonrpc":"2.0"}');
  assert.equal(result.status,200);assert.deepEqual(await result.json(),{ok:true});
  assert.equal(seen.length,1);assert.equal(seen[0].headers.authorization,`Bearer ${base.upstreamToken}`);
  assert.equal(seen[0].headers.cookie,undefined);assert.equal(seen[0].headers['x-forwarded-user'],undefined);
  assert.equal(seen[0].body,'{"jsonrpc":"2.0"}');
  assert.equal((await call('/mcp',auth,'POST','x'.repeat(3_000_001))).status,413);
  assert.equal(seen.length,1);
});
