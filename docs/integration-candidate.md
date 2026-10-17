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
HTML in both package formats and checks its hash in each OS archive. OAuth modes
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
