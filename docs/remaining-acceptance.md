# Remaining acceptance audit — 2026-10-17

Audited main: `e32df6ac57a9f8687665dca8d32524e4384b24e3` (PR #24).
At that historical audit, the open issue set was #3, #4, #5, #8, #9, #10, #11,
with no assignees or open PRs. Issue #10 subsequently closed on 2026-10-17 for the
limited Linux x64 Codex shell/browser route described below. Prior implementations are merged; do not recreate them.
This is a scope/evidence audit, not a change to issue criteria or an approval.

2026-10-18 policy update: #9 below is unsupported, not an infrastructure approval
queue. Other rows retain their historical audit context.

## Conditions already evidenced and what remains

| Issue | Existing evidence / satisfied subset | Remaining implementation or preparation | Actual-host / approval gate |
| --- | --- | --- | --- |
| [#3](https://github.com/ryo0221/editor-platform-plugins/issues/3) | Portable runtime, marketplace, persistent-install/backup/removal guide, security boundaries and 7 scenarios exist. PR #24 local checks: 49 unit/protocol, 26 browser, 1 Linux package PASS. | Exact candidate provenance and per-scenario record handoff are being automated here; final Release notes/LP values must use the accepted artifact. | New permanent install and all #1 C1–C7 in real Claude Code, exact artifact hash and tested/minimum-version decision, explicit Release approval/publication. Temporary source-build use is not C1. |
| [#4](https://github.com/ryo0221/editor-platform-plugins/issues/4) | PR #13 implements pinned official Node archives for Linux x64, macOS arm64/x64 and Windows x64; integration has 4 offline package checks PASS. PRs #23/#24 fix WSL handoff. | Refresh all four archive inspections for the reviewed opener revision; supply separate records. | Native OS launch/default storage and all scenarios per accepted OS. WSL is not native Windows/macOS. No OS becomes supported solely from cross-packaging. |
| [#5](https://github.com/ryo0221/editor-platform-plugins/issues/5) | Actual-host video boundary is documented. | No real recording supplied; Short/Long editing and subtitle work can proceed after footage arrives. Record exact artifact identity and review privacy before publishing. | Real Claude Code recording covering request/edit/Undo/Save/reject/apply/reopen; same accepted artifact as #3 Release. No harness substitution. |
| [#8](https://github.com/ryo0221/editor-platform-plugins/issues/8) | PR #20 bundles fixed Panel/Text/Counter implementations and React 19.1.1, reviewed separate-origin preview and TSX export. Real Surface compose/interact/save/export works in Chromium harness; README and limitations updated. | No known missing implementation within the approved fixed-catalog scope. Additional arbitrary-code support is not implied. | Focused real Claude Code compose/preview/export check remains NOT RUN. Document success does not cover React. |
| [#9](https://github.com/ryo0221/editor-platform-plugins/issues/9) — closed/not_planned | Existing HTTPS/OAuth code and local verification evidence retained; real IdP/TLS/ChatGPT NOT RUN. | **Unsupported under the current product policy.** The server-dependent route is not adopted. Neither provider nor user is asked to provision a server/domain/IdP; deployment preparation is stopped. No local ChatGPT replacement is claimed. | Closed as not_planned on 2026-10-18; do not frame it as awaiting the user’s hosting approval or as ChatGPT availability. Code is not removed and no Release is authorized. |
| [#10](https://github.com/ryo0221/editor-platform-plugins/issues/10) — closed | PR #30 and its integration accepted the existing-Codex → bundled shell client → real Editor/browser route on Linux x64, with a separate browser operator. [Scoped evidence](codex-shell-verification.md). | [Linux publication preparation](codex-release.md): freeze and validate a current archive, supply download/guide/checksum and obtain publication approval. No separate server setup or second installer. | Native MCP registration and Claude authentication are not prerequisites. Ordinary GUI launch, other OS environments and one-click headless operation remain unaccepted. Closure does not imply public Release availability. |
| [#11](https://github.com/ryo0221/editor-platform-plugins/issues/11) | MCPB with notices/source; PR #16 supplies Windows/macOS installation/sandbox/persistence acceptance matrix. 2 portable Desktop tests PASS at integration. | Signing is not implemented because publisher/certificate/key/verification decisions are pending. | Actual Desktop on Windows/macOS plus signing requirement/method and preview/formal status decision. A checksum is not a signature. |

Evidence sources: [integration record](integration-candidate.md),
[PR #24 local checks](browser-handoff-verification.md), [React boundary](react-preview.md),
[historical OAuth implementation](../integrations/chatgpt/README.md),
[direct authorization](../integrations/chatgpt/tool-auth.md), [Codex](codex.md),
[Desktop acceptance](claude-desktop-acceptance.md).
Historical documents identify their own commits; their NOT RUN statements are
not silently overwritten by later observations.

## Limited user report, not whole-scenario acceptance

The [approved public PR #24 comment](https://github.com/ryo0221/editor-platform-plugins/pull/24#issuecomment-6234847785)
confirms retained Document data, adjacent Open button, visible browser and the
`launch_unconfirmed`/no-automatic-retry guidance by user report. This does not
prove automated browser detection, full update/install C1/C6, React, other hosts,
native Windows/macOS or the whole release gate. No private artifact data or host
identifiers need to be republished to state that boundary.

## Work allocation without overlap

- Current implementation: package provenance + empty acceptance templates,
  offline four-target inspection; `scripts/acceptance-record.mjs`, packager,
  package tests and these documents. No editor/vendor/auth implementation changes.
- Parent/reviewer: select the accepted artifact and approve publishing/signing/
  deployment decisions. Keep the current single-owner and trusted React boundaries.
- Host tester: one exact-artifact C1–C7 run; add focused React R1 in that session.
  Record actual operations once and cite them across #3/#4/#8 where applicable.
- Video work: record approved fictional scenario against that same artifact; later
  editing can be independent of package code, but #5 cannot close before #3 identity
  is fixed. Codex/Desktop tests are separate hosts, not delegated to Linux harnesses.

Do not ask the user to repeat Document retention or button-position checks already
reported. The next short functional check is React R1; the release gate separately
requires an approved fresh persistent installation. Use the generated template to
avoid asking them to transcribe commit/hash metadata. Account creation, OAuth
configuration, costs, persistent install, release publication and CI remain approval
boundaries. General performance work remains on hold. No issue closes in this audit.
