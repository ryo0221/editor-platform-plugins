# Verification — 2026-10-16

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
