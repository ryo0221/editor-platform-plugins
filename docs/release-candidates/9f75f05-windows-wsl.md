# Windows app / WSL CLI setup candidate — 2026-10-18

Intended completion targets: **both native Windows Codex app and WSL Codex CLI**.
This implementation is ready for review and native acceptance, not a claim that
those environments have passed. The cloud's inability to execute them is not a
product decision to drop either target. No public release or user installation.

Clean source: `9f75f05c60dd3e714205ed5c28b89f64c7d4919d`, based on main `ce8f543`.
Public upstream: `97ea905745101b3814d14febcc0c31b157023c71`.
Later evidence-only commits are not the source of the archives below.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `editor-platform-claude-code-0.1.3-linux-x64.tar.gz` | 52,224,760 | `ef474a8ad36f1df5da947cdfc543fdd7f1e436beaa6fa8d25e04f9141df40a51` |
| `editor-platform-claude-code-0.1.3-win32-x64.tar.gz` | 42,613,239 | `315a32d817c868765050e87a75f23a53acabf2bd7ee509b8398961062c983c7a` |

[Machine-readable evidence](9f75f05-windows-wsl.json) records OS, pins and log hashes.
The prior Linux preview archive is retained separately; these are new candidates.

## What changed

`server/codex-setup.mjs` is included in both prebuilt Code archives, launched by
bundled Node. It provides read-only plan, fresh install, stable-path update and
owned-install removal. It never edits Codex configuration, calls a provider,
registers a server, changes authentication or deletes user data. Registration
uses the official host UI/CLI, with generated native absolute fields/TOML and a
mandatory dedicated EDITOR_DATA_DIR. Native Windows app does not require installing
a separate Windows CLI merely for its settings.

Setup refuses occupied/unowned install paths, overlapping data/source/install,
symlink paths, wrong-platform or dirty packages, hash mismatches and active/stale
workspace locks. Updating locks the same workspace as the existing runtime and
keeps a previous-version recovery copy. Run it from a separate extracted package;
self-update/self-uninstall is refused. `--stopped` confirms applications are closed;
`--registration-removed` confirms the user removed the one connection before
uninstall. Neither flag performs those host operations for the user.

The common editor/model/browser/store runtime, existing Windows `explorer.exe`
and WSL `wslview`→`explorer.exe` handoff are reused unchanged. Claude Code/Desktop
retain their own launch and data policies. See [channel contracts](../channels.md).

## Validation

Debian 13 x64, Node 24.19.0, Chromium 151.0.7922.173:

- Full check PASS: 57 unit/protocol + 26 browser. Final focused setup cases PASS
  (4), including the added self-uninstall guard after the broader run began.
- Exact Linux archive setup PASS (1): fresh isolated install, actual model-only
  stdio creation, stable-path replacement from the same candidate, saved reread,
  uninstall retaining data. WSL detection is simulated; this is not a WSL machine
  or a cross-version schema-migration certification.
- Existing Code archive regressions PASS (2); existing Desktop archive PASS (4).
- Offline Linux/Windows archive inspection PASS (2): official Node input hashes,
  wrong-target refusal, regular/safe entries, complete source/public pin closure,
  runtime/UI/setup hashes and matching guides. Windows binaries never execute.
- Official Codex CLI 0.159.0-alpha.3 on Linux parsed generated Windows TOML with
  spaces/Japanese/backslashes into exact command, args and environment values.
  Temporary isolated CODEX_HOME only; no auth, model use or user configuration.
- Native Windows app / real WSL CLI / actual OS browser / native update/removal:
  **NOT RUN**. Local opener mocks cannot establish browser connectivity.

## Smallest remaining user acceptance

After approval for the user's machine, follow [the platform guide](../codex-windows-wsl.md):

1. On each target, verify its archive checksum, extract and run `plan` with the
   bundled Node. Inspect the native install/data/connection paths.
2. Quit Codex/Editor, run `install --stopped`, then add exactly one connection in
   Windows app Settings (native Windows agent) or WSL's `codex mcp add`. Do not
   modify unrelated entries or share Windows/WSL config/data/binaries.
3. In a new host session, create fictional Document content, open the real browser,
   edit/Undo/Redo/Save, reread, preview/reject/apply, export and restart/reopen.
4. Back up data, quit both, update from a separately extracted matching candidate,
   check retention and unrelated settings; remove only the connection and run
   uninstall with `--registration-removed`, verifying data remains.

Record actual Codex/OS/WSL/browser versions and per-step PASS/FAIL/NOT RUN tied to
one archive hash. The same candidate can exercise replacement now; a future
version's migration must be tested separately. WSL interop and Windows browser
localhost reachability require the real machine. No external server, domain,
provider hosting, new credentials, Claude login or independent auth system is
requested. Release/tags, automatic CI and Claude authentication remain stopped.
