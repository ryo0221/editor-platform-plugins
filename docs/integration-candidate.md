# Five-PR validation candidate

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

Public upstream: `97ea905745101b3814d14febcc0c31b157023c71`.
Conflict resolution retains ten native domains, saved Data/Graph → Slide fixed/follow
references, both NativeSurface Host session/history and reference props, 25 MCP tools,
and exclusion/direct-call refusal of all eight human-only tools on model-only stdio.
Both new browser scenarios and all existing tests are retained. The isolated Code
package test saves Animation and an embedded Slide in one runtime/workspace, updates
the Data source, captures it explicitly, relocates the installation and restarts,
then verifies both persisted artifacts and exports.

Later OAuth (#15/#19), Desktop acceptance documentation (#16) and React changes are
not included in this five-PR checkpoint. They can be integrated on a successor
branch after this baseline is verified, without changing the recorded input heads.
