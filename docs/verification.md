# Verification — 2026-10-16

## Reading the dated records

The sections below are historical checkpoints, not a single current status matrix.
Issue #10 closed on 2026-10-17 for the limited Linux x64 existing-Codex shell/browser
route with a separate browser operator. See [the shell evidence](codex-shell-verification.md)
and [current publication gates](codex-release.md). Older Codex NOT RUN rows refer
to those earlier checkpoints or native registration, which remains NOT RUN.
The current public upstream pin is recorded in `upstream.json`; earlier pins and
counts below are retained as historical evidence, not proof of a newer archive.

## Exact dependency

The public upstream is pinned to `a9e708331ff9b78886a02d3c30dca67bfafdf2e8`,
tree `f4d4f7ca6187cca786e2a3bef16cc71b54113a71`, with its export-manifest hash
recorded in upstream.json. The submodule's tracked files were unchanged.

## Completed checks

- Dependency installation and lockfile generation: PASS.
- Pinned upstream verification, strict TypeScript and production UI build: PASS.
- Server/domain/HTTP/MCP/stdio/desktop-storage/authoring tests: **24 passed**, no skips.
- Desktop Chromium protocol harness: **20 passed**, no retries or skips.
- Browser tests fail on page errors and console errors; the final run had none.
- Representative Document and Graph screenshots were inspected, including Japanese
  text with locally available Noto fonts. All nine mount cases retain screenshots
  outside Git for local inspection.

Server cases cover all eight non-Slide native domains and Slide, real changed
candidates, preview/apply/reject, saved-revision conflicts, restart retention,
bounded native validation, invalid IDs, exports, bearer/Host/Origin boundaries,
MCP initialize/tool/resource discovery and a stdio launch from outside the repo cwd.

Browser cases cover all nine native Surface mounts, explicit saving and native JSON
downloads; actual Document typing/save/reload; Slide preview/reject/apply; Document
native proposal acceptance; protection of an unsaved manual draft against an
external save; and a real Graph add-node command/save/reload with its Profile.
These bounded cases are not full-domain upstream regression or complete feature
acceptance for every tool in each Surface.

The final browser configuration uses one fresh browser per case. This restricted
cloud required an explicit Chromium executable and `EDITOR_BROWSER_SINGLE_PROCESS=1`;
the single-process browser cannot reliably create a second context after closing
the first. This changes process isolation in the test runner, not application
assertions, timeout budgets, editor permissions or host CSP semantics.

## Not accepted by these checks

- No actual signed-in ChatGPT/Claude web or desktop integration has been tested.
- No marketplace submission, review, install acceptance or hosted endpoint.
- No OAuth server/gateway, organization policy, per-user tenancy or production service.
- No React UI executable-component preview runtime. Its native model, structure and
  properties are retained/editable; the UI declares the runtime requirement.
- Animation, Video and GIS are absent from the public source pin. No private source
  was copied to manufacture a public adapter.
- File/PDF imported binary interoperability, Office exports, embedded content across
  Editors and unrestricted shared editing are not certified by this integration.
- No mobile acceptance, performance measurement, browser-family matrix or new Actions.

The View is currently a single self-contained HTML bundle for all published domains
(approximately 7.94 MB uncompressed at this checkpoint). Real-host resource size,
CSP, worker, download and embedding behavior still need acceptance in each provider.

## Reproduce

```sh
git submodule update --init --recursive
npm ci
npm run check
```

