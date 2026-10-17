// Offline configuration checks only: no discovery fetch, registration or OAuth grant.
import { isAbsolute } from 'node:path';
import { OAuthMetadataSchema } from '@modelcontextprotocol/sdk/shared/auth.js';
import { oauthConfiguration } from './gateway.mjs';

export function runtimeConfiguration(input) {
  const oauth = oauthConfiguration(input);
  if (typeof input.dataDirectory !== 'string' || !isAbsolute(input.dataDirectory)) throw Error('dataDirectory must be absolute');
  if (typeof input.metadataFile !== 'string' || !isAbsolute(input.metadataFile)) throw Error('metadataFile must be absolute');
  const port = input.port ?? 8788;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('Invalid port');
  if (!['pre_registered', 'cimd'].includes(input.registrationMode)) throw Error('Choose pre_registered or cimd');
  if (!['none', 'private_key_jwt', 'client_secret_basic', 'client_secret_post'].includes(input.tokenEndpointAuthMethod)) throw Error('Unsupported client authentication method');
  if (input.registrationMode === 'cimd') {
    const id = new URL(oauth.clientId);
    if (id.protocol !== 'https:' || id.username || id.password || id.hash || id.search) throw Error('CIMD clientId must be an exact HTTPS metadata URL');
    if (!['none', 'private_key_jwt'].includes(input.tokenEndpointAuthMethod)) throw Error('Unsupported CIMD client authentication method');
  }
  return Object.freeze({ ...oauth, dataDirectory: input.dataDirectory, metadataFile: input.metadataFile,
    port, registrationMode: input.registrationMode, tokenEndpointAuthMethod: input.tokenEndpointAuthMethod });
}

export function checkMetadata(config, input) {
  const metadata = OAuthMetadataSchema.parse(input);
  if (metadata.issuer !== config.issuer) throw Error('Discovery issuer differs from pinned issuer');
  for (const field of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) {
    const value = input[field];
    if (typeof value !== 'string') throw Error(`Missing ${field}`);
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw Error(`Unsafe ${field}`);
  }
  if (input.jwks_uri !== config.jwks) throw Error('Discovery JWKS differs from pinned JWKS');
  for (const [field, required] of [
    ['response_types_supported', 'code'], ['code_challenge_methods_supported', 'S256'],
    ['token_endpoint_auth_methods_supported', config.tokenEndpointAuthMethod],
    ['scopes_supported', config.scope],
  ]) {
    if (!Array.isArray(input[field]) || !input[field].includes(required)) throw Error(`Missing ${field}: ${required}`);
  }
  if (input.grant_types_supported && !input.grant_types_supported.includes('authorization_code')) throw Error('Authorization code grant unavailable');
  if (config.registrationMode === 'cimd' && input.client_id_metadata_document_supported !== true) throw Error('CIMD is not advertised');
  return { status: 'OFFLINE_METADATA_VALID',
    callbackMode: input.authorization_response_iss_parameter_supported === true ? 'issuer-identified; copy actual ChatGPT callback' : 'connection-specific; copy actual ChatGPT callback',
    liveChecks: ['PKCE rejection and code reuse', 'exact redirects and consent', 'resource-bound JWT profile',
      'owner/client restrictions', 'expiry/revocation', 'TLS routing', 'ChatGPT initial linking and relinking'] };
}
