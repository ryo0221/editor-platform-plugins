# Integrated Codex Linux candidate — 2026-10-18

**Ready for owner review within the limited scope; not published.** Supersedes the
pre-integration `dcca8f9` candidate. Base main is
`ea3e03a38fd33d8b51c4515805e23404a7f431f7`, including adopted PR #38.
ChatGPT remains unsupported; #9 is closed/not_planned, #10 closed/completed.
No separate hosting or server setup is required by the Codex route.

Exact clean packaged source: `12b415924ccc7692902560334ecb5938e18bd255`.
The subsequent evidence-only commit does not change this artifact identity.

- File: `editor-platform-claude-code-0.1.3-linux-x64.tar.gz`
- SHA-256: `0b3de4063cf2053ba78f9962c3222c9c732c2e49d4450d1f48b8ea1353c3e8e7`
- [Machine-readable acceptance record](12b4159-codex-linux.json)
- [User guide](../codex-shell.md) / [publication checklist](../codex-release.md)

## Same-artifact results

| Check | Result |
| --- | --- |
| Final archive package checks | PASS, 2 |
| Final archive real Chromium checks | PASS, 2: direct stdio and bundled shell; 3 slides, native edit/Undo/Redo/Save/reread, reject/apply, stale proposal refusal, SVG/native export and restart; old capability rejected |
| Final archive source/notice closure | PASS: 1,947 source entries; 1,749 public manifest entries; runtime/UI/client hashes; 538 notice inventory entries, 545 text files, 30 exact fontkit notice files; included ChatGPT policy checked |
| Existing Codex session, final archive | PASS: native Document guide/create, real browser edit/save, Codex reread, preview/reject/apply, Markdown export, browser reload, server restart/discovery and clean shutdown |
| Full local check | PASS: 53 unit/protocol + 26 browser at `2137508`; no runtime/test/dependency changes since that run; documentation/policy-only successors rebuilt and package-tested above |
| Native Linux GUI association, Windows/macOS/WSL | NOT RUN |
| Native Codex MCP registration, actual Claude Code | NOT RUN; not prerequisites for this route |
| Release/tag/LP/public upload | NOT RUN |

Debian 13 x64, Node 24.19.0 bundled, Chromium 151.0.7922.173 headless,
external Playwright 1.63.0. Current Codex host build ID is not exposed; no installed
CLI version is substituted for it. The package tests use fresh HOME/data, minimal
PATH, source-free runtime extraction and a separate browser operator. This is not
a new OS image or ordinary desktop acceptance. Browser edits/review were automated
with fictional data, not represented as human manual testing. Final screenshots
were inspected. The model channel never received the browser capability; private
handoff files were deleted after shutdown. No account login or model-provider API
was added to the package. The existing shared “Claude Code” UI label is not host
identity. The old `30037a4` video was not used as evidence for these bytes.

## Concrete publication proposal

Release title: **Editor Platform 0.1.3 — Codex Linux x64 shell/browser preview**.
Suggested tag for owner decision: `codex-linux-v0.1.3-preview.1` at the exact tested
source above. Neither tag nor Release has been created. Publish these retained
bytes, not a fresh build with a different hash. If a different release commit is
required, rebuild/retest and replace the record before publication.

Attach the archive, adjacent SHA-256, Codex shell guide, this release note and
machine-readable acceptance record. The archive contains public corresponding
source, AGPL license, Node license, third-party notices and security instructions.
The existing Claude-oriented filename is shared runtime packaging, not a Claude
installation prerequisite. Start at archive-root `CODEX.md` → shell route.

Scope: user's Linux x64 environment (Debian 13 exercised), existing Codex with a
persistent shell process, and a separately prepared browser operator. No provider
server or separate server setup, native MCP registration or Claude login. The
bundled client owns its temporary loopback runtime. Browser automation is not
bundled, and normal GUI/one-click headless support is not claimed. Users without
that operator need an additional accepted local browser path before being told
this package alone is sufficient.

Remaining owner actions: review/merge draft PR #39; approve the exact artifact,
limited public-preview wording and tag/release proposal; authorize publication.
There is no request for credentials, accounts, server provisioning or purchases.
Broader graphical-desktop support requires an actual native GUI acceptance run.
Claude-specific issue gates and ChatGPT deployment do not block this scoped
Codex release. Automatic CI/performance work and Claude authentication stay stopped.
