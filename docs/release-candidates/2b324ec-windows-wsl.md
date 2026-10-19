# PR #40 reviewed setup candidate — 2026-10-18

Clean packaged source: `2b324ecb9e9f7104fadb2521ea62b146fea565c2`. Public upstream remains
`97ea905745101b3814d14febcc0c31b157023c71`. This supersedes the 9f75f05 candidates
for PR #40 review; old evidence/archives remain historical, not acceptance of these bytes.
Later evidence-only commits are not packaged source. No Release/tag or user install.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `editor-platform-claude-code-0.1.3-linux-x64.tar.gz` | 52,230,452 | `608f30add973f561561a8e21dd92185852b413d8b9a27522e222b5c723a52740` |
| `editor-platform-claude-code-0.1.3-win32-x64.tar.gz` | 42,627,522 | `48e94a4329e604483d0eac92d5b7386228d046010e051386d48caca54335eda2` |

[Machine-readable results and log hashes](2b324ec-windows-wsl.json).
Local archives are in `release/`; logs in `work/windows-wsl-review/`.

## Review corrections

- Normalize native root/data paths, including trailing separators and dot components;
  staging and previous-install directories use dirname/basename as siblings.
- Always attempt workspace lock release independently of stage cleanup. Preserve
  the original operation error and report cleanup/rollback errors and recovery path.
- Verify recorded SHA-256 for both `server/code.mjs` and `server/codex-setup.mjs`,
  in addition to existing runtime integrity checks. Outer archive checksum remains
  required before extraction/execution; these are integrity checks, not signatures.
- WSL2 checksum, extraction and plan commands use `&&` to stop on failure.
  Windows instructions require ownership checks before changing a same-name entry.

## Final-source validation

All runs below used the final implementation above; no source changes occurred
between runs or during candidate generation. Debian 13 x64 / Node 24.19.0 /
Chromium 151.0.7922.173:

- **PASS:** production build/typecheck and 63 unit/protocol tests, including 10 setup
  cases. Windows and POSIX path algorithms are tested; Linux filesystem lifecycle
  includes trailing separators/dot components. Windows native I/O remains NOT RUN.
- **FAIL:** `npm run check` browser phase: 25 passed, one failed before its test
  body at `browser.newContext` (“Target page, context or browser has been closed”).
  A second unchanged full browser run reproduced the same failure.
- **PASS with environment workaround:** all 26 browser cases (1 + 23 + 1 + 1),
  launching each spec file in a separate Playwright invocation with the same config,
  single-process Chromium and assertions. Shared browser context recreation in
  this cloud mode is the limitation; no test/product code was altered to bypass it.
- **PASS:** final Linux archive lifecycle (1), existing Code package (2), Linux/Windows
  static package integrity/source/guide checks (2), regenerated Desktop package (4).
  Lifecycle uses actual bundled Linux Node/stdio with simulated WSL detection;
  install/update/restart/reread/uninstall all use the same final archive above.
- **PASS:** fault injection covers partial copy, backup rename, replacement rename,
  failed rollback, stage cleanup and lock removal. Original errors survive secondary
  errors, and lock release is attempted after stage cleanup failure. Corrupted and
  truncated entry/setup files are refused before installation writes.
- **PASS:** executing the exact documented WSL command block with a failing checksum
  tool does not invoke mkdir, extraction or bundled Node.

## Remaining acceptance

**NOT RUN:** native Windows app, actual WSL2 CLI/browser routing, and native
installation/update/removal. No cross-version data migration is certified.
Follow [the platform guide](../codex-windows-wsl.md) on each target after approval:
verify this archive hash → plan/install → owned registration → actual browser →
manual edit/Undo/Redo/Save/reread → proposal reject/apply/export → restart/reopen →
update from separate extraction → remove only owned registration → uninstall and
verify data/unrelated settings remain. Record OS/WSL/Codex/browser versions and
per-step PASS/FAIL/NOT RUN against the exact source and archive hash above.
Claude Code native acceptance remains with the user; no authentication was started.
Release, tags, merge, CI activation and user-machine configuration remain unperformed.
