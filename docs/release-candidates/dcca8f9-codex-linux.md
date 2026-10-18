# Codex Linux review candidate — 2026-10-18

**Not published.** Built on main `e59510b` plus the Codex guide/test changes.
Exact archive source: `dcca8f9341111708277ffeb9637e48d472b76720`, clean.
The later evidence commit is not the packaged source and does not replace its hash.

`editor-platform-claude-code-0.1.3-linux-x64.tar.gz`

SHA-256: `628af73ebb53d0b1da676466753bd99ab1a30854553742bfe391693648798fd0`

[Machine-readable record](dcca8f9-codex-linux.json) includes source/public pins,
size, environment, checks and log hashes. Old `30037a4` proof/video is not reused
as acceptance of these bytes.

## Results

| Check | Result / scope |
| --- | --- |
| Full build/types/local correctness | PASS: 53 unit/protocol + 26 browser at `2137508`; final source adds only the remaining-acceptance documentation correction |
| Exact final Linux archive | PASS: 2 isolated package tests |
| Exact final archive + real Chromium | PASS: 2 routes, direct stdio and bundled shell client; 3-slide native editing, Undo/Redo, save/reread, preview/reject/apply, stale proposal refusal, SVG/native export, restart and old-capability refusal |
| Source and notices | PASS: 1,945 source entries / 1,749 public manifest files, all runtime/UI/client hashes, 538 inventory entries / 545 retained texts, 30 exact matched fontkit notice files |
| Current Codex shell, exact final archive | PASS: guide/create Document, external real-browser edit/Save, Codex reread, preview/reject/apply, Markdown export, browser reload, process restart/discovery, clean EOF shutdown |
| Normal desktop opener / new native Codex registration | NOT RUN |
| Native Windows/macOS/WSL / actual Claude Code | NOT RUN |
| Release/tag/LP publication | NOT RUN; no approval or publication implied |

Environment: Debian 13 x64, bundled Node 24.19.0, Chromium 151.0.7922.173 headless,
external Playwright 1.63.0. The current Codex host build identifier is not exposed;
the separately installed CLI version is not substituted for it. This is the same
existing-session route accepted in #10, not a fresh native registration test.

The archive tests launch with fresh HOME/data, a minimal opener-only PATH, and
remove the extracted source snapshot before runtime startup. They do not create
an OS/network sandbox. The separate Codex Document check uses a reviewer shell
adapter and browser operator outside the archive. Its browser capability stayed
in a private handoff file, never model responses, and was deleted after shutdown.
No human-only operation was sent through its model client. Browser actions were
automated with fictional data and are not reported as manual human acceptance.
The shared UI's existing “Claude Code” label is not host identity.

Initial source inspection failed because its comparison followed HEAD after a
documentation commit rather than the fixed archive source. It passed against the
correct fixed commit, then final `dcca8f9` was rebuilt and all archive checks rerun.
There was no application test failure. The final screenshots were inspected.

## Publication handoff

Proposed release title: **Editor Platform 0.1.3 — Codex Linux x64 shell/browser preview**.
Use [the publication checklist](../codex-release.md) and [installation guide](../codex-shell.md).
The package runs in the user's environment and automatically owns its local
listener; no provider hosting, separate server setup or Claude authentication.
A separately prepared browser operator remains required for the verified headless
route. Ordinary desktop/one-click headless support is not claimed.

PR #38 owns the ChatGPT unsupported-policy update. It was still open when these
bytes were built. **Do not publish this pre-integration candidate** with superseded
ChatGPT documentation. Adopt #38 first, update the Codex branch while retaining
both #9 unsupported and #10 closed, then build/retest a new fixed archive. The
read-only merge check found one textual conflict in `docs/remaining-acceptance.md`;
README and connections merged automatically. No merge was executed here.

After integration and exact-artifact verification, owner approval is needed for
the limited release scope/title/tag and external publication. Claude-specific
#3/#4/#5/#8/#11 gates are not added to Codex publication. No credentials, hosting
setup or additional login are requested from the user for this route.
