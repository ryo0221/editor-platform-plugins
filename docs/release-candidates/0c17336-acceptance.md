# Distribution candidate acceptance — 2026-10-17

This is local distribution evidence for issues #3/#4, not an accepted Claude Code
release. Built sequentially from clean main
`0c17336a125659dda85af90153c9b84e651679ae`, public upstream
`97ea905745101b3814d14febcc0c31b157023c71`. All four records have
`sourceDirty: false`. The exact filenames, bytes, hashes, runtime provenance,
source-manifest identity and empty host templates are indexed in
[the inventory](0c17336-inventory.json). Archives remain local under `release/`;
there is no public asset URL. This document/test was added **after** building:
these archive hashes describe that clean main, not this PR's later commit.
Any rebuild (including #10's shell client or these source documents) gets a new
identity and must not inherit an old artifact's acceptance record automatically.

## Executed evidence

Environment: Linux x64, kernel 6.18.55, existing Chromium 151.0.7922.173 on Debian
13; package runtime is pinned official Node 24.19.0. No other host/OS was executed.
Official archives were downloaded as build inputs and checked against committed
SHA-256 pins; no runtime was installed. `node` fetch could not use the environment
proxy; HTTPS curl fetched the same pinned URLs successfully. No authentication,
account, persistent host registration or system browser configuration changed.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Four sequential builds | PASS, 4/4 | Existing package command, clean source, target-specific official runtime |
| Offline platform inspection | PASS, 4/4 | `tests/claude-code/platform-packages.test.mjs`: official/input/output checksums, source manifests, regular-file/path closure, runtime/LICENSE bytes, wrong-target refusal, MCP commands, bundled Codex/security guide links and empty host records; foreign binaries never executed |
| Existing Linux archive protocol test | PASS, 1/1 | Ten domains/export, model omission of human-only tools, Unicode/space path, isolated PATH without external npm/Node, moved install and retained workspace |
| New Linux archive + Chromium scenario | PASS, 1/1 | `tests/claude-code/browser-package.test.mjs`, exact Linux hash from inventory; uses packaged Node/server/UI, no test-host substitution |
| Project check | PASS, 51 unit/protocol + 26 browser | `npm run check`; separate from host acceptance |
| Native macOS arm64/x64, Windows x64, WSL | NOT RUN | Native OS browser opener/default directories/installation and signed-in host are unavailable here |
| Actual Claude Code / accepted minimum version | NOT RUN / unset | Shell MCP client is not Claude Code; no login/installation was attempted |

The new browser scenario creates three fictional rich native slides via stdio,
opens the extracted UI in Chromium, verifies chart/table rendering, edits the
canvas title, commits text with Ctrl/Cmd+Enter, exercises Undo and Redo, drags an
image, explicitly Saves, and reads persisted title/layout/table content at v2.
It previews/rejects one proposal without changing canonical data, previews/applies
another at v3, inspects a downloaded SVG and native JSON, and checks the stdio
export includes all three slides. After terminating the process, the old endpoint
stops responding. A fresh process rejects the old token (401), retains the saved
content, and shows v3/title again in the actual browser. No capability URL is logged.
The screenshot is `work/distribution-acceptance/archive-browser.png` (fictional data).
The UI's static “Claude Code” banner identifies the product route, not the client
used in this test. Playwright performs the authorized isolated acceptance actions;
it does not certify a human's approval of any real work.

The OS opener is a capture stub: this verifies the archive-to-browser handoff
format, not graphical OS launching. First test-authoring attempts used Escape
(cancel) / Tab (does not commit the native canvas buffer) and incorrectly expected
SVG output to be JSON; assertions were corrected to the actual native commit and
separate SVG/native JSON flows. No product code was changed to obtain a pass.

Reproduce on the exact candidate, using already installed dependencies/browser:

```sh
EDITOR_NODE_ARCHIVE_DIR=/absolute/path/to/official-archives npm run test:platform-packages
npm run test:claude-code-package
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium node --test tests/claude-code/browser-package.test.mjs
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check
```

The new test needs the local Linux archive and matching sidecar (optionally set
`EDITOR_CODE_ARCHIVE`), extracts into a disposable Unicode/space path and creates
its own temporary workspace. It never uses an existing personal workspace.
Logs for this run are under `work/distribution-acceptance/`: `build-*.log`,
`platform.log`, `package.log`, `browser.log`, `check.log`. Generated artifacts/logs
are not committed. The retained test and inventory allow a reviewer to repeat the
checks; the hashes are an inventory, not a signature or reproducible-build promise.

## Bundled dependencies and guides

The packager enforces no unbundled non-builtin server imports. Runtime use needs
no external Node/npm/Git. Archive inspection confirms only Node and its LICENSE
in `runtime/`, source manifest coverage, complete public source, source lockfiles,
`INSTALL.md`, `CODEX.md` → bundled `docs/codex.md`, and the resolved security link.
The current candidate has the Codex guide, **not** the pending #10 shell-client
addition. That work is owned separately and was not modified here.

Each candidate has 538 attribution metadata entries, including deliberately
retained build dependencies. **21 entries have no copied root-level license text**;
the inventory names them. This is a concrete packaging follow-up before publication,
not proof that 21 distributed runtime libraries lack licenses: some may use README
notices, parent-package licenses or be build-only. Trace those entries against the
bundled runtime/UI dependency sets and retain applicable text or document why an
entry is metadata-only. Do not describe this structural archive test as a complete
third-party license audit. The packager was left unchanged to avoid overlapping
#10's concurrent packaging work.

## What ordinary shell/browser work establishes

| Scenario | Established here | What still needs Claude Code or native OS |
| --- | --- | --- |
| C1 | Portable extracted runtime, non-ASCII/space paths and server startup | Approved fresh persistent marketplace install, permissions, restart and plugin discovery in the actual host |
| C2 | Tool guide → three rich native slides and actual UI rendering | Claude Code generates the requested content through its registered tools |
| C3 | Native title/layout edit, Undo/Redo and explicit Save on the archive | Cite this exact-artifact operation; actual-host session linkage remains to be recorded, not a reason to repeat unrelated already-reported edits |
| C4 | Saved reread and preview/reject/apply preserve exact revisions/content | Actual conversational reread and proposal handoff |
| C5 | Existing regression suite covers stale saves/proposals | No new archive UI competing-save test in this run; actual-host interaction remains NOT RUN |
| C6 | New process/capability and retained content in browser | New Claude Code conversation/discovery; real plugin update retention (same-build process restart is not an update) |
| C7 | Actual downloaded SVG and JSON contents, all-three-slide MCP export | Actual-host export request/returned content; other claimed formats cite existing tests rather than pretend all were opened here |
| OS1 | Linux packaged runtime executes; browser UI works | Native opener/default storage, permissions, host install on each target; Linux/WSL cannot accept native macOS/Windows |

Do not fill a whole C row PASS from its partial ordinary-operation evidence.
The generated actual-host templates remain entirely NOT RUN. One approved session
per candidate/OS can combine the missing host steps with #5's real recording and
#8's focused React check, citing this evidence to avoid unnecessary repetition.

## Conditions before close

For #3: resolve applicable license-text omissions; freeze the final reviewed
candidate after pending packaging work; retain archive/checksum/host record;
complete fresh approved Claude Code C1–C7 with actual OS/host/browser versions and
accepted-minimum-version decision; obtain approval and publish Release assets,
notes and guide; then supply real LP URLs. No public Release or issue closure was
performed here. User's already-reported data/button behavior need not be repeated.

For #4: keep separate exact-artifact native records for macOS arm64, macOS x64 and
Windows x64 (and WSL if claimed), including extraction permissions, actual opener,
default storage outside installation, installation/restart/update and C1–C7.
An unsupported/untested target stays a candidate; do not enable its LP download
or claim it supported. Native environments and signed-in hosts are unavailable in
this cloud environment. These actions are **not run**, not denied or pending tool
approval. Costs/accounts/installations/publication were not attempted.
