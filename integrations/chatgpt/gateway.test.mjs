import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { once } from 'node:events';
import { generateKeyPair, SignJWT, createLocalJWKSet, createRemoteJWKSet, customFetch, exportJWK } from 'jose';
import { configuration, verifier, gateway } from './gateway.mjs';
const base = { resource: 'https://editor.example.invalid/mcp', issuer: 'https://id.example.invalid/', jwks: 'https://id.example.invalid/jwks', algorithm: 'RS256', subject: 'owner', clientId: 'chatgpt-client', scope: 'editor:workspace', upstream: 'http://127.0.0.1:8787/mcp', upstreamToken: 'x'.repeat(32) };
const { publicKey, privateKey } = await generateKeyPair('RS256');
const keys = createLocalJWKSet({ keys: [await exportJWK(publicKey)] });
const token = (claims = {}, options = {}) => new SignJWT({ scope: base.scope, client_id: base.clientId, ...claims })
  .setProtectedHeader({ alg: 'RS256', typ: options.typ ?? 'at+jwt' }).setIssuer(options.issuer ?? base.issuer)
  .setAudience(options.audience ?? base.resource).setSubject(options.subject ?? base.subject)
  .setIssuedAt(options.iat ?? Math.floor(Date.now()/1000)).setExpirationTime(options.exp ?? '5m').sign(options.key ?? privateKey);

