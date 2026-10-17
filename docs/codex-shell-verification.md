# Codex shell route verification

This records the existing Codex session using shell commands to operate a
prebuilt Editor package. It is not native Codex MCP registration or a nested
Codex CLI session. No login, credential change, public deployment, Release or
LP update was performed.

## Fixed candidates

Initial route proof used main `0c17336a125659dda85af90153c9b84e651679ae`,
Linux archive SHA-256
`6a2b2e3844b7fd6624528bb9be91eade135d8083f3a1bd8bb6353cdf7063fe6a`.
That archive did not contain a shell client: the reviewer supplied one separately.
It established the model/server/browser workflow, not a complete bundled shell
installation route.

The new package source is **`30037a4f2ba818de44187a5817e0abe7db515124`**, clean.
Plugin version: 0.1.3 candidate. Public upstream:
`97ea905745101b3814d14febcc0c31b157023c71`.
This documentation-only successor does not rebuild or recertify the archives.

| Target | Bytes | Archive SHA-256 |
| --- | ---: | --- |
| Linux x64 | 52052035 | `904e0a114e6765ab36e00c1213dee38e8fa451af1a5131d1547501185d9cdd73` |
| macOS arm64 | 46811759 | `f9197ec3c6b79a6485c4d0acb7dc9cb23e056e5f37d29e262bac7fe382269e94` |
| macOS x64 | 48037754 | `b00ad1d3c838199547d2bef71b8fce0097731a5c2497fca50eac470c8a70791f` |
| Windows x64 | 42442992 | `8910f42d8d73f7f1ac92c95c9f980994ea339ba4e9b9fa48533cb48a51a1b0fa` |

Each archive has checksum and acceptance-template sidecars. Foreign targets were
inspected on Linux; their binaries were not executed and their native acceptance
remains NOT RUN.

## Results on 2026-10-17

Environment: Debian 13 x64, bundled official Node 24.19.0, Chromium
151.0.7922.173 headless, reviewer Playwright 1.63.0. The installed Codex CLI's
version is not used to identify the current Codex host. All content was fictional.

| Check | Result and scope |
| --- | --- |
| Whole repository check | PASS, 51 unit/protocol and 26 Chromium cases, no skips or case retries |
| Isolated Linux archive tests | PASS, 2 tests; empty PATH, bundled Node, usage, early JSON/EOF and empty EOF, malformed input recovery, hidden human-only tools refused, clean EOF and retained data on restart |
| Four-target static inspection | PASS, 4 tests; official runtime hashes, complete source closure, bundled client hash, exact guide copies, wrong-target refusal; no target execution |
| Codex shell client startup and creation | PASS; current Codex directs the packaged client, gets the native guide and creates a Document without runtime clone/npm/build |
| Real Editor input and Save | PASS; automated native textbox input, explicit browser Save; MCP reread returns changed heading and revision 2 |
| Proposal preview and Reject | PASS; browser preview visible, Reject leaves saved heading and revision 2 unchanged |
| Proposal preview and Apply | PASS; browser preview visible, Apply changes heading and advances to revision 3 |
| Stale proposal | PASS; old base revision returns CONFLICT; saved content remains unchanged |
| Export and reload | PASS; real browser Markdown download contains the accepted heading; page reload reopens saved content |
| Bundled-client stop and restart | PASS; EOF stops its server; new client lists and reads the identical complete native content at revision 3; browser reopens it |
| Normal desktop GUI association | NOT RUN; custom headless handoff is not system xdg-open acceptance |
| Native Codex tool registration, new Codex conversation, version upgrade | NOT RUN; separate from this existing-session shell workflow |
| Native Windows/macOS, actual Claude Code, Claude Desktop, ChatGPT | NOT RUN |
| Short/Long video and public distribution | NOT RUN; screenshots and operation transcripts retained, no video acceptance claim |

## Dependency and safety boundary

The archive now supplies the model-side JSON Lines client and its bundled SDK.
It launches the unchanged packaged server with the archive's Node executable.
The persistent reviewer control adapter only delivers input lines to that shipped
client; it does not implement replacement model tools. An ordinary shell session
can send the same lines without that adapter; see [the bundled procedure](codex-shell.md).

The browser operator still used external Playwright/Chromium and a custom local
opener. They are not shipped in the archive and are not prerequisites for the
model client itself. Therefore this record does not certify an archive-only
headless-browser setup or ordinary GUI launch. Save/apply/reject were real browser
DOM actions, not direct calls over the model MCP connection.

Only the trusted browser operator consumed the capability through a private file
(mode 0600 in a mode-0700 directory). No URL/token was returned to the model
client, included in screenshots or public evidence, or copied from host credentials.
The browser removed the fragment after navigation; the temporary handoff was
removed after shutdown. The common “Claude Code” UI label does not establish the
identity of the operating host.

Public evidence deliberately omits local paths and artifact IDs. Maintainer-held
records retain the package identity, sanitized protocol responses, browser action
results, real screenshots, Markdown contents and restart comparison. No human
manual-operation claim is inferred from browser automation.

## Failures resolved before the final candidate

- Read-only review found that subscribing to stdin after asynchronous MCP startup
  could lose early input or EOF. Subscription now precedes startup; both early
  input and empty EOF pass in the isolated archive test.
- The first packaged client failed because a bundled SDK dependency used CommonJS
  require. The packager now supplies the same createRequire bridge as the existing
  server. Usage and both archive tests pass on the final candidate.
- The first four-target inspection stopped because the test input directory used
  shortened archive filenames. Supplying the expected official names resolved
  the input error without changing source, artifacts, hashes or assertions.

## Remaining release decision

The functional shell/browser path has evidence; native MCP registration is not
required for the clarified user workflow. The bundled procedure removes the
external model-client dependency. The headless operator dependency remains
explicit, and normal desktop browser association still needs acceptance.

Limit any LP wording to Linux shell/browser preview with those prerequisites.
Keep availability preparing unless the owner accepts that precise scope and
supplies a distributable candidate and guide URL. This PR does not close #10,
change LP state or publish a Release. Its Codex evidence is not #5 Claude Code
footage and must not be relabeled as such.
