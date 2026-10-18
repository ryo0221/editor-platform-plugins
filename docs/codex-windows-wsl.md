# Windows Codex app and WSL Codex CLI installation candidate

These are the two intended completion targets, not certified environments yet.
Native Windows and WSL acceptance is **NOT RUN**. Linux cloud tests do not make
either target unsupported and do not certify either one. The earlier Linux shell
preview is separate evidence, not completion of these targets.

The package runs in your own environment. Codex launches the bundled Node/stdio
runtime; it owns the temporary loopback Editor connection. No separately operated
server, domain, provider account, Claude login or extra model API key is needed.
Do not use the source-only `.mcp.codex.json` (`node`/`tsx`) for this installation.

## Official connection contract (checked 2026-10-18)

[Official MCP documentation](https://developers.openai.com/codex/mcp) describes
local STDIO command/args/env, desktop Settings → MCP servers → Add server → STDIO
→ Save → Restart, and `codex mcp add NAME --env KEY=VALUE -- COMMAND ARGS` for CLI.
The legacy documentation URLs currently redirect to ChatGPT Learn pages describing
the local Codex host. This does not change this product's unsupported remote
ChatGPT route into a supported one.

[Official Windows documentation](https://developers.openai.com/codex/app/windows)
distinguishes the native Windows agent from WSL and states that Windows uses
`%USERPROFILE%\.codex`, whereas WSL CLI uses Linux `~/.codex` by default. Agent
execution environment is separate from the app's integrated terminal choice.
This procedure does **not** sync homes, change CODEX_HOME, migrate authentication,
change sandbox policy or overwrite existing Codex configuration.

| Target | Package/runtime | Install default | Data default | Browser handoff |
| --- | --- | --- | --- | --- |
| Windows app, native Windows agent, x64 | `win32-x64`; `runtime/node.exe` | `%LOCALAPPDATA%\Programs\EditorPlatform\CodexApp` | `%LOCALAPPDATA%\EditorPlatform\CodexApp` | existing `explorer.exe` association |
| WSL Codex CLI, Linux x64 | `linux-x64`; `runtime/node` | `${XDG_DATA_HOME:-$HOME/.local/share}/EditorPlatform/installs/CodexWsl` | `${XDG_DATA_HOME:-$HOME/.local/share}/EditorPlatform/CodexWsl` | existing `wslview`, then `explorer.exe` only if absent |

These commands do not configure the Windows app running its agent in WSL; use the
matching host environment intentionally. Do not feed Windows paths/binaries to
Linux Codex or Linux paths/binaries to a native Windows host. Do not share data
with ClaudeCode/Desktop or another concurrent host. Keep WSL installation/data on
its Linux filesystem. No WSL integration/firewall/browser policy is changed.

## 1. Verify, extract, and inspect the plan

Obtain the correct archive and checksum from the reviewed delivery location.
There is no public release for these candidates yet. Use a new extraction folder;
keep the original archive/checksum. No npm, source build or external Node needed.

Windows PowerShell, in the downloaded archive directory:

```powershell
$archive = 'editor-platform-claude-code-0.1.3-win32-x64.tar.gz'
$expected = ((Get-Content "$archive.sha256" -Raw).Trim() -split '\s+')[0]
if ((Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Checksum mismatch' }
New-Item -ItemType Directory -Path '.\editor-platform-new' -ErrorAction Stop
 tar -xzf $archive -C '.\editor-platform-new'
if ($LASTEXITCODE -ne 0) { throw 'Extraction failed' }
Set-Location '.\editor-platform-new\plugins\editor-platform'
& '.\runtime\node.exe' '.\server\codex-setup.mjs' plan --channel windows-app
```

WSL terminal, using its Linux home rather than a Windows shell:

```sh
sha256sum -c editor-platform-claude-code-0.1.3-linux-x64.tar.gz.sha256
mkdir editor-platform-new
tar -xzf editor-platform-claude-code-0.1.3-linux-x64.tar.gz -C editor-platform-new
cd editor-platform-new/plugins/editor-platform
./runtime/node ./server/codex-setup.mjs plan --channel wsl-cli
```

Stop on any error. Plan prints native absolute command/argument/data paths and a
TOML snippet; it writes nothing. `--root ABS` and `--data-dir ABS` override paths,
but they must be separate, non-nested, local directories. Retain exactly the same
options for update/uninstall. Symlinked paths and wrong-platform packages are
refused. Verify the published outer checksum first; internal hashes are integrity
checks, not a publisher signature.

## 2. Install and add one connection

Quit Codex and close the Editor first. From the new extracted package run:

```powershell
& '.\runtime\node.exe' '.\server\codex-setup.mjs' install --channel windows-app --stopped
```

```sh
./runtime/node ./server/codex-setup.mjs install --channel wsl-cli --stopped
```

The tool refuses an existing install destination. It copies the common runtime,
source and notices into the stable install location and emits connection fields.
It never reads/writes Codex config, secrets or other channel installations.

**Windows app:** reopen the app, choose its native Windows agent, open Settings →
MCP servers → Add server, select STDIO and enter the emitted `name`, `command`,
`args` and `EDITOR_DATA_DIR` environment value. Command is the absolute `node.exe`
path; the one argument is the absolute installed `server/code.mjs` path. Preserve
spaces as part of each field, not embedded shell quote characters. Save and
Restart. No Windows Codex CLI is required just to configure the app. If the UI
version does not expose environment values, use the emitted TOML in the app's
actual config file, preserving all other contents, then restart. Do not put the
TOML in a project file unless you intend project-scoped configuration.

**WSL CLI:** inspect `codex mcp list` for `editor-platform-wsl` first. If that name
already exists, inspect it and resolve ownership; do not overwrite an unrelated
entry. Using the exact printed absolute paths, run the official form:

```sh
codex mcp add editor-platform-wsl --env 'EDITOR_DATA_DIR=/absolute/Linux/data/path' -- '/absolute/Linux/install/runtime/node' '/absolute/Linux/install/server/code.mjs'
```

Replace placeholders from the plan; do not run them literally. Start a new Codex
session and use `/mcp` to check connection. Do not register the shell client:
Codex itself speaks MCP to `code.mjs`. There is no OAuth login for this local MCP.
If an existing CODEX_HOME override/project/managed setting selects a different
config, use that host's actual settings; do not reset or share authentication.

## 3. Open, edit, save and review

Ask Codex to get the Document guide, create fictional content using its native
schema, and call `open_editor`. Confirm the actual browser window. Opener status
is not proof of visibility. Explorer exit 1 is unconfirmed; inspect before retry,
and never paste a browser capability URL into chat. WSL→Windows browser localhost
reachability and interop require real-machine acceptance. Do not open firewall
ports, expose the listener or change authentication to bypass failure.

Choose the saved artifact in the browser, edit, Undo/Redo, Save, then ask Codex to
reread it. Ask for a changed proposal, preview/reject once and preview/apply once.
Only explicit browser actions save manual edits or accept proposals. Ask Codex to
read the result and export. Quit/restart Codex, discover the artifact and reopen.
Unsaved browser edits are not sent to the model; saved reads are shared with the
existing Codex host/provider. The common UI currently labels its connection
“Claude Code”; this historical label is not evidence of the actual host.

## Update, rollback and uninstall

Back up the complete data directory; quit both Codex and Editor. Extract and
verify the new matching-platform archive separately. From that new extraction,
run the same setup command with `update` instead of `install`, retaining channel,
root and data options and `--stopped`. It verifies ownership and package hashes,
locks the workspace using the existing runtime lock, stages a new copy and
replaces the stable install directory. Your MCP paths and saved data do not change.
A `.previous-<id>` sibling retains the prior installation; its exact path is printed.
No previous copy is automatically deleted. Restart Codex and check retained data.

If replacement fails, setup restores the prior directory when possible and reports
failure; do not report an update as successful. For an application regression,
quit both applications and move the new install aside, then move the printed
previous directory back to the original install path. Preserve the data backup;
no data-schema downgrade/migration is certified by this candidate. Delete old
installation copies only after the updated version passes your acceptance.

For uninstall, first remove **only** the emitted connection name through app
Settings, or `codex mcp remove editor-platform-wsl` in WSL after checking ownership.
Quit Codex/Editor, then run setup from a retained extracted package with
`uninstall --channel ... --stopped --registration-removed` and your original path
options. The owned install is removed; all data and unrelated configuration stay.
Previous-version sibling directories can be removed separately. Data deletion is
never part of this tool. It refuses active/stale workspace locks; follow the
existing conservative lock recovery only after confirming no writer remains.

## Minimum native acceptance still needed

After approval to install/register on the user's machine, run steps 1–3 once on
**each** target, then update from a separately extracted candidate and uninstall
while checking data remains. Record archive SHA-256, source commit, OS/WSL version,
Codex app/CLI version, browser, actual config/data paths privately, and PASS/FAIL/
NOT RUN for install/registration, visible browser, edits/Undo/Save, proposal review,
export, restart, update, unrelated-settings preservation and uninstall/data retention.
The current cloud cannot run the native app or prove WSL Windows-browser routing.
Those are test-environment limits, not a product decision to drop the targets.
