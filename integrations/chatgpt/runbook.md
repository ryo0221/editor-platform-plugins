# #9 readiness and minimum operator procedure

Self-operated HTTPS/OAuth with one owner is settled. This runbook does not reopen
that decision. It prepares the existing implementation for an approved operator
setup; no public infrastructure, account, registration or persistent grant has
been created. `available` status still requires signed-in ChatGPT acceptance.

## Findings resolved before real IdP/TLS setup

| Gap on main 4fee5fc | This increment |
| --- | --- |
| Tool OAuth hook had only programmatic sample wiring | `server.mjs` directly wires validated configuration to JOSE and startHttp; no public listener |
| Transport-only `npm start` could be confused with integrated tool auth | This runbook names the integrated command; old gateway is explicitly separate |
| No preflight of the actual discovery document | `--check-config` reads a saved operator-supplied document, requires S256 and exact issuer/JWKS/client policy |
| Issuance lifetime over ten minutes accepted while token was young | Verifier now rejects exp-iat > 600 as well as stale/expired/future tokens |
| JWKS refresh tested only with explicit reload | Fixture clock tests exercise default 30-second cooldown and ten-minute cache expiry without sleeping |
| PKCE/resource request shape not exercised | Official SDK discovery/startAuthorization/exchangeAuthorization tested with fixed fetch fixtures; no code is issued |
| No dedicated runtime workspace lock | Reuses conservative `.claude-code.lock`; duplicate startup denied, normal drain releases lock, unexpected death requires manual recovery |

These are local implementation checks. Neither a saved discovery document nor an
SDK request fixture proves the IdP rejects bad verifiers, code replay, wrong
redirects, revoked users, or expired grants.

## Concrete choices still needed

Recommended: reuse an existing maintained IdP that passes the offline checklist
and can issue RFC 9068 `at+jwt` with the configured resource audience, exact owner
subject, client_id and workspace scope. Prefer CIMD if that provider already
supports it; otherwise one predefined client keeps the initial one-owner setup
small. Use the exact callback and client identity shown by ChatGPT, never guessed
values. No registration is performed by this code.

If no compatible IdP is already operated, Auth0's RFC 9068 token profile is a
candidate to evaluate, not a chosen account/paid plan. Its documented token
profile makes it a better starting point than relaxing validation to accept ID
or generic JWT tokens. Verify actual MCP resource binding, registration mode,
claim names, owner-only policy and costs before choosing. An existing self-hosted
IdP can also qualify; do not assume a product name proves compatibility.

For token endpoint authentication, `none` means public-client exchange protected
by PKCE; it does not make the MCP anonymous. CIMD also permits `private_key_jwt`
with ChatGPT-managed client assertions if the IdP supports it. Predefined clients
may use secret methods, but their secret belongs in the host/IdP setup, never this
resource server or chat. The offline checker validates the selected advertised
method without configuring it. No refresh/offline-access grant is introduced.

TLS recommendation: reuse the operator's existing reverse proxy and domain when
approved. Bind the app only on 127.0.0.1 and proxy `/mcp` plus the two protected
resource metadata paths. Preserve public Host and original Authorization; do not
inject identities or replace the OAuth token with a static credential. Configure
request/connection limits, no request-body/token logging, no caching and no stream
buffering. Do not expose health, demo, browser, storage or a separate backend port.
No tunnel/account/domain/certificate automation is provided or run here.

## Minimum steps once the specific IdP/TLS setup is authorized

1. Build the reviewed source with its pinned public submodule and dependencies:
   `npm ci`, `npm ci --prefix integrations/chatgpt --ignore-scripts`, `npm run build`.
   Verify source revision and retain the test record. The runtime never installs
   dependencies or rebuilds on startup.
2. Obtain the IdP's actual discovery document from its trusted administrative
   source, save it outside Git, and review issuer, HTTPS endpoints, JWKS and
   advertised methods/scopes. The snapshot is a preflight input, not a live trust
   anchor: runtime pins issuer/JWKS and validates actual tokens. Refresh the snapshot
   after provider configuration changes. Do not use a test fixture as live evidence.
