# Acceptance-record candidate verification — 2026-10-17

Base main: `e32df6ac57a9f8687665dca8d32524e4384b24e3`.
Tested and packaged source: `ac37863baadce80ef5a1c21d738194086a2db7be`.
All package metadata reports `sourceDirty: false`. Subsequent evidence-only commits
are not attributed to these archives. Public upstream is unchanged at
`97ea905745101b3814d14febcc0c31b157023c71`.

Environment: Debian 13 x64, Node 24.19.0, Chromium 151.0.7922.173.

| Check | Result |
| --- | --- |
| `npm run check`: public pin, React source hash, typecheck/builds | PASS |
| Unit/protocol, including exact archive hash, changed archive, invalid metadata, no local paths and NOT RUN-only template regressions | PASS, 51 tests |
| Chromium harness | PASS, 26 cases, no retries/skips |
| Four Code targets: pinned official Node, wrong-target refusal, archive contents, complete source/public manifest, UI/runtime hashes | PASS, 4 tests; no foreign binary execution |
| Generated template against each exact archive and build-info; actual environment empty; scenarios NOT RUN | PASS, included in all 4 target tests |
| Linux standalone Code startup, persistence, relocation/restart and human-only boundary | PASS, 1 test |
| Desktop MCPB packaging/validation and portable stdio harness | PASS, 2 tests |
| Native Windows/macOS, signed-in Claude Code/Codex/ChatGPT/Desktop on this candidate | NOT RUN |
| Permanent installation, IdP/TLS configuration, signatures, Release, host video | NOT RUN |

Every Code archive has 1,866 corresponding-source files, including all 1,749 public
export entries. Source manifest SHA-256 is the same across all four targets:
`54d210749976822b3f13738b7dce19596200e1d0395c13aba0d1dddff386ac3d`.
The official Node inputs were reused from the previously pinned archives; packaging
verified their committed hashes again. No new runtime download or pin change.

## Local artifacts, not a Release

Version is 0.1.3 candidate. Code filenames are
`editor-platform-claude-code-0.1.3-<target>.tar.gz`; Desktop is
`editor-platform-claude-0.1.3.mcpb`. Each has a `.sha256` sidecar; Code additionally
has `.acceptance-template.json`. All live under this checkout's ignored `release/`.

| Target | Bytes | SHA-256 |
| --- | ---: | --- |
| `darwin-arm64` | 46652162 | `8f40f969546b7f384a552d7a70dcfa86b6f37c3d89f95f3fa66d8b3d5cbb7cef` |
| `darwin-x64` | 47884634 | `cc50631151ff35d65e6f4c793923f0efc6c9fac2d11e0d95c6a3325a6cac529f` |
| `linux-x64` | 51900586 | `bd423cbb444652dc395fca5198c299d0233deeeb27f5c773dc3dee36d58e6258` |
| `win32-x64` | 42282490 | `cc2ecd38367ed1697b48dc2fd1d9b4dbc43cf54e4095b86b5911140b6de0839f` |
| Desktop MCPB | 9038191 | `bbf9dab9f4dd5fbdd8ac2747e0e29be2717311b01b7a58649daf87923065e153` |

The first dependency-install attempt failed because the default npm cache was not
writable. Using `/workspace/.npm-cache` resolved it. No test failure was skipped.
Full check log is retained in `work/verification-acceptance/plugins-acceptance-check.log`;
per-target builds and the package test logs are retained in that same ignored
folder. Prior worktrees' artifacts, user data and runtime/auth code were unchanged.

No automatic CI, general performance measurement, persistent configuration,
account creation, Release publication, Issue closure or main merge was performed.
The [remaining acceptance audit](remaining-acceptance.md) still applies. Existing
PR #24 user observations do not accept this new candidate or fill its empty rows.
