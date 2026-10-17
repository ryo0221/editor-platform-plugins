# Bundled React preview — Issue #8

Status: implementation candidate for the Claude Code local browser. Actual signed-in
Claude Code acceptance is NOT RUN. This document does not close #8 or authorize a
release. It is separate from the shared verification record maintained by the
other implementation task.

## Runtime and trust boundary

The plugin bundles React and React DOM 19.1.1, the public React composition renderer,
and three reviewed Host implementations: Panel, Text and Counter. No dependency
is downloaded at runtime. `scripts/verify-react-preview.mjs` verifies exact React
versions and the reviewed source hash at build time. Registrations carry that hash
and their immutable contract hashes. The Code archive records the preview HTML's
SHA-256 alongside the existing browser/runtime hashes.

Artifact content is declarative native JSON. It can contain props, tree/slot
composition, fixtures, layout and callback declarations, never executable source.
Native interchange can retain foreign registrations, but execution requires exact
matches with the bundled catalog and environment, including full registration
metadata. The renderer also runs native preflight and applies a 128-node Host
limit. External imports, arbitrary JSX/JS/HTML, component uploads, package fetching,
custom providers and external assets are not supported. New implementations require
source review, versioned registrations and a new distribution build.

Claude Code starts a second listener on an OS-assigned port at **127.0.0.1 only**.
It serves one bundled HTML document. There is no save, MCP, authentication, data,
filesystem or proxy API on that listener. Only exact Host and path are accepted;
foreign Origin, non-GET methods and all other routes are refused. It sets neither
CORS nor cookies and contains no Editor capability, artifact or saved workspace
content. The process closes the listener with its existing Editor listener and
workspace lock. A missing preview bundle fails startup and releases the lock.

The existing public `ReactUiSurface` uses a different-origin iframe with
`allow-scripts allow-same-origin`. This is the explicitly approved loopback design;
it is **not** an opaque-origin sandbox for arbitrary untrusted code. The iframe
cannot read parent/top DOM or Editor-origin local/session storage. Its own origin
has ordinary browser storage capabilities, but the implementations do not use them,
and it receives no authentication material. Cookies are not isolated by port:
this plugin does not use cookies for authentication, and this design must not be
extended into a cookie-authenticated Host without a new boundary review. Same-user
local processes and the installed bundle remain trusted; this is not OS isolation.

The response CSP allows the exact bundled inline script hash and inline layout
styles. Default resources, connections, images, fonts, media, nested frames,
workers, objects, base URLs and forms are denied. Only the current Editor origin
may frame it. A CSP sandbox also denies popups, forms, downloads and top navigation.
The implementations expose no URL/navigation/HTML props. Permissions Policy denies
camera, microphone, geolocation, payment, USB and clipboard access. The runtime
is not designed to run malicious component implementations or to contain CPU abuse.

The child accepts messages only from its actual parent Window and the exact
configured loopback Editor origin, never `*`/`null`. Bootstrap has an exact shape;
render requires validated UUID session/request IDs, monotonic revision, mode,
viewport and bounded native content. The first accepted session is bound to that
iframe. Invalid/replayed requests are ignored. Responses carry those IDs/revision;
the public Surface validates source, origin, exact runtime resolution, callback
arguments and selection identities. Callbacks update preview status only; they
never invoke MCP, save, apply a proposal or mutate the canonical artifact. Restart
and artifact/tab reopening create fresh execution state.

## Authoring and output

Use `get_editor_guide(kind: "react-ui")` for the fixed native example and registration
metadata. In the real Editor, insert registered components, choose a target slot,
edit properties, and switch between composition selection and interaction.
Counter demonstrates actual local React state; its changes are ephemeral. Use
explicit Save for native edits. Previously retained foreign registrations remain
available as data but cannot execute in this runtime. The bundled example button
uses the existing command/Undo path; it does not silently migrate foreign content.

`Export React TSX` uses upstream export/preflight and downloads Screen.tsx,
Screen.css, manifest.json, composition.json, README.md and PluginComponents.tsx.
The included implementation bytes are checked against the registered hash. The
output is source for integration into a React 19.1.1 project, not an independently
packaged application or an executable code-upload path. Native JSON export and
retention remain available. Other MCP Apps hosts have no configured loopback
endpoint and explicitly report unavailable execution; they are not certified by
the Code browser tests.

## Verification record

Base: plugin PR #14, `b7dd4c255f7b2f8d9c1c3d347dc112712b536a9b`;
public upstream `97ea905745101b3814d14febcc0c31b157023c71` unchanged.
Implementation commit and final check counts are recorded below after validation.

| Check | Result |
| --- | --- |
| Exact source/runtime hash, native preflight, forged registration/props, message schema and foreign/stale responses | PASS, dedicated unit checks |
| Static-only listener Host/Origin/method/path/CSP/no Cookie/no CORS and idempotent close | PASS, dedicated unit checks |
| Real Code browser compose/props/interact/save/reread/TSX ZIP, restart and reload | PASS, targeted Chromium check |
| Parent/top DOM and credential storage denial, CSP fetch/script denial, malformed JSON | PASS, targeted Chromium check |
| Component exception, malformed/replayed/session-swapped requests | PASS, fault-injected test-only browser build; no production failure hook |
| Full required check and isolated package | Pending final run |
| Actual signed-in Claude Code, persistent installation, OS graphical opener | NOT RUN |
| Native macOS/Windows and other browser families | NOT RUN |
| Release, Issue close, merge, CI and general performance measurement | NOT RUN / not authorized |

Development failures retained: initial npm installation used an unwritable default
cache; rerun used `/workspace/.npm-cache`. An initial typecheck found a component
map variance error. An initial unit test exposed the missing Host preflight and
was fixed by requiring it. Initial browser testing exposed metadata insertion into
an embedded JS string; insertion now targets the opening HTML head. A test import
needed Node's explicit JSON import attribute. These were failures before fixes,
not accepted/skipped cases. Expected CSP and injected-component errors are asserted
specifically in their tests; unexpected page/console errors fail the tests.

Reproduce on a prepared public checkout:

```sh
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check
EDITOR_NODE_ARCHIVE=/path/to/pinned-official-node.tar.gz npm run package:claude-code
npm run test:claude-code-package
```

Screenshots, downloaded source ZIPs and generated distributions stay outside Git.
The browser tests use an injected OS opener and the real stdio/browser bridge;
that evidence must not be substituted for actual Claude Code host acceptance.

## Integration coordination

This branch is based on PR #14 rather than changing its pin. It does not edit the
shared README, docs/verification.md or SECURITY.md. On integration, their existing
statements that React execution is entirely unavailable should point here and say
"bundled catalog execution in the Claude Code local browser; other hosts and
arbitrary code unsupported; actual Claude Code acceptance pending." The installed
skill has the same outdated capability sentence and needs coordinated revision.
The narrow shared integration changes in this PR are the React native factory,
Surface adapter, guide/discovery descriptions, Code listener lifecycle and preview
HTML inclusion/hash in the Code packager. Coordinate that packager hunk with #4's
platform changes; neither platform selection nor Node pin is changed here.