Provide `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for a preinstalled browser if Playwright's
managed browser is unavailable. `EDITOR_BROWSER_SINGLE_PROCESS=1` is only needed
on environments that impose the same restricted-process constraint.

## Claude Desktop MCPB — 0.1.1

- `npm run check`: PASS (strict types/build, 18 server tests, 14 browser cases).
- Current browser rerun: Chromium 153.0.8010.0, single-process cloud configuration;
  no application/page console errors, retries or skips. Playwright's managed
  browser download was unavailable; an npm-distributed Chromium binary was used.
- Official `@anthropic-ai/mcpb` 2.1.2 manifest validation and packing: PASS.
- `npm run test:claude-package`: **2 passed**, running the installed server with
  Node **20.19.0**, the declared minimum runtime (the build host uses Node 24.19).
- Archive checks cover complete corresponding public source, retained lockfiles /
  declarations / tsconfig, license texts, safe paths and SHA-256 integrity.
- Runtime files alone were extracted outside the repository, into a path containing
  spaces and Japanese text. No source checkout, external node_modules, npm, tsx,
  Git, model API key or network dependency download was available to that server.
- Actual stdio initialize/discovery, all nine domain create/read/export calls,
  changed Document proposal preview/reject/apply, manual saving, stale conflicts,
  UI resource bytes and repeated restarts: PASS.
- Moving the installation to a different directory retained all nine artifacts,
  pending proposals and later saved content through the stable application-data
  directory. The packaged HTML is the same Vite output tested by the browser harness.
- Windows/macOS default storage paths are covered by unit checks. Native Windows
  and macOS execution, Claude's installer/runtime selection, its sandbox and MCP
  Apps UI/download behavior still require real-host acceptance. No signed-in
  Claude Desktop installation or directory approval is claimed.

Maintainers reproduce the package separately from the main checks:

```sh
npm run package:claude
npm run test:claude-package
```

`EDITOR_TEST_NODE=/absolute/path/to/node` selects a separate installed-runtime
binary for the package smoke test. The MCPB uses only portable JavaScript/HTML;
developer esbuild/Playwright binaries are not runtime dependencies in the archive.

## Rich native authoring — 0.1.2

The user reported that the 0.1.1 extension opened the Editor in Claude Desktop,
but the generated result contained only title/body text. The Slide creation API
was indeed restricted to that shorthand; successful mounts did not establish
useful authoring. This revision adds a typed full-native Slide creation input,
native Slide snapshot proposals, nine per-domain model guides, and explicit MCP
authoring instructions. It does not call an AI provider itself.

- `npm run check`: PASS, **21 server tests and 17 browser cases**.
- Actual MCP guide/create calls retain each of the nine rich/native example
  contents exactly, including chart views and explicit React UI limitations.
- The real Slide Surface displays independent styled text/shapes, actual chart
  bars and table cells, and embedded image data. A native text edit saves/reloads
  without dropping the table/chart structure. Native chart/background proposals
  preview and apply only through explicit review.
- The real Document Surface displays styled text, table cells, an image and a
  rendered Mermaid image with nonzero intrinsic dimensions; native block types
  survive saving. Both rich views were visually inspected with Japanese fonts.
- Existing revision conflicts and locked Slide group/descendant protections are
  exercised for native candidates; proposal creation leaves saved content intact.
- Representative visual checks were repeated with local Noto Sans JP test fonts.
  These fonts are test-environment assets, not new extension dependencies.
- The offline package check now creates all nine domains from their guides rather
  than only mounting default empty artifacts. The package exposes 18 tools.

These checks use deterministic authored examples and the local MCP Apps harness.
They verify the available API and actual rendering, not the quality of a live
Claude model's response. The user report confirms 0.1.1 host UI display, but this
agent has not signed in to Claude Desktop or certified live 0.1.2 generation.

## Extension workflow fixes — 0.1.3

- All six typed Slide edit examples are executed through MCP. Complete-content
  Slide proposals handle chart/table changes, preserve canonical content until
  review, and reject missing/ambiguous inputs and stale revisions. Actual discovery
  includes the native-content input and the guide returns both JSON schemas.
- A custom four-node-type, three-edge-type Graph Profile is created, retained,
  edited, proposed/reviewed, saved, restarted and exported with its native graph.
  Missing/invalid/mismatched Profiles, incompatible edges, Profile substitution
  and read-only field changes are rejected. Legacy default-Profile records remain
  readable/saveable without migration. Profile schema migration is not implemented.
- All nine domains exercise paginated metadata discovery and delete/restore with
  saved-revision checks. Content/Profile/proposals survive; archived writes fail,
  old proposals remain stale after restoration and fresh Store instances read the
  retained bytes. No permanent-delete operation is present.
- Browser cases exercise the full-content Slide proposal route, a custom Graph's
  real node property input/Host flush/save/reload and graph+Profile download, plus
  Slide and Document discovery/trash/reopen/restore through the actual UI.
- The packaged offline Node 20.19 runtime also exercises rich Slide proposals,
  custom Graph retention/export and trash persistence/restoration after relocation
  and restart. Existing 0.1.1/0.1.2 protocol/persistence checks are retained.
- Cross-artifact embedding/source-update propagation are explicitly unavailable in
  tool-visible capabilities/instructions. No upstream #264 implementation is claimed.
- These are deterministic protocol, Surface and package checks. Live signed-in
  Claude generation, Windows/macOS installation acceptance and mobile are not
  re-tested. No upstream files, performance collection or Actions were changed.

## Issue #1 — Claude Code distribution candidate (2026-10-16)

Status: **配布準備中**. This implements a candidate and does **not** close the
parent issue. The actual authenticated model-driven acceptance scenario and demo
remain release blockers. No release, marketplace review or supported OS matrix
is claimed by a successful local package build.

Environment: Debian GNU/Linux 13 x64, Node 24.19.0 (included in the candidate),
Chromium 151.0.7922.173, Claude Code 2.1.301, plugin 0.1.3 candidate, public upstream
`a9e708331ff9b78886a02d3c30dca67bfafdf2e8`. Native macOS/Windows/WSL: NOT RUN.

| Check | Result | Boundary |
| --- | --- | --- |
| Public upstream pin / strict types / production Editor build | PASS | Unmodified public submodule; no private source |
| Production local browser bridge build | PASS | Same real Editor HTML as MCP Apps, no mock replacement |
| Unit/protocol suite | PASS, 26 tests | Includes model-only tool discovery/direct-call refusal, browser bearer and Origin checks, stale saves and listener/lock shutdown |
| Chromium browser suite | PASS, 21 tests | Existing 20 cases plus separate Code browser channel: actual manual Document edit/save, model reread, preview/reject/apply, Markdown download, tab reload/discovery |
| Isolated prebuilt archive | PASS, 1 test | Bundled Node, no npm/Git/tsx or system Node on runtime PATH, path with spaces/Japanese, all nine rich native domains create/read/export, UI bytes, explicit browser save, relocation/restart retention, opener error recovery |
| Claude Code plugin and marketplace validation | PASS | Actual CLI 2.1.301, not only JSON validation |
| Persistent user-scope install and fresh CLI process listing | PASS | Temporary isolated CLAUDE_CONFIG_DIR, local extracted marketplace; enabled version 0.1.3 |
| Existing Desktop MCPB packaging and isolated tests | PASS, 2 tests | Shared packager still validates and runs the separate Desktop artifact |
| CLI marketplace/plugin update | PASS | Local directory source, CLI confirms next-session reloading; not an accepted version-to-version application upgrade |
| Signed-in model-generated three-slide request / skill invocation | NOT RUN | No authenticated interactive Claude Code account/session available |
| Real graphical desktop/browser launch in Claude Code | NOT RUN | Browser opener captured by test stub; actual browser rendered with Playwright |
| Fresh signed-in host install through restart/new conversation | NOT RUN | CLI install/list is narrower evidence |
| Real-host update/data retention, end-user permissions, demo video | NOT RUN | Relocation test is narrower evidence |
| Public release URL / actual-host demo URL | NOT AVAILABLE | LP must keep preparing state and download disabled |
| Office export | OUT OF SCOPE | Disabled by this host, no PPTX/DOCX success claimed |

The new local browser uses an ephemeral 127.0.0.1 port and a random 256-bit token.
It receives the token through the OS opener's fragment only; model tool output
contains neither URL nor capability. The shell removes the fragment and keeps it
in session storage for tab reload. The model's stdio connection does not register
UI-only operations; a separately authenticated browser connection retains explicit
save/review actions. This protects against model use of those stdio tools, not a
malicious same-user process with shell/process/browser-storage access.

One workspace lock prevents multiple Code sessions sharing the same storage.
Unexpected process death conservatively leaves a lock; recovery instructions
require closing all sessions and backing up before removing it. No silent stale
lock deletion or multi-process revision coordination is claimed.

Initial browser verification exposed a missing favicon request (HTTP 404). Serving
an empty favicon response removed that console error. The new rich Document test
initially changed text without synchronizing its authoritative rich spans; the
fixture now follows the native contract. Final passing runs use those corrected
sources and the unchanged browser assertions. No performance collection or Actions
were added.

Reproduce the candidate separately from the existing Desktop MCPB:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check
EDITOR_NODE_ARCHIVE=/absolute/path/to/node-v24.19.0-linux-x64.tar.gz npm run package:claude-code
npm run test:claude-code-package
```

