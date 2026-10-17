# ChatGPT self-operated authorization candidate (#9)

Status: **local resource-server tests only; not deployable acceptance**. No account,
OAuth client, DNS, certificate, tunnel, public listener or persistent login was
created. ChatGPT remains Coming soon. This is separate from the existing fixed
Bearer server and does not make its direct Internet exposure safe.

## Proposed boundary (requires deployment review)

One owner, one HTTPS resource `/mcp`, one OAuth resource adapter, one private MCP
process, one absolute private `EDITOR_DATA_DIR`. A reviewed TLS reverse proxy
forwards only `/mcp` and the two protected-resource metadata paths to this adapter
on `127.0.0.1:8788`, preserving the public Host. It must disable body/header logging,
apply request size/rate/connection limits, enforce TLS, disable caching/buffering
for MCP streams, and never expose the backend at `127.0.0.1:8787` or demo routes.
No trusted identity is taken from proxy headers. Do not accept direct public traffic
on either Node listener. Configure backend `EDITOR_ACCESS_TOKEN` with the same
random internal credential as `EDITOR_UPSTREAM_TOKEN_FILE`; it is never a ChatGPT
credential. Set backend HOST=127.0.0.1, PORT=8787, and disable the demo.

Use separate OS service accounts or containers and non-overlapping private data
volumes for separate owners/workspaces. Do not mount home, SSH/cloud credentials,
other workspaces or Docker sockets. The current backend has no tenant ACL and no
multi-process coordination; never run two backend writers on one directory. Port
and process separation alone is not OS isolation. This candidate authenticates one
exact issuer/subject/client tuple and grants the entire workspace, including writes;
`editor:workspace` is intentionally not advertised as read-only. UI tool visibility
is not a security boundary or proof of human approval.

## Existing identity provider; no new OAuth implementation

Use an established MCP-compatible IdP/gateway. OpenAI's documentation links Auth0
and other providers; a provider, paid plan or account has **not** been selected.
Before adoption verify its exact release/configuration supports:

- OAuth authorization-code flow with S256 PKCE, exact redirect allowlisting,
  consent and RFC 8414/OIDC discovery. Prefer CIMD where supported; predefined
  clients or DCR are alternatives. Copy the actual callback/client identity from
  ChatGPT's connection management page; do not guess or wildcard it.
- RFC 8707 resource binding to the exact HTTPS `/mcp` audience, and an access JWT
  profile (`typ=at+jwt`, `iss`, `aud`, `sub`, `client_id`, `scope`, `iat`, `exp`)
  using RS256 or ES256 with public JWKS. This intentionally rejects ID tokens,
  opaque tokens and generic JWTs; an IdP requiring another profile needs review.
- Short tokens (at most ten minutes), owner-only access policy, key rotation,
  account disable/revocation, and issuer identification on callbacks. The adapter
  checks each request with JOSE, uses a bounded JWKS cache, and rejects tokens
  older than ten minutes. Cached JWT validation cannot provide instant revocation:
  stop the listener for immediate emergency denial. Validate rotation in staging.
- No refresh/offline access grant until separately approved. Reauthentication is
  expected after expiration. Do not implement a password store, login endpoint,
  token minting endpoint, custom PKCE or OAuth proxy protocol here.

The adapter implements public RFC 9728 metadata and 401 challenges, JWT validation,
owner/client/scope enforcement and internal credential substitution. It does not
claim an end-to-end OAuth flow. JWKS and issuer are operator-pinned trusted HTTPS
URLs, never derived from an incoming token. Secret files/config must be private,
outside Git and outside workspace content; do not paste credentials into chat.

## Local preparation

```sh
cd integrations/chatgpt
npm ci --ignore-scripts
npm test
```

Tests create ephemeral keys in memory and use loopback listeners only. They do not
contact the configured example domains. `config.example.json` is a schema example,
not a working deployment. After the owner approves an IdP, TLS location and resource
identity, a maintainer can prepare a private copy and set `EDITOR_OAUTH_CONFIG` and
`EDITOR_UPSTREAM_TOKEN_FILE` to absolute filenames; `npm start` binds only loopback.
The adapter has a separate pinned dependency lock so it does not change shared
server dependencies or upstream pins. No install hook or CI job is added.

## Data, persistence and costs