test('configuration rejects insecure endpoints and incomplete binding', () => {
  for (const patch of [{resource:'http://editor.example.invalid/mcp'}, {issuer:'http://id.invalid'}, {jwks:'https://id.invalid/jwks?token=x'}, {upstream:'http://example.invalid/mcp'}, {upstreamToken:'short'}, {subject:''}, {clientId:''}, {algorithm:'HS256'}, {scope:'bad"scope'}, {scope:undefined}, {scope:null}, {scope:123}]) assert.throws(() => configuration({...base,...patch}));
});
test('missing scope configuration is rejected', () => {
  const { scope, ...withoutScope } = base;
  assert.throws(() => configuration(withoutScope));
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

const now = () => Math.floor(Date.now() / 1000);
const completeClaims = () => ({ iss: base.issuer, aud: base.resource, sub: base.subject,
  client_id: base.clientId, scope: base.scope, iat: now(), exp: now() + 300 });
const signClaims = (claims, key = privateKey, algorithm = 'RS256', kid) => new SignJWT(claims)
  .setProtectedHeader({ alg: algorithm, typ: 'at+jwt', ...(kid ? { kid } : {}) }).sign(key);

test('missing required claims and future validity times fail closed', async () => {
  const verify = verifier(configuration(base), keys);
  for (const name of ['iss', 'aud', 'sub', 'client_id', 'iat', 'exp']) {
    const claims = completeClaims(); delete claims[name];
    await assert.rejects(verify(await signClaims(claims)), undefined, `missing ${name}`);
  }
  const claims = completeClaims(); delete claims.scope;
  assert.equal(await verify(await signClaims(claims)), false);
  for (const patch of [{nbf: now() + 3600}, {iat: now() + 3600}]) {
    await assert.rejects(verify(await signClaims({...completeClaims(), ...patch})));
  }
});

test('ES256 access tokens work only with the configured algorithm', async () => {
  const ec = await generateKeyPair('ES256');
  const ecKeys = createLocalJWKSet({keys: [await exportJWK(ec.publicKey)]});
  const esToken = await signClaims(completeClaims(), ec.privateKey, 'ES256');
  assert.equal(await verifier(configuration({...base, algorithm: 'ES256'}), ecKeys)(esToken), true);
  await assert.rejects(verifier(configuration(base), ecKeys)(esToken), {code: 'ERR_JOSE_ALG_NOT_ALLOWED'});
  await assert.rejects(verifier(configuration({...base, algorithm: 'ES256'}), keys)(await token()), {code: 'ERR_JOSE_ALG_NOT_ALLOWED'});
  const hsToken = await signClaims(completeClaims(), new Uint8Array(32), 'HS256');
  await assert.rejects(verifier(configuration(base), keys)(hsToken), {code: 'ERR_JOSE_ALG_NOT_ALLOWED'});
});

test('remote JWKS acquisition errors reject tokens without contacting an IdP', async () => {
  // JOSE's supported customFetch hook exercises its remote resolver with deterministic responses.
  for (const response of [() => { throw Error('fixture network unavailable'); },
    () => new Response('unavailable', {status: 503}),
    () => new Response('not json'),
    () => Response.json({keys: []})]) {
    let calls = 0;
    const remote = createRemoteJWKSet(new URL(base.jwks), {
      timeoutDuration: 5000,
      [customFetch]: async (url) => { assert.equal(String(url), base.jwks); calls++; return response(); },
    });
    await assert.rejects(verifier(configuration(base), remote)(await token()));
    assert.equal(calls, 1);
  }
});

test('JWKS rotation respects cache/cooldown and rejects a removed key after refresh', async () => {
  const next = await generateKeyPair('RS256');
  const firstJwk = {...await exportJWK(publicKey), kid: 'first'};
  const nextJwk = {...await exportJWK(next.publicKey), kid: 'next'};
  let document = {keys: [firstJwk]}; let calls = 0;
  const remote = createRemoteJWKSet(new URL(base.jwks), {
    timeoutDuration: 5000,
    [customFetch]: async (url) => { assert.equal(String(url), base.jwks); calls++; return Response.json(document); },
  });
  const verify = verifier(configuration(base), remote);
  const oldToken = await signClaims(completeClaims(), privateKey, 'RS256', 'first');
  const nextToken = await signClaims(completeClaims(), next.privateKey, 'RS256', 'next');
  assert.equal(await verify(oldToken), true); assert.equal(calls, 1);
  document = {keys: [firstJwk, nextJwk]};
  // Default cooldown does not refetch on each attacker-supplied unknown kid.
  await assert.rejects(verify(nextToken), {code: 'ERR_JWKS_NO_MATCHING_KEY'});
  assert.equal(calls, 1);
  await remote.reload(); // Deterministic test refresh; no production cache-policy change.
  assert.equal(await verify(nextToken), true); assert.equal(await verify(oldToken), true);
  document = {keys: [nextJwk]};
  assert.equal(await verify(oldToken), true); // Cached key remains trusted until refresh.
  await remote.reload();
  await assert.rejects(verify(oldToken), {code: 'ERR_JWKS_NO_MATCHING_KEY'});
  assert.equal(await verify(nextToken), true); assert.equal(calls, 3);
});

test('short-token policy rejects overlong issuance and enforces elapsed expiration',async()=>{
  const verify=verifier(configuration(base),keys);
  await assert.rejects(verify(await signClaims({...completeClaims(),exp:now()+601})));
  // Deterministic expired and zero-lifetime profiles; no wall-clock sleeps.
  await assert.rejects(verify(await signClaims({...completeClaims(),iat:now()-601,exp:now()-1})));
  await assert.rejects(verify(await signClaims({...completeClaims(),exp:now()})));
});

test('default JWKS cooldown and cache expiration refresh automatically and fail closed on outage',async t=>{
  const next=await generateKeyPair('RS256');
  const firstJwk={...await exportJWK(publicKey),kid:'old'};
  const nextJwk={...await exportJWK(next.publicKey),kid:'new'};
  let document={keys:[firstJwk]};let calls=0;let unavailable=false;
  let clock=Date.now();t.mock.method(Date,'now',()=>clock);
  const remote=createRemoteJWKSet(new URL(base.jwks),{[customFetch]:async()=>{
    calls++;if(unavailable)throw Error('Fixture offline');return Response.json(document);
  }});
  await remote({alg:'RS256',kid:'old'});assert.equal(calls,1);
  document={keys:[nextJwk]};
  await assert.rejects(remote({alg:'RS256',kid:'new'}),{code:'ERR_JWKS_NO_MATCHING_KEY'});
  assert.equal(calls,1);
  clock+=30_001; // Default cooldown has elapsed: unknown kid triggers automatic acquisition.
  await remote({alg:'RS256',kid:'new'});assert.equal(calls,2);
  await assert.rejects(remote({alg:'RS256',kid:'old'}),{code:'ERR_JWKS_NO_MATCHING_KEY'});
  unavailable=true;
  await remote({alg:'RS256',kid:'new'});assert.equal(calls,2); // Cache still valid.
  clock+=600_001; // Default maximum cache age has elapsed: stale cached keys cannot authorize.
  await assert.rejects(remote({alg:'RS256',kid:'new'}),/Fixture offline/);
  assert.equal(calls,3);
});