The packager includes public corresponding source, dependency/license notices,
the matching runtime license, build metadata, Node/UI/browser hashes and archive
SHA-256. Generated `release/` artifacts and private test workspaces stay out of Git.
See [the Code guide](claude-code.md) for persistent install/update/uninstall,
backup, data disclosure, unsupported environments and the remaining release gates.

## PR #2 review fixes — 2026-10-16

The initial Code candidate copied the builder's Node executable. That did not
establish portability: distro Node can require libnode or other build-host-only
libraries. The candidate now requires the official Node 24.19.0 Linux x64 archive
with a repository-pinned SHA-256 from Node's official SHASUMS256.txt. The packager
verifies the archive before building and again before extracting only its binary
and LICENSE. It rejects the builder's executable, repacked archives, missing input
and checksum mismatches. No caller-provided checksum or license substitutes for
this trust anchor. Build metadata includes the distribution version, source URL,
archive hash and extracted binary/license hashes.

The official archive's SHA-256 was checked against the pin. Inspection of that
binary's dynamic dependencies found only the baseline glibc, libstdc++, libgcc,
libm, libdl, libpthread and ELF loader, with no libnode dependency. Its maximum
required GLIBC symbol version is 2.28. This is provenance/baseline verification;
execution on another Linux distribution and real-host acceptance remain NOT RUN.