Saved content, titles, IDs, selections, proposals and export results returned by
MCP can reach ChatGPT/OpenAI. The embedded Editor UI receives artifact content;
unsaved draft input is local UI state until an explicit save/host interaction.
Do not infer that all UI state or host diagnostics are outside provider handling.
ChatGPT's own retention/account policy remains separate from this integration.
The IdP receives authentication/client metadata, the TLS proxy sees transport
metadata and request bytes, and the operator's backend stores native artifacts and
pending proposals in EDITOR_DATA_DIR. The adapter persists no tokens or content and
logs no request bodies. Backups, infrastructure logs, IdP audit retention, deletion
and encryption at rest are operator responsibilities. Trash is recoverable, not
erasure. The backend invokes no model API and this project creates no paid shared
service; ChatGPT subscription, hosting, DNS/TLS operations and IdP charges depend
on choices that have not been approved. No cost-free hosting promise is made.

## Gates and evidence (2026-10-17)

| Gate | Result |
| --- | --- |
| Local config, JOSE negative tests, metadata/challenge, header isolation, bounded body | PASS (8 tests after review fixes) |
| Real IdP authorization-code/PKCE, callback, consent, resource and refresh policy | NOT RUN; provider/registration approval required |
| Real TLS routing, backend isolation, rate limits, rotation/revocation | NOT RUN; no public infrastructure approved |
| Signed-in ChatGPT create → real Editor display → native edit → save → reread | NOT RUN; approved endpoint and test account required |
| Proposal preview/reject/apply, stale revision, UI-only visibility | NOT RUN in ChatGPT |
| Actual host CSP, iframe sandbox, download and resource size | NOT RUN in ChatGPT |

Before asking a user to connect, obtain approval for the concrete IdP/gateway,
hosting/domain/TLS ownership, client registration, exact owner/client binding,
short-token revocation window and any persistent authentication. Then execute all
host gates with disposable fictional content; capture OS/browser/ChatGPT version,
commit/pin, artifact IDs/revisions and redacted evidence. Keep status preparing
until those gates pass. Never send raw tokens, cookies or private contents in logs.

## Official sources checked 2026-10-17

- https://developers.openai.com/plugins/build/auth (the former Apps SDK URL redirects here)
- https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- https://github.com/panva/jose (JWT/JWKS implementation used here)

These sources guide the candidate; they do not certify the selected IdP or this
preview as accepted by ChatGPT. Recheck current host requirements before rollout.

Additional local verification on Linux / Node 24.19.0: real backend MCP smoke
(`node --import tsx --test integrations/chatgpt/mcp-smoke.mjs`) PASS, 1 test.
`npm run check` passed pin/type/build and all 27 unit/protocol cases, then failed
because Playwright's managed browser was absent. Re-running the browser stage with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e` passed all 21
cases, with no retries. These remain local checks, not ChatGPT acceptance.

## Review follow-up: tool-level linking is not implemented

The adapter enforces transport authorization with HTTP 401/403 and RFC 9728
metadata. It does **not** implement ChatGPT's tool-level linking/relinking UI.
The [official authentication guide](https://developers.openai.com/plugins/build/auth)
requires per-tool `securitySchemes` and runtime error results with
`_meta["mcp/www_authenticate"]`, including error and error_description. The shared
server currently emits neither. Transport rejection alone does not establish
that tool-level login/reconnect works. No such host acceptance is claimed.

Proposed shared-file scope for parent coordination, **not implemented in this PR**:

- `src/server/mcp.ts`: optional host-specific OAuth metadata in the common tool
  registration helper, plus a trusted per-call authorization hook that can return
  an auth error before parsing/executing an operation. Preserve ordinary stdio
  behavior and UI visibility; never treat model arguments as credentials.
- `src/server/main.ts`: pass validated request authorization context to that hook.
  The current adapter replaces the token with an internal credential, so this
  needs an explicit trusted transport contract, not blindly forwarded headers.
- Dedicated auth/MCP tests: discovery metadata, missing/expired/insufficient token
  errors, no side effects on rejection, reconnect and unaffected local stdio.

The parent must coordinate those files with concurrent server work and review how
unauthenticated discovery/challenges should be exposed. Do not make protected
operations anonymous just to trigger linking. Real ChatGPT initial login, token
expiry, scope changes and reconnect remain NOT RUN pending that integration and
approved IdP/TLS setup.

Review regression evidence: scope now requires a string before regex validation;
omitted, undefined, null and numeric values reject configuration. Eight local
adapter tests cover missing required claims, future nbf/iat, algorithm allowlists,
ES256 success, JWKS network/HTTP/JSON/empty-key failures and key rotation. JWKS
fixtures use JOSE's customFetch hook without any external network. Rotation tests
retain the default cooldown, explicitly refresh the fixture cache, and establish
that removed keys remain accepted while cached but fail after refresh. They do not
claim instant revocation, elapsed-time cache expiration or a real IdP rotation.
