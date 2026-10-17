# Consolidated validation candidate

This is a validation-only integration branch. It does not change main, publish a
Release, approve an OS or close an issue. Original PRs remain independently reviewable.

Base main: `b093793ab3bc3aec8ef7755966be9852472376aa`.

| PR | Adopted head |
| --- | --- |
| #12 Codex procedure | ebf7843bc887caa1b5d5c9fb22e449ce46389caf |
| #13 packaging and complete source verification | 2260ed6d2832ce6f5d4497af90d7df9dd1848af4 |
| #14 public pin | b7dd4c255f7b2f8d9c1c3d347dc112712b536a9b |
| #17 Animation | 87253a23627fc67d22f8cdc319049f86ea60ecda |
| #18 references and listing review fix | 051a59011f43f0b37b012449bd8dc42faf99bc8a |
| #15 OAuth transport | fabf031972583369690fa56f9f4191dcaf6e83ec |
| #16 Desktop acceptance | 2c6f5fc097ad9a13e9927845e9f4a5cc36108571 |
| #19 OAuth tool authorization | 1757d1d5f3fe7f44e0c9b157f177211403a94f8a |
| #20 fixed React preview | 1294ee7206d803323eaeac8c354ad562e4337b67 |

Public upstream: `97ea905745101b3814d14febcc0c31b157023c71`.
Conflict resolution retains ten native domains, saved Data/Graph → Slide fixed/follow
references, both NativeSurface Host session/history and reference props, 25 MCP tools,
and exclusion/direct-call refusal of all eight human-only tools on model-only stdio.
Both new browser scenarios and all existing tests are retained. The isolated Code
package test saves Animation and an embedded Slide in one runtime/workspace, updates
the Data source, captures it explicitly, relocates the installation and restarts,
then verifies both persisted artifacts and exports.

The five-PR checkpoint is `511f369aa286a7fc3b50ced8da002b6e5a36cab5`.
This successor includes all nine heads above. Integration retains the React preview
HTML in every Code archive and checks its hash for each OS target. Desktop
retains native React data; it does not start the Code-only preview listener. OAuth modes
remain separate and optional; default model-only stdio retains all eight exclusions.
React is a fixed trusted catalog, not an arbitrary-code sandbox.

## Actual-host acceptance still required

All real Claude Code, Codex, ChatGPT and Claude Desktop acceptance is NOT RUN.
Native Windows/macOS runtime, opener, installation, persistence and upgrade checks
are NOT RUN. Linux package harnesses do not replace these checks. OAuth live TLS,
identity provider and sign-in are NOT RUN. Desktop signing/provider status requires
a decision. Release publication and host video must use the same accepted candidate.

After approval, use a prebuilt package in an existing signed-in test host, record
commit, artifact SHA-256, OS and host version, then create a fake-data artifact,
manually edit/undo/save, review a proposal, restart and verify persistence/export.
Follow the OS and host-specific acceptance documents for installation and removal.
Record PASS/FAIL/NOT RUN per step. No issue with remaining acceptance conditions
may be closed. No release, main merge, device installation or persistent auth setup
was performed by this integration branch.

## Consolidated local verification — 2026-10-17

Tested and packaged source commit: `468c50fc5070fc5f5e22b5c3462c9a3c6f27712a`.
Subsequent changes to this record are evidence only; archives retain that source.
Environment: Debian 13 x64, Node 24.19.0, Chromium 151.0.7922.173.
Chromium used the existing harness `--no-sandbox` setting; this is not OS isolation
or actual application acceptance. No retries or skipped cases were used.

| Verification | Result |
| --- | --- |
| Public pin, React implementation hash, typecheck, production/browser/harness builds | PASS |
| Unit/protocol (`npm run check`) | PASS, 41 tests |
| Chromium (`npm run check`) | PASS, 26 cases |
| OAuth gateway (`npm test --prefix integrations/chatgpt`) | PASS, 8 tests |
| OAuth real local MCP smoke | PASS, 1 test |
| Direct tool authorization (`integrations/chatgpt/tool-auth.test.mjs`) | PASS, 7 tests |
| Linux relocated Code archive, combined Animation/references and model-only exclusions | PASS, 1 test |
| Desktop portable MCPB/stdio harness | PASS, 2 tests |
| Four OS archives: official binaries, wrong-target refusal, safe paths, complete source and public manifest, UI/runtime hashes | PASS, 4 tests; foreign binaries not executed |
| Actual hosts, native macOS/Windows, IdP/TLS/sign-in, signing, Release/video | NOT RUN |

The five-PR checkpoint `511f369` separately passed 37 unit/protocol tests,
24 browser cases, 1 Code package test, 2 Desktop tests and 4 OS archive tests.
Its archives are superseded for this integration review by the candidates below.

All four Code archives have source manifest SHA-256
`2dd81617f803e05659020d08b205932715605c34eacf1600194113b76cbb7a79`
and React preview HTML SHA-256
`bd6507e39ef9bc121679523386e67e0c294795d81b80af51850158bc54fedd30`.

### Local candidate artifacts (not a published Release)

| File in `release/` | SHA-256 |
| --- | --- |
| `editor-platform-claude-0.1.3.mcpb` | `dadb7c4717fc23d846cd2177fc54039fe3d00793c54d561ad67a8fc22192d808` |
| `editor-platform-claude-code-0.1.3-darwin-arm64.tar.gz` | `5d9eef13334055bdbea22df657f4d4fd5741c771ae8203526dc41098bf7fdf2e` |
| `editor-platform-claude-code-0.1.3-darwin-x64.tar.gz` | `d61d5b2ce0ad175c8ca5e5a189b0781d191b585c016fd01c2dd4bdf713e85c01` |
| `editor-platform-claude-code-0.1.3-linux-x64.tar.gz` | `ad87ed81fae3ca87c836c9e430d8d3733d6252807625d93c57fceecbf3e77269` |
| `editor-platform-claude-code-0.1.3-win32-x64.tar.gz` | `1503f6c8fa1a1f513c50735d9d44ed5b76ad184107074c512b88bd4dba13a754` |

Local logs are retained under `work/verification-468c50f/` in the integration
checkout. Each package carries its own corresponding public source and hashes.
No actual-host result is inferred from these local tests. Issue #3 Release and #5
videos must be produced from the same later accepted candidate.