3. Prepare a private copy of `server.example.json` outside Git with exact owner,
   client, resource, issuer and JWKS. Set registrationMode to the selected existing
   mode, tokenEndpointAuthMethod to its actual method, metadataFile to the snapshot,
   and dataDirectory to a dedicated absolute directory owned by the runtime account.
   Use a fixed local port for the proxy (port 0 is supported for local tests only).
   These files contain deployment identity; treat them as private even though no
   client secret or access token is stored in them.
4. Set EDITOR_OAUTH_CONFIG to the absolute configuration file path and run:

   ```sh
   node --import tsx integrations/chatgpt/server.mjs --check-config
   ```

   `OFFLINE_METADATA_VALID` means only that the supplied metadata/configuration
   passes static checks. This command does not fetch, create a workspace, listen,
   register a client or perform login. A missing S256 declaration fails even though
   the pinned SDK's request builder alone would tolerate that omission.
5. Start under the dedicated unprivileged service account:

   ```sh
   node --import tsx integrations/chatgpt/server.mjs
   ```

   It opens loopback only and uses the existing workspace lock; no internal Bearer
   token file is needed. Do not run the old gateway in front of this mode. Do not
   launch ordinary HTTP/stdio writers against the same directory. POSIX mode 0700
   applies to a newly created directory; review existing permissions/Windows ACLs.
6. Apply the approved TLS configuration and test 401/challenge/discovery routing
   externally without private content. In the approved IdP/ChatGPT setup, complete
   the code flow with PKCE and verify the actual token profile. Keep credentials in
   the provider/host, not logs, repository, manifests or chat.
7. In signed-in ChatGPT use fictional data: create → real Editor display → native
   edit → explicit Save → reread; preview/reject/apply proposal; stale-revision
   rejection; download; new conversation/restart. Record host/browser versions,
   source commit, outcome and sanitized evidence per row. Only then assess availability.

## Expiry, rotation, stop and recovery

Access tokens must have positive lifetime at most 600 seconds and no future iat/
nbf. Every request/tool operation revalidates credentials. Revoking a grant/user
at the IdP does **not** instantly revoke a cached signed JWT here; there is no
introspection endpoint or per-token denylist. Keep tokens short and test actual
provider disable/reauth behavior before rollout. The default JOSE JWKS resolver
has a 30-second cooldown and ten-minute cache; publish old/new keys with overlap
longer than that cache before switching signing keys. A fresh unknown kid may fail
during cooldown; expired cache plus fetch failure rejects access. These are bounded
cache semantics, not a promise of provider-side immediate revocation.

SIGTERM/SIGINT stops accepting connections and drains existing connections and
pending async handlers before releasing the lock. Close the host connection first.
If drain cannot be established within five seconds (including an open SSE stream
or a disconnected request whose SDK completion stays pending), remaining sockets
are closed, shutdown reports failure and the lock is retained. This fail-closed
path requires the same stopped-process recovery as forced termination.
For an emergency, block new traffic at the proxy and terminate the process; do not
claim that gracefully draining an already-authorized operation cancels it. Forced
termination leaves `.claude-code.lock`. Confirm all writers have stopped, back up
the whole data directory, inspect the recorded PID, and only then remove the stale
lock. Never delete it while a writer lives. Restart retains saved artifacts and
pending proposals. Keep IdP logs, proxy logs and workspace backups under separate
operator retention/deletion policies.

## Remaining real acceptance (all NOT RUN)

- IdP rejects missing/wrong PKCE verifier, repeated code, wrong callback, wrong
  resource/client and unauthorized owner; issuer-response validation as advertised.
- Chosen registration method and token endpoint auth; no unexpected refresh grant.
- Actual token expiry, user/grant revocation, key rotation overlap and reauthentication.
- Public TLS routing, process/OS isolation, proxy limits and provider reachability.
- Signed-in ChatGPT initial link, expired-token relink, UI/CSP/download and saved data.

Do not replace these with mock success. The fixture token endpoint returns an
error and produces no access/refresh grant. No real host was contacted by tests.

Official sources checked 2026-10-17:

- https://developers.openai.com/plugins/build/auth
- https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- https://auth0.com/docs/secure/tokens/access-tokens/access-token-profiles
- Pinned official MCP SDK 1.32.1 `client/auth` and JOSE 6.1.3 remote-JWKS implementation.
