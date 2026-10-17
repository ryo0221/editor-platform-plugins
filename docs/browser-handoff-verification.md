# Browser handoff and saved-artifact discoverability — 2026-10-17

Base main: `6c92223178e03584831922fa59bc85ffb93c05d8`.
Implementation/package source: `51016de669032a33824da69b53d3c3a72fcb52d3`.
Public upstream remains `97ea905745101b3814d14febcc0c31b157023c71`.
Evidence-only commits after the source commit do not change package provenance.

## Reported user acceptance of the base version

These observations were relayed by the user through the parent reviewer. They are
not execution by the implementation agent, and do not accept this new candidate.
The user built main `6c92223` from source on Linux, checked its checksum, and used
isolated storage with Claude Code `--plugin-dir`. Exact Linux distribution, WSL
version, Claude Code version and the user's build SHA-256 were not supplied.
No official package hash is attributed to that source build.

| Base-version observation | Result |
| --- | --- |
| Claude `/mcp` recognition, Document guide and creation at revision 1 | PASS — user report |
| Browser window opened despite `BROWSER_UNAVAILABLE` | PASS for window opening; FAIL for launcher result — user report |
| Saved inventory contains `動作確認 · Document v1` | PASS — user report; Document was not lost |
| Discovering the associated Open button | FAIL usability — user reported excessive distance from the title |
| Create → browser hand-edit → Save → Claude `read_artifact` | PASS — user report |

The last read returned text `手動保存 456 日本語`, revision **2** (created at **1**),
`updatedAt: 2026-10-17T13:46:35.869Z`, and retained block ID `body_p1`. The user
reported no Japanese character corruption. Other Editors, other hosts, restart,
installation/update and complete issue acceptance are **NOT RUN** in this report.

## Candidate boundary

Explorer exit **1 only** is classified as `launch_unconfirmed`, not as verified
browser success. Exit 0 becomes `launch_requested`. Both report
`browserVerified: false`: process termination cannot prove browser connection or
visible content. Other nonzero codes, permission errors, signals and timeouts
remain errors. The uncertain result tells the model to ask the user to inspect
the window and not automatically retry. Missing-executable-only fallback and
URL/token redaction remain in place. No browser acknowledgement endpoint or new
authentication channel was added.

Claude Code's initial iframe requests the saved inventory. It neither auto-selects
nor creates an artifact. The new-artifact kind selector is explicitly labelled.
Each saved-artifact row groups its title and Open button for assistive technology;
the button stays next to the title, including long wrapped Japanese titles.
Native buttons retain keyboard interaction and unsaved-input disabling.

## Candidate local checks

Environment: Debian 13 x64, Node 24.19.0, npm 11.9.0, Chromium 151.0.7922.173.
This is not WSL or a signed-in Claude Code session. The Chromium tests use the
protocol harness; they are not real-host acceptance or physical mobile testing.

| Check | Result |
| --- | --- |
| `npm run check`: public pin, bundled React source, typecheck and builds | PASS |
| Unit/protocol checks | PASS, 49 tests, no skips |
| Chromium harness | PASS, 26 cases, no retries/skips |
| Explorer 1 uncertainty, 0 request, other failures, redaction, no duplicate retry | PASS, mocked launcher; not native Explorer |
| Initial saved inventory without implicit creation; intended Document opened | PASS, Chromium harness |
| Long Japanese title/button proximity, no row overflow at 1280px and 390px; Tab/Enter opens intended Document | PASS, Chromium viewport simulation |
| Linux Code archive startup, human-only separation, persistence and relocation/restart | PASS, 1 isolated package test |
| Archive checksum, all 1,862 corresponding-source files, 1,749 public-export files and tracked-checkout comparison | PASS |

An initial check found a TypeScript assertion type error in the new test. It was
corrected before the complete successful run recorded above.

Candidate: `release/editor-platform-claude-code-0.1.3-linux-x64.tar.gz`.
Size: **51,894,705 bytes**.
SHA-256: `77a3a521ea3e80e59cfdc5cba68891a8cf7bc763df86ec37017ec7d352d462e0`.
Built with the pinned official Node 24.19.0 Linux archive, SHA-256
`f625d97cd707df4ff96254916fbc5ff014f09c09effe5a1e0ca8f6d41a8789d4`.
No other OS archive was rebuilt. Earlier cdf02ad/e67490e artifacts are retained
unchanged and must not be confused with this candidate.

Local logs are retained outside Git under `work/verification-handoff/`:
`plugins-handoff-check.log`, `plugins-handoff-package.log`,
`plugins-handoff-package-test.log`, and `source-integrity.json`.

Actual WSL/wslview/Explorer behavior, native Windows/macOS, signed-in Claude Code
and other actual hosts for this candidate: **NOT RUN**. The base-version user
report above does not change those statuses. No account, persistent installation,
automatic CI, performance run, Release, Library upload, merge or issue closure was
performed. Issue #4 remains open pending native/actual-host acceptance.
