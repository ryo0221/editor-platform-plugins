# ChatGPT self-operated candidate (#9)

Self-operation with a single owner is the agreed delivery model. Use the dedicated
[source runtime and runbook](runbook.md): HTTPS terminator → loopback OAuth MCP
server → private owner workspace. It uses the existing shared tool-authorization
hook and JOSE verification directly. The former two-process `gateway.mjs` remains
only a transport-only candidate/test subject; it is **not** the recommended entry
for ChatGPT tool-level login/reconnect.

No live IdP, domain, hosting purchase, registration, OAuth grant or ChatGPT session
has been set up by this work. Status remains preparing. Local tests and offline
metadata checks do not establish actual-host acceptance.

## Implemented boundary

- RFC 9728 protected-resource metadata and HTTP challenges; per-tool OAuth
  `securitySchemes` plus `mcp/www_authenticate` error results. See [tool hook](tool-auth.md).
- JOSE checks access-token signature/type, exact issuer/audience/owner/client,
  expiry/not-before/issued-at and scope. RS256/ES256 only; token issuance lifetime
  and age are at most ten minutes. No ID-token or opaque-token fallback.
- One loopback process and one absolute data directory, protected by the existing
  conservative one-writer lock. No internal fixed Bearer, demo route or identity
  forwarding header in the integrated runtime. No token or content logging.
- Offline discovery validation rejects missing S256, issuer/JWKS mismatches,
  insecure endpoints, unsupported code flow/client authentication/scope and
  unadvertised CIMD. It performs no fetch or registration.

OAuth code issuance, redirect validation, user consent, PKCE verification, CIMD
validation and revocation policy remain responsibilities of an established IdP.
No custom OAuth authorization server is implemented here. The SDK fixture verifies
request construction and error handling, not those IdP enforcement decisions.

## Reproduce locally

From the repository root:

```sh
npm ci
npm ci --prefix integrations/chatgpt --ignore-scripts
npm run build
npm test --prefix integrations/chatgpt
node --test integrations/chatgpt/readiness.test.mjs
node --import tsx --test integrations/chatgpt/runtime.test.mjs integrations/chatgpt/tool-auth.test.mjs integrations/chatgpt/mcp-smoke.mjs
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check
```

No automatic CI, performance measurement, account or public endpoint is involved.
Keys and workspace contents in these fixtures are disposable. Tests cover actual
MCP calls, source-runtime startup/locking/restart, protocol metadata, spoofed
identity rejection, per-request isolation, expiration, key rotation/caching and
fixed-fixture official SDK discovery/S256/resource-bound token requests. Native
ChatGPT UI, real TLS and real IdP acceptance remain **NOT RUN**.

## Data and costs

Saved contents, titles, IDs, selections, proposals and exports returned by MCP can
reach ChatGPT/OpenAI; the View receives content too. Unsaved drafts are UI state
until explicit host interaction, not a guarantee about provider diagnostics or
retention. Provider account/data terms remain separate from local storage.

Native artifacts/proposals/reference snapshots are retained in the operator's
private data directory. Trash is recoverable, not erasure. TLS infrastructure can
see request bytes; the IdP sees login/client metadata. Backups, log retention,
encryption at rest and eventual erasure are operator responsibilities. Use a
separate OS account/container per workspace without other users' mounts or secrets.
A loopback bind/lock alone is not an OS sandbox. UI-only visibility is not proof of
human approval against an untrusted direct client.

The plugin invokes no model API and creates no shared paid service. ChatGPT,
IdP, hosting and domain costs depend on the eventual approved operator setup;
there is no cost-free hosting promise. Do not paste secrets, tokens or private
workspace contents into chat or issues.
