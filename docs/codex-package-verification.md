# Bundled Codex guide verification — 2026-10-17

Base: `4fee5fc39c6c31b76f3db58b4d85c7f575957b83`.
Tested/package source: `6ca4acf41c3edf1ad4207018634072f695586b67`, clean checkout.
Evidence-only commits after this source do not change these artifacts.
Public upstream remains `97ea905745101b3814d14febcc0c31b157023c71`.
Environment: Debian 13 x64, Node 24.19.0, Chromium 151.0.7922.173.

## Scope and results

The existing model-only stdio and protected browser runtime is reused. No second
installer, settings writer or provider integration is required by this change.
Code archives now expose `CODEX.md` at the root and a directly accessible bundled
`plugins/editor-platform/docs/codex.md`. The guide's relative security link resolves
inside the package. Claude-specific variable expansion is not assumed in Codex.
Code packaging and offline inspections change; Desktop/OAuth/runtime/vendor,
package.json, README and lockfiles do not.

| Check | Result |
| --- | --- |
| Final `npm run check`: public pin, React source hash, typecheck/builds | PASS |
| Final unit/protocol suite | PASS, 51 tests |
| Final Chromium suite | PASS, 26 cases, no case retries/skips |
| Revised Document keyboard-selection case, targeted repetitions | PASS, 3/3; bounded selection precondition retries before typing |
| Four Code targets: exact bundled guide, entry/security links, official Node, source/public manifest, runtime/UI hashes and template identity | PASS, 4 offline tests; no foreign executable run |
| Linux Code standalone startup, model-only boundary, save and relocation/restart | PASS, 1 package harness test |
| Read-only review of implementation/test diff | No blocking finding |
| Actual Codex registration, signed-in tool execution, native OS browser and Codex UI acceptance | NOT RUN |
| Native Windows/macOS, Release, permanent registration, video | NOT RUN |

## Development failures retained

The first full check passed 51 unit and 25 browser cases but failed the existing
Document `fill()` case: new text was inserted before the old heading. The unchanged
case then passed 3/3 targeted runs. Static source inspection found a possible race
between Playwright's direct DOM selection and the native editor's deferred focus
selection restoration; this is a diagnosis hypothesis, not a claimed product fix.

The test now selects the heading through keyboard events, verifies the exact
selection before typing, and keeps exact saved-text verification. An intermediate
additional assertion compared untouched blocks to their sparse input JSON and
failed on normal materialization of layout/default fields; it now checks original
paragraph IDs/text. One immediate key sequence selected an incomplete heading;
the test now retries only selection until the exact precondition holds (bounded
at 3 seconds), before any text/save. It never retries saving to mask a bad result.
No runtime or vendor changes were made. Final checks above passed without skipped
cases; the earlier failures are not relabelled as successes.

Logs are retained in ignored `work/verification-codex-guide/`, including
`initial-check.log`, `unchanged-targeted-repeat.log`, `normalized-shape-check.log`,
`keyboard-selection-failure.log`, `final-check.log`, `final-targeted.log`,
per-target build logs and package inspection/runtime logs.

## Candidate artifacts, not published

Each `release/editor-platform-claude-code-0.1.3-<target>.tar.gz` has a checksum and
NOT RUN-only acceptance template. All report the clean source commit above and
source manifest SHA-256
`36c07c11e8360178d3c97c9053efceddf2e572ebe35a58c47cf37e7384c8a28d`.

| Target | Bytes | SHA-256 |
| --- | ---: | --- |
| `darwin-arm64` | 46664558 | `8b2e1843f8de31277bdaae4739af54e42c5a3fcd8ad933b087d4358ef457f40e` |
| `darwin-x64` | 47874685 | `7508701b6e02ec7d525a26ef5ca276565a7c9fbb0024b2cd04893bb7941264a4` |
| `linux-x64` | 51903963 | `bebeaa82d698b14112b32c16debcfcc5912c92b462f00d23b41add845a555913` |
| `win32-x64` | 42283156 | `383b75de1de396021863cf679be19692e68e7c355975d4182b4c114551e0bc76` |

Existing user React acceptance on `e32df6a` does not need an update for this guide
packaging change. These harness results do not accept Codex or close #10/#4.
No device operation, persistent registration, account/cost, Release, automatic CI
or general performance measurement occurred. Older artifacts remain unchanged.