The Code browser no longer advertises updateModelContext, since its separate
stdio model connection cannot receive that update. The actual Editor detects host
capabilities and offers 「選択箇所を保存（チャットで読込）」 with an explicit prompt to
ask the chat to reread the saved selection. It does not report automatic sharing.
Hosts that actually support updateModelContext keep their existing sharing flow.
The skill and user guide describe the required read_artifact/read_deck follow-up.

Validation: `npm run check` PASS (27 unit/protocol tests, 21 Chromium cases).
The added runtime regression rejects unpinned input before extraction. Browser
coverage saves a real Slide selection through the Code bridge, checks the honest
status/instructions and confirms stdio rereading returns the selected ID. The
compatible-host case still delivers the selection to its host model-context
handler. Package checks separately verify the rebuilt archive's pinned runtime
provenance/hashes and retain the standalone relocation/restart workflow.

Rebuilt Code archive: PASS (1 isolated package test). Existing Desktop MCPB:
PASS (2 isolated package tests). Together with the 27 unit/protocol and 21 browser
cases, all 51 tests passed. Real signed-in host acceptance remains NOT RUN.

## Issue #4 — cross-packaging evidence (2026-10-17)

Candidate source commit: `b8136d8583b407d4da3f3e1923aa8c15d333ec7b`.
Plugin: 0.1.3 candidate. Public pin remains
`a9e708331ff9b78886a02d3c30dca67bfafdf2e8` (unchanged).
Builder: Debian GNU/Linux 13 x64, Node 24.19.0, Chromium 151.0.7922.173.
The following documentation-only evidence commit is not a rebuilt candidate.

| Check | Result |
| --- | --- |
| Full `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check` | PASS: 28 unit/protocol + 21 browser cases |
| Linux standalone Code archive | PASS: 1 isolated package test |
| Existing Desktop MCPB | PASS: 2 isolated package tests (builder Node 24.19.0) |
| Four official Node archives / extracted binary and LICENSE / packaged UI hashes / target metadata and MCP command | PASS: static inspection |
| Wrong-target official archive rejected | PASS: Linux archive against Windows pin |
| Signed-in Claude Code, Codex, ChatGPT and Claude Desktop acceptance | NOT RUN |
| Native macOS arm64/x64, Windows x64, WSL installation/browser/storage acceptance | NOT RUN |
| Release and demo video | NOT RUN |

Initial full check: 28 protocol PASS; browser 20 PASS / 1 FAIL while package builds
were also replacing generated output. The failing case timed out waiting for the
harness to connect, before editing assertions. After all packaging completed,
the unchanged full check passed 28 + 21 with no retries or skips. Concurrent
build/output replacement is a possible cause, not a proven diagnosis. Do not run
packaging concurrently with browser checks or another package build.

