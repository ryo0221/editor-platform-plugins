# Historical tool-level OAuth hook (#9)

**Current product status: unsupported (2026-10-18).** This server-dependent route
is retained for engineering reference, not offered as an installation option.
Neither the provider nor the user is asked to operate additional infrastructure.
See [the current policy](README.md); deployment preparation is stopped.

The shared server includes the protocol signals required by the
[official ChatGPT authentication guide](https://developers.openai.com/plugins/build/auth)
(checked 2026-10-17): per-tool `securitySchemes` and an error result containing
`_meta["mcp/www_authenticate"]` with `error` and `error_description`. Actual ChatGPT
linking/relinking is still NOT RUN. This is source-level integration, not an approved
public endpoint, IdP registration, account, or automatically enabled login mode.

## Trust boundary and wiring

`startHttp` accepts an optional `oauth` configuration supplied by trusted startup
code. Wire the existing #15 `verifier(config)` directly, in the same process:

```ts
startHttp({
  host: '127.0.0.1', port: 8788,
  allowedHost: new URL(config.resource).hostname,
  store: privateWorkspaceStore,
  oauth: {
    resource: config.resource, issuer: config.issuer, scope: config.scope,
    verifyAccessToken: verifier(config),
  },
});
```

Here `config` is operator-validated configuration, bound to the exact owner,
client and resource; `privateWorkspaceStore` uses that owner's private directory.
Neither object comes from a tool call or incoming headers. The `verifier` is the
JOSE-based implementation in `gateway.mjs`, not a caller-provided boolean or an
unverified JWT decoder. The default shared CLI/stdio entrypoints are unchanged. The dedicated
`server.mjs` source launcher now supplies this configuration and verifier; see
[the runbook](runbook.md). TLS routing and real IdP configuration remain pending.

Use this mode directly behind the approved TLS terminator, preserving public Host
and the original Authorization header. Do **not** put #15's credential-substituting
HTTP gateway in front of it: its internal fixed Bearer is not an OAuth access token.
The old gateway remains a separate transport-only candidate. This mode rejects
mixing OAuth with the internal fixed-token, demo or browser modes, and refuses
non-loopback binding. It neither trusts nor creates an authenticated-identity
forwarding header. Host and Origin checks remain in effect.

The HTTP layer validates the actual Bearer via the configured verifier. A fresh
closure bound to that request revalidates before the tool operation. Only exact
`true` authorizes; insufficient scope and verifier exceptions deny access. Another
request, session ID, RPC metadata, forwarded identity header or tool argument cannot
supply that closure. There is no global authenticated-user state. OAuth remains one
owner/client/resource granting the whole workspace, not multi-tenant authorization.

## Failure and discovery behavior

- Protected-resource metadata is public. Initialization, tool/resource discovery,
  resource reading, event streams and unknown methods retain transport auth:
  invalid credentials return 401, insufficient scope 403 with a challenge.
- `tools/call` may reach the registered handler without valid credentials solely
  to return an auth error, not to execute a workspace operation. Revalidation at
  that handler also covers expiry/failure after the initial HTTP check. Invalid
  JSON/schema/unknown tools can be rejected by the SDK first; no mutation occurs.
- Each OAuth tool advertises only oauth2 with the configured workspace scope, at
  the top level and in the compatibility `_meta.securitySchemes` mirror. The
  pinned SDK strips unknown top-level tool fields in its usual discovery handler,
  so OAuth mode uses a small explicit discovery list built by the common helper,
  with the same SDK JSON-schema converter. Default discovery remains unchanged.
- Adding future embedded-editor tools through the existing helper automatically
  applies the policy. Registering tools elsewhere must explicitly preserve it.
- Noauth defaults are not introduced. After an approved initial connection obtains
  a token, discovery provides tool policy; expired credentials then receive the
  tool challenge. Local requests confirm the signals, not ChatGPT's UI behavior.
- App-only visibility and model-only omission are retained. OAuth does not prove
  human approval against a malicious direct client; existing trusted-host limits
  still apply. Stdio receives no OAuth configuration unless explicitly passed by
  trusted source code, and its ordinary launch path is unchanged.

## Local checks and remaining gates

From repository root, after installing root and integrations/chatgpt dependencies:

```sh
node --import tsx --test integrations/chatgpt/tool-auth.test.mjs
npm test --prefix integrations/chatgpt
node --import tsx --test integrations/chatgpt/mcp-smoke.mjs
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check
```

Fixtures use ephemeral keys and loopback only. Cases cover metadata/schema parity,
missing/expired/foreign/scope-limited credentials, reauthentication with a fresh
owner token, no unauthorized writes/reads, header/argument/RPC/session spoofing,
concurrent request isolation, failure between transport and tool checks, and
model-only omission. Existing real stdio/Code tests remain required regressions.
No token, private content or auth account is needed from the user.

The earlier #15 transport-only adapter remains separate from this integrated mode. End-to-end IdP PKCE/consent, approved TLS, initial linking,
expiry/relink UI in signed-in ChatGPT, CSP and all actual-host acceptance remain
NOT RUN. No public-host connection, persistent OAuth registration, release, signing,
CI change or Issue closure is performed by these checks.
