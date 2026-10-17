# React cloud-browser acceptance from Codex shell — #8

Requested source: `0c17336a125659dda85af90153c9b84e651679ae` (main).
This is **PASS for the requested cloud browser workflow**, not Claude Code host
acceptance. No Claude process, account, model session, plugin installation or
native desktop opener was used. The UI's built-in “Claude Code connected” wording
is not evidence that Claude was running.

## Exact candidate and route

- Linux x64 archive: `editor-platform-claude-code-0.1.3-linux-x64.tar.gz`.
- Archive SHA-256: `0d902935e49c2d66f95060bc993be3bd061442df867d8a8b3e29ac6514ee1647`.
- Build metadata: requested source commit, `sourceDirty: false`.
- Public upstream: `97ea905745101b3814d14febcc0c31b157023c71` unchanged.
- Preview HTML SHA-256: `bd6507e39ef9bc121679523386e67e0c294795d81b80af51850158bc54fedd30`.
- Main Editor HTML SHA-256: `a123cc779ea268aabd87ee477bceca3c63f1a609f71494b2441b4d84dabe079a`.
- Debian 13 x64; bundled Node 24.19.0; existing Chromium 151.0.7922.173.

Codex shell ran the SDK test driver, which launched the **extracted archive's**
Node executable and `server/code.mjs`. The existing `xdg-open` call was replaced
only by a temporary test opener that privately captured the capability URL; the
installed Chromium then loaded the actual packaged browser shell, Editor and
separate-origin React preview. No source/tsx server or substitute Editor was used.
The harness reads the archive once, checks those bytes against the fixed SHA-256
above, writes those same bytes into its private temporary directory and extracts
that snapshot itself. Every launched executable, loaded HTML file and compared
component source comes from that fresh extraction; no pre-extracted directory is
accepted. Runtime Node/compiled server/UI/browser/preview hashes are also verified
against the extracted build metadata. The launcher has no dedicated metadata hash;
its bytes are covered by the fixed archive digest and explicitly recorded below.

The driver reused an existing dependency tree with the unchanged lockfile; there
was no new account, login, application installation or persistent MCP registration.
Each run used a new private temporary storage directory and fictional data only.
The opener file was mode-restricted, request/result bodies were not logged, URLs
and credential-like values were redacted from diagnostic console messages, and
temporary capabilities/storage were removed after the test. Exported fictional
fixtures and screenshots remain in ignored `work/cloud-react/evidence/`.

## Observations

| Action | Result and evidence |
| --- | --- |
| Start from an empty composition retaining the registered catalog | PASS; no sample nodes prepopulated |
| Insert Panel, select its content slot, insert Text and Counter through the actual Surface | PASS; one root, three nodes, two Panel children |
| Update Panel title, Text text and Counter label/initial props | PASS; rendered values change |
| Switch to interaction mode and operate Counter | PASS; initial 2 advances to 3 |
| Explicit Save then SDK reread | PASS; saved revision 2, native structure/props retained; transient counter state not written into props |
| Reload from storage and reload browser page | PASS; composition retained, counter initialized from saved prop 2 |
| Export React TSX ZIP and inspect all contents | PASS; six exact expected files; native JSON equals saved content; implementation bytes equal packaged source and match registration hashes |
| Build exported Screen.tsx/CSS/implementation with React external | PASS; generated source bundles without requiring Editor runtime |
| Restart preview twice | PASS; counter's local state resets to the saved initial prop |
| Close browser page, stop server, restart packaged process and reopen same artifact | PASS; native content retained across a real server restart |
| Parent DOM and parent credential-storage access | PASS; cross-origin access refused, no Editor token in child session storage |
| Listener cleanup after closing page and server | PASS; old preview endpoint stops accepting connections |
| Unexpected page/console/server errors in this orderly workflow | PASS; zero |
| Screenshot | PASS; real composition visually inspected |
| Recorded acceptance script and TypeScript | PASS; one browser case, no retries/skips; `npm run typecheck` |

ZIP files: `Screen.tsx`, `Screen.css`, `manifest.json`, `composition.json`,
`README.md`, `PluginComponents.tsx`.
Final inspected ZIP SHA-256: `43a62cafc5db625fb0afb126f5f04b7c9bc31a4b7d436bd5923140d6c9f64427`.
Per-run node UUIDs make separately generated ZIP bytes differ; the candidate archive
itself stayed fixed across the final runs. `result.json` records hashes and summary
booleans, not artifact text or capabilities.