Archive SHA-256 (all generated from the candidate source commit above):

```text
b0255b78a9b4d3aaab5947df1832ae1dc2071098967510c21ee8a9ae280b3dd8  editor-platform-claude-0.1.3.mcpb
0102190badb7e77e30e32f696bde00a67d9e60047020054a282032042f04627a  editor-platform-claude-code-0.1.3-darwin-arm64.tar.gz
eef22ef90991f4d8f80e199feece2ba88af9a8d0eaf9149c3cbffa5ef17da740  editor-platform-claude-code-0.1.3-darwin-x64.tar.gz
e3c1addf748d32c984f751e894a20bb965d5fb6a01894e3f9a5438a8b74b1607  editor-platform-claude-code-0.1.3-linux-x64.tar.gz
cc1b5bf2bfd9f3af893a7cd40e6cd119e43bb1292509002fbfce756dfe8dbcd2  editor-platform-claude-code-0.1.3-win32-x64.tar.gz
```

The files remain local under `release/`, outside Git. macOS/Windows archives were
inspected on Linux and never executed. No supported-OS or LP availability claim
follows from this packaging evidence. Issue #4 remains open for native acceptance.
No automatic CI, performance measurement, private-source copying or release was
introduced. OS browser openers and human-only model/browser boundaries are unchanged.

## PR #13 review follow-up — 2026-10-17

Final rebuilt candidate/test source commit:
`13e4a348e330cc96e6fe49512dff131d3257949c`. The subsequent commit records
evidence only and was not used to rebuild these archives. These hashes supersede
the earlier b8136d8 candidates; included documentation changes the source closure.
Builder: Debian 13 x64, Node 24.19.0, Chromium 151.0.7922.173.

- Full check: PASS, 28 protocol/unit + 21 browser, no retries/skips.
- Linux isolated Code package: PASS, 1 test. Desktop package: PASS, 2 tests.
- Four-target offline inspection: PASS, 4 tests. Reproduce using
  `EDITOR_NODE_ARCHIVE_DIR=/path/to/official-archives npm run test:platform-packages`.
  Verifies official checksum, rejects wrong-target archives before extraction,
  checks allowed runtime files, binary/LICENSE bytes, archive checksum, manifest,
  target metadata and bundled source/runtime/UI hashes. No target binary executes.
- Model-only discovery and direct-call refusal now cover all eight human-only
  save/apply/reject/selection tools, both source stdio and installed Code package.
- Windows explorer.exe exit semantics, native OS paths/browser/storage/update
  retention and authenticated Codex/Claude acceptance: NOT RUN.

```text
0ca3dab1a118b576db027bd18480505583569b2ed23d311cd6ff42bb2dbf080e  editor-platform-claude-0.1.3.mcpb
106ebdc8cd87200fd198f60777a00fe364581f23e0a5b87a9a29afbfc9d5200d  editor-platform-claude-code-0.1.3-darwin-arm64.tar.gz
77611be4eb5660c0974e85febf698a186e736c807a34560d43749f536800551b  editor-platform-claude-code-0.1.3-darwin-x64.tar.gz
205129a51d8a8d48d884f4c391bd5318580488d3b52f24667e67637854126d19  editor-platform-claude-code-0.1.3-linux-x64.tar.gz
584628aac01b36ca7a23b448b32bcbc8fddd1c63b7ab979b3b340a540bc4ea3e  editor-platform-claude-code-0.1.3-win32-x64.tar.gz
```

### PR #13 source-closure review follow-up

The offline inspector now reads every `source/FILES.sha256` entry, verifies its
actual bytes and count, compares both packaged source/build upstream pins with the
reviewed checkout pin, verifies the public export-manifest digest and every public
file declared by that manifest. Only regular files/directories are extracted;
foreign runtimes are never executed. Five focused tests PASS, including missing
source, modified source, wrong expected pin, and public-source tampering even when
the outer source manifest/hash is recomputed. All four existing 13e4a34 candidate
archives PASS the stronger inspection. These are verifier changes; no new archive
hash or rebuild of those candidates is claimed. The integration build will include
the updated verifier and record its own source commit and hashes.

## Public upstream synchronization — 2026-10-17

