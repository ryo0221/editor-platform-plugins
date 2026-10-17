import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { discoverOAuthServerInfo, startAuthorization, exchangeAuthorization } from '@modelcontextprotocol/sdk/client/auth.js';
import { runtimeConfiguration, checkMetadata } from './readiness.mjs';

export const input = { resource:'https://editor.example.invalid/mcp',issuer:'https://identity.example.invalid/',jwks:'https://identity.example.invalid/jwks',algorithm:'RS256',subject:'owner',clientId:'approved-client',scope:'editor:workspace',dataDirectory:'/tmp/example-only',metadataFile:'/tmp/example-only.json',port:0,registrationMode:'pre_registered',tokenEndpointAuthMethod:'none' };
export const metadata = {issuer:input.issuer,authorization_endpoint:'https://identity.example.invalid/authorize',token_endpoint:'https://identity.example.invalid/token',jwks_uri:input.jwks,response_types_supported:['code'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256'],scopes_supported:[input.scope],token_endpoint_auth_methods_supported:['none'],authorization_response_iss_parameter_supported:true};

test('offline readiness rejects missing S256, mismatched identities and incompatible client metadata',()=>{
  const config=runtimeConfiguration(input);
  assert.equal(checkMetadata(config,metadata).status,'OFFLINE_METADATA_VALID');
  for(const patch of [{issuer:'https://other.invalid/'},{jwks_uri:'https://other.invalid/jwks'},{authorization_endpoint:'http://identity.example.invalid/authorize'},{token_endpoint:'https://user:password@identity.example.invalid/token'},{code_challenge_methods_supported:undefined},{code_challenge_methods_supported:['plain']},{scopes_supported:[]},{response_types_supported:['token']},{grant_types_supported:['client_credentials']},{token_endpoint_auth_methods_supported:[]}]) assert.throws(()=>checkMetadata(config,{...metadata,...patch}));
  for(const patch of [{subject:123},{clientId:{}},{dataDirectory:'relative'},{metadataFile:'relative'},{port:-1},{registrationMode:'dcr'},{tokenEndpointAuthMethod:'unexpected'}]) assert.throws(()=>runtimeConfiguration({...input,...patch}));
  const cimd=runtimeConfiguration({...input,registrationMode:'cimd',clientId:'https://chatgpt.com/oauth/client.json'});
  assert.throws(()=>checkMetadata(cimd,metadata));
  assert.equal(checkMetadata(cimd,{...metadata,client_id_metadata_document_supported:true}).status,'OFFLINE_METADATA_VALID');
});

test('official SDK discovery, S256 and resource-bound code-exchange requests stay within fixed fixtures',async()=>{
  const requested=[];
  const info=await discoverOAuthServerInfo(input.resource,{fetchFn:async(url)=>{
    requested.push(String(url));
    if(String(url)==='https://editor.example.invalid/.well-known/oauth-protected-resource/mcp') return Response.json({resource:input.resource,authorization_servers:[input.issuer],scopes_supported:[input.scope]});
    if(String(url)==='https://identity.example.invalid/.well-known/oauth-authorization-server') return Response.json(metadata);
    throw Error('Unexpected fixture URL');
  }});
  assert.equal(info.authorizationServerUrl.toString(),input.issuer);
  assert.equal(requested.length,2);
  checkMetadata(runtimeConfiguration(input),info.authorizationServerMetadata);
  const redirectUrl='https://client.example.invalid/callback'; // A fixture, never an invented ChatGPT callback.
  const clientInformation={client_id:input.clientId,token_endpoint_auth_method:'none'};
  const first=await startAuthorization(input.issuer,{metadata,clientInformation,redirectUrl,scope:input.scope,state:'fixture-state',resource:new URL(input.resource)});
  const second=await startAuthorization(input.issuer,{metadata,clientInformation,redirectUrl,scope:input.scope,state:'other-state',resource:new URL(input.resource)});
  const params=first.authorizationUrl.searchParams;
  assert.equal(params.get('code_challenge_method'),'S256');
  assert.equal(params.get('code_challenge'),createHash('sha256').update(first.codeVerifier).digest('base64url'));
  assert.notEqual(first.codeVerifier,second.codeVerifier);
  assert.equal(params.get('resource'),input.resource);assert.equal(params.get('redirect_uri'),redirectUrl);
  assert.equal(params.get('state'),'fixture-state');assert.equal(params.get('scope'),input.scope);
  assert.equal(params.has('code_verifier'),false);assert.ok(!first.authorizationUrl.toString().includes('offline_access'));
  let exchanges=0;
  // A deterministic negative token response, not a custom authorization server.
  await assert.rejects(exchangeAuthorization(input.issuer,{metadata,clientInformation,authorizationCode:'fixture-code',codeVerifier:first.codeVerifier,redirectUri:redirectUrl,resource:new URL(input.resource),fetchFn:async(url,init)=>{
    exchanges++;assert.equal(String(url),metadata.token_endpoint);
    const body=new URLSearchParams(init.body);
    assert.equal(body.get('code_verifier'),first.codeVerifier);assert.equal(body.get('resource'),input.resource);
    assert.equal(body.get('redirect_uri'),redirectUrl);assert.equal(body.get('grant_type'),'authorization_code');
    assert.equal(body.get('client_id'),input.clientId);assert.equal(body.has('refresh_token'),false);
    return Response.json({error:'invalid_grant',error_description:'Fixture rejection; no authorization performed'},{status:400});
  }}));
  assert.equal(exchanges,1);
});