## Failed attempts and separate lifecycle observation

1. The first candidate was **rejected before browser acceptance** because a
   dependency-reuse symlink was visible to Git and metadata correctly recorded
   `sourceDirty: true`. The dependency directory layout was corrected and the
   package rebuilt from a clean unchanged main. No metadata was patched to pass.
2. An added scenario stopped the stdio server **while leaving its browser tab
   connected**. All requested editing/export assertions had passed, but the
   zero-console-error assertion **FAILED** on
   `ERR_INCOMPLETE_CHUNKED_ENCODING` when the active HTTP stream was closed.
   A diagnostic rerun reproduced it and located it in server shutdown. This
   observation is not relabeled PASS or silently filtered. No application fix was
   made for that broader live-tab/backend-stop behavior in this task.
3. The final recorded lifecycle closes the browser document before stopping the
   process, then reopens the saved artifact using a new packaged server. It passed
   with zero errors. This does not certify seamless live-tab backend shutdown.

## Reproduce with the fixed package

Use the source commit above and existing maintainer packaging instructions to
rebuild a candidate in a clean source checkout, or reuse this recorded archive.
Do not rebuild from an evidence-only commit and label it the original main.
In the checkout containing this evidence harness, place the exact recorded archive
in `release/`, then run with an existing toolchain and Chromium. The fixed digest
in the harness rejects a different rebuild even if its sidecar checksum matches:

```sh
node_modules/.bin/playwright test --config tests/acceptance/react-cloud.config.mjs
```

The dedicated config has no auxiliary HTTP test server, automatic retry, trace or
video capture. It is not added to general checks or CI. Chromium uses the existing
`--no-sandbox` test launch option; browser-origin checks do not establish OS process
sandbox acceptance. The evidence branch adds only this record and the dedicated
harness/config; application code, shared README/package/lock and pin are untouched.

## PR #32 candidate-provenance correction

The original harness independently checked an existing extraction and an archive
checksum; it did not establish that the tested files came from that archive. This
was an evidence-binding gap, not a React runtime defect. The corrected harness
uses the verified-byte snapshot and fresh extraction described above, eliminating
the separately prepared directory and mutable expected-commit file.

Revalidation on 2026-10-17: **PASS**, one Chromium workflow case, no retries or
skips, zero browser/server errors; `npm run typecheck`: **PASS**. The archive SHA
remains `0d902935e49c2d66f95060bc993be3bd061442df867d8a8b3e29ac6514ee1647`.
The run's `result.json` records the provenance method and these actual extracted
file digests before starting the server:

| Executed/served archive file | SHA-256 |
| --- | --- |
| `runtime/node` | `bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12` |
| `node_modules/editor-platform-code-runtime/index.mjs` | `b17eb64f29d65fdfdfeca01c2a4ed17ac59d076899712d51a083ae0dd135ed4a` |
| `ui/editor.html` | `a123cc779ea268aabd87ee477bceca3c63f1a609f71494b2441b4d84dabe079a` |
| `ui/browser.html` | `6aaf606dfe2e32f0b6d76ab9bfe0ec95c545f21c79990d547de988a47ca7c843` |
| `ui/react-preview.html` | `bd6507e39ef9bc121679523386e67e0c294795d81b80af51850158bc54fedd30` |
| `server/code.mjs` | `0fc31e136f9093ca581b01e45f6d5b616bc41317be7af9b448d0ceea2f7c0fa3` |

The existing 16-second demo remains the recording of the original fixed main
`0c17336` candidate, made before this harness correction. It was not re-recorded
and does not serve as evidence for this fresh-extraction rerun. Its explicit
Codex/cloud-browser, no-Claude-session label remains unchanged; no video was
uploaded externally.

## Claude-specific work still NOT RUN

- Signed-in Claude Code plugin discovery, permissions and actual model-driven
  component composition through its tools/skill.
- Real graphical OS opener and browser handoff from Claude Code (the opener here
  was a private test capture, not native desktop acceptance).
- Persistent native install/update, next-conversation workflow and model reread
  after human Save in that real host, against its exact installed candidate.

The user's separate native test must supply those observations. This cloud run
neither closes original #8 nor promotes any Claude acceptance status. There is no
Release, merge, CI enablement or general performance measurement in this work.
