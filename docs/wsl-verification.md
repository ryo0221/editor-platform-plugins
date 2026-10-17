# WSL opener candidate verification — 2026-10-17

Implementation and package source commit: `e67490ed0debafade60155133faaa4dcf93ac986`.
Base main: `f6238396866fb860890a552215f38637d751c4bb`.
Public upstream stays `97ea905745101b3814d14febcc0c31b157023c71`.
Later evidence-only commits do not change this candidate's source provenance.

Environment: Debian 13 x64, Node 24.19.0, Chromium 151.0.7922.173.
This environment is not WSL. No real Windows/macOS host was operated.

| Check | Result |
| --- | --- |
| Public pin, React source hash, typecheck and production/harness builds | PASS |
| Unit/protocol (`npm run check`) | PASS, 48 tests |
| Chromium (`npm run check`) | PASS, 26 cases, no retries/skips |
| WSL detection, native opener selection, missing/failed/denied/signalled/timed-out opener, strict URL rejection and redaction | PASS, included in 7 new tests using mocks |
| WSL-labelled argv handoff via Linux executable fixture | PASS; not real wslview or Windows |
| Linux isolated Code archive startup, model-only visibility, persistence and relocation/restart | PASS, 1 package test |
| Archive checksum, complete packaged source and public export manifest | PASS |
| Actual WSL1/WSL2 detection, wslview/explorer launch/exit semantics, Windows browser and two loopback ports | NOT RUN |
| Native macOS/Windows opener regression | NOT RUN; selection/failure semantics mocked only |
| Signed-in Claude Code, persistent install/update, real browser user acceptance | NOT RUN |

Linux x64 candidate: `release/editor-platform-claude-code-0.1.3-linux-x64.tar.gz`
Size: **51,882,936 bytes**.
SHA-256: `bd8817dea0655b7dd2de1722c7f0bcf72dd0500eb434cf9642ab941f1887cb4d`.
The archive was built with the existing pinned official Node 24.19.0 Linux input.
No other OS candidate was rebuilt for this PR; no Library delivery or Release.
Older cdf02ad Code/Desktop artifacts and their hashes remain unchanged.

Review the [WSL selection and acceptance boundary](wsl.md) before distributing this
candidate. No manual URL fallback, user authentication exposure, environment tool
installation, browser-default change, networking/security configuration change,
automatic CI or performance measurement was introduced. Issue #4 remains open.