Pinned public commit `97ea905745101b3814d14febcc0c31b157023c71`. All 1,749
export-manifest file SHA-256 entries matched the public checkout. The submodule
is unmodified; no private source was used. `upstream.json` records tree and manifest
hash. The workspace lockfile was updated for the new public packages; `npm ci`
succeeded using only this checkout and public npm dependencies.

Debian 13 x64 / Node 24.19.0 / Chromium 151.0.7922.173:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check` PASS
(27 protocol/unit + 21 browser cases). Native macOS/Windows and all signed-in host
acceptance: NOT RUN. This base change does not enable Animation or references.
The public snapshot contains AnimationControlledSurface, rectangle Player v1 and
Data/Graph ReferenceResolver adapters; Host adapters remain separate work.
No performance measurement, automatic Actions, Release or merge was performed.

## Animation adapter — issue #6 (2026-10-17)

Depends on the public-sync base (PR #14), not packaging PR #13 or Codex PR #12.
Uses only public AnimationControlledSurface, schema-1 validation, commands and
rectangle Player. Plugin Host owns the existing session, pending-input flush,
revision-checked toolbar save and proposal review; internal Surface save is
disabled. Player preparation is generation-checked and disposed on scope teardown.
External assets, nested compositions, prototype migration and movie/GIF export
are rejected or unavailable. Native JSON remains the export contract.

Debian 13 x64, Node 24.19.0, Chromium 151.0.7922.173: full check PASS
(29 protocol/unit, 23 browser). New checks include native create/save/propose/
reject/apply/export/restart, unsupported schema/assets rejection, real Player
play/pause, buffered manual edit followed immediately by Save, Undo/Redo, preview/
reject/apply and reload. The actual Animation screenshot was visually inspected.
These are local harness checks. Signed-in host acceptance, native Windows/macOS,
mobile, Release and demo recording remain NOT RUN. No performance measurement.

Animation package checkpoint: source commit `d6308b4` (subsequent evidence-only
commit not rebuilt). Linux Code isolated package PASS (1), Desktop MCPB PASS (2),
Node 24.19.0 on Debian 13 x64. Generated files remain outside Git:

```text
5b4b85b5cb78f2bd9f6dadc22687900d8db783b37d023e8879b9b795ff40d82f  editor-platform-claude-0.1.3.mcpb
61c05d29e4ab72f33adac7be0b38c11c37f63c83995d0f34fe7a11407587542c  editor-platform-claude-code-0.1.3-linux-x64.tar.gz
```

## Data/Graph → Slide references — issue #7 (2026-10-17)

Depends only on the public-sync base PR #14. This sibling of Animation PR #17
does not enable Animation; combine both capability declarations when integrating.
Shared MCP registration changes preserve the single-owner authentication and
model-only human-tool boundary. OAuth authorization hooks are separate work and
must be retained during integration.

Candidate source and package-test commit:
`dd9c8d6aba1887b0ea42c953d0275ef68275f5bd`. Public pin:
`97ea905745101b3814d14febcc0c31b157023c71`. Debian 13 x64, Node 24.19.0,
Chromium 151.0.7922.173. Subsequent screenshot-wait/evidence changes do not change
runtime code and were not used to rebuild the archives below.

| Check | Result |
| --- | --- |
| Public pin, strict types, Editor/browser/harness builds | PASS |
| Unit/protocol | PASS, 28 tests |
| Full Chromium browser run | PASS, 22 cases, no retries/skips |
| Linux isolated Code package | PASS, 1 test, including Data/Graph snapshot creation |
| Existing Desktop MCPB | PASS, 2 tests, including a reviewed embedded Data image |
| Updated screenshot-wait reference browser case | PASS, 1 additional run; rendered table inspected |
| Signed-in hosts; native macOS/Windows; mobile; Release | NOT RUN |

Protocol checks cover fixed/follow capture, no implicit destination writes, pending
source proposals excluded, issued-version tamper rejection even with recomputed
hash, concurrent issuance, restart retention, Graph Profile dependency and missing
target/source refusal. The browser edits saved Data, observes the real Slide
projection update, verifies the destination stayed at its old saved revision,
explicitly saves the captured source revision and observes deletion diagnostics.

Initial browser checks found a real export bug: EditorSession.content returns a
caller-owned copy, so object-identity comparison falsely rejected unchanged draft
exports. The Host now uses public sameLocalRevision. An interrupted runner left
a test listener; it was stopped before rerunning. A subsequent reference assertion
expected grouped digits, while the native table correctly displayed raw 987654;
the assertion now matches native output. The final full check passed unchanged
application behavior and all existing browser cases.

```text
7225aaa2d538b27ba288ab441d88d359edb8cc935e355c5bc2b78e386eb7de76  editor-platform-claude-0.1.3.mcpb
05a9c7da5a666a90c71669b67bcb56b666843aa53c86a2db533c8e66920c3df4  editor-platform-claude-code-0.1.3-linux-x64.tar.gz
```

These generated files remain local. Document/Design/Whiteboard destinations are
not wired in this increment. Back up the complete data directory, including
reference-snapshots; fixed history has no automatic cleanup. No private source,
CI activation, performance measurement, Release or merge was performed.

### PR #18 listing/SDK review follow-up

Reference source discovery now internally pages the existing inventory contract,
including pages containing no Data/Graph sources. Regression checks PASS with an
empty workspace, a full 1000-item non-source page, a Data source after that page,
and termination at the final empty page. No source-count truncation is applied.
An actual SDK 1.x client also passes a complete ReferenceSource (including target)
to read_reference_source successfully: schema.shape normalization strips the extra
field before the strict handler. The reported target/strict-schema candidate is
not an unresolved bug; no runtime workaround was added.


## Nine-PR integration validation

See [the consolidated candidate record](integration-candidate.md) for all adopted
PR heads, exact tested source commit, OS, PASS/FAIL/NOT RUN results and artifact
SHA-256 values. This successor combines the independent records above; it does not
retroactively certify them or constitute actual-host acceptance or a Release.

## 0.1.4 — WSL acceptance C5/C7 fixes (2026-10-19)

The 0.1.3 WSL actual-host run recorded two FAILs; both are fixed in source:

- C5: a browser reload or tab close silently discarded an unsaved Editor draft.
  The Editor now registers a `beforeunload` guard while the draft, a pending
  native input or an IME composition is unsaved. The skill no longer tells users
  to reload the browser to see a proposal; proposals appear in the open Editor.
- C7: '保存内容を出力' downloaded only the first slide's SVG. A multi-slide deck
  now downloads one `<deckId>-svg.zip` with every slide as `<n>-<slideId>.svg`;
  a single-slide deck still downloads one SVG.

`tests/browser/claude-code.spec.ts` checks the single SVG, the three-entry zip
contents and that a reload with an unsaved table edit raises `beforeunload` and,
when dismissed, keeps the draft without saving. With the guard removed this
check fails. `npm run check`: 63 server tests and 26 browser cases PASS.
The fixes still need a fresh actual-host re-run of C5/C7; this is not acceptance.

## 0.1.5 — React preview state reset fix (2026-10-19)

The 0.1.3 WSL actual-host R1 run and the 0.1.4 packaged-candidate automation
(L1-R1, see [candidate-acceptance.md](candidate-acceptance.md)) recorded the same
FAIL: in Interact mode a Counter returned to its initial value within a few
seconds without any user action.

Cause: `EditorSession.content` returns a fresh copy on every read. The Editor
re-renders on each 4 s saved-state poll, so the React UI surface received new
`content` each time and re-rendered the isolated preview, discarding runtime
state. The Editor now keeps one draft copy per session revision, and one preview
per proposal ID, so unrelated re-renders pass the same content.

`tests/browser/react-preview.spec.ts` now waits two poll cycles after a click
and expects the count to persist; it fails without the fix. `npm run check`:
63 server tests and 26 browser cases PASS.

Actual-host acceptance of the exact 0.1.5 linux-x64 archive (sha256
`7a717178…a417`) on Windows 11 / WSL2 Ubuntu 22.04, Claude Code 2.1.303 and
Edge 155: C1–C7, OS1 and R1 PASS; see the
[release record](release-candidates/dc4b1c3-claude-code-0.1.5.md). C1/OS1 were
manual, C2/C4/C6 also passed L2 actual-host automation, and C3/C5 rely on L1.
The first-use MCP permission dialog was not observed (auto mode) and no demo
video was recorded. The owner approved the Release of this archive with 2.1.303
as the accepted minimum host version.
