# Codex CLI candidate installation and acceptance

Windows app and WSL CLI are now the completion targets. See the
[platform-specific setup candidate](codex-windows-wsl.md); their native acceptance
is pending. This historical native-registration guide is not a declaration that
those products are unsupported.

For the existing-session route without native MCP registration, use
[Codex through a shell and browser](codex-shell.md). Its limited cloud evidence
does not certify the native CLI route below.

Status: **native CLI registration preparing / NOT RUN in an authenticated actual host**. This guide is
an acceptance procedure for reviewers with a prebuilt candidate, not a public
availability claim. There is no Release download yet. The existing
`.mcp.codex.json` / compatibility manifest is a source-development configuration;
`${PLUGIN_ROOT}` expansion and automatic loading by Codex are not established.

## Finding this guide in the archive

After extracting the prebuilt Code candidate, open `CODEX.md` at the archive root.
It links to `plugins/editor-platform/docs/codex.md` (this guide); its security link
resolves to the bundled `plugins/editor-platform/SECURITY.md`. There is no need to
browse the corresponding-source directory or install Claude Code to read it.
The archive also contains the executable in `plugins/editor-platform/runtime/`
and entry point `plugins/editor-platform/server/code.mjs`. Use `runtime/node` on
Linux/macOS and `runtime/node.exe` on Windows, with the matching target archive.
This identifies files, not native Windows/macOS installation acceptance.

Do not load the archive's Claude `.mcp.json` as Codex configuration or assume that
Codex expands `${CLAUDE_PLUGIN_ROOT}` / `${PLUGIN_ROOT}`. The explicit MCP command
below uses absolute paths and is the documented candidate route. No automatic
registration or changes to Codex settings occur by extracting the archive.

## Route and package

Use the prebuilt Claude Code marketplace candidate's portable runtime directly as
a stdio MCP server. No Claude Code installation, source clone, npm, build, external
Node or model API key is required for this route. It intentionally uses the
existing model-only server and protected local-browser Editor. It does not depend
on Codex rendering MCP Apps inside chat, nor claim that capability. The Claude
plugin skill is not automatically installed by this manual MCP registration.

The CLI syntax below was checked with local `codex-cli 0.159.0-alpha.3`
(`codex mcp add --help`, `codex mcp remove --help`, `codex mcp list --help`) on
Debian 13 x64, 2026-10-17. This is syntax evidence, not a minimum accepted version
or authenticated tool/browser acceptance. Codex Desktop and web are NOT RUN.

## Reviewer procedure (Linux candidate)

Obtain the candidate archive and its `.sha256` sidecar together from the reviewer.
Record the source commit, public upstream commit, archive SHA-256, plugin version,
Codex version, OS and architecture before testing. Check the checksum and extract
the archive into a durable directory owned by you. For the current Linux candidate:

```sh
sha256sum -c editor-platform-claude-code-0.1.3-linux-x64.tar.gz.sha256
mkdir -p "$HOME/Applications/editor-platform-candidate"
tar -xzf editor-platform-claude-code-0.1.3-linux-x64.tar.gz -C "$HOME/Applications/editor-platform-candidate"
```

After approving the persistent MCP configuration, register the bundled executable
and entry point using absolute paths. Use a dedicated absolute data directory to
keep Codex artifacts separate from the existing Claude Code default workspace:

```sh
codex mcp add editor-platform --env "EDITOR_DATA_DIR=$HOME/.local/share/EditorPlatform/Codex" -- "$HOME/Applications/editor-platform-candidate/plugins/editor-platform/runtime/node" "$HOME/Applications/editor-platform-candidate/plugins/editor-platform/server/code.mjs"
codex mcp list
```

Start a fresh Codex session. Respect its tool, sandbox and organization permissions;
if loopback listening, process launch or the graphical browser is denied, record
FAIL and the permission boundary. Do not disable authentication or expose a public
port to make the test pass. Headless and remote desktop routing is unaccepted.
Windows/macOS instructions require their respective candidate and native acceptance;
the commands above are not Windows instructions.

Ask Codex to call `get_editor_guide`, create a fictional artifact with native
content, then call `open_editor`. The request uses the local OS opener;
`launch_requested` and `launch_unconfirmed` both have `browserVerified: false`.
Ask the user to inspect the existing window; do not automatically retry. Neither
status proves visible content, and the tool response contains no capability URL. Manually Save and
review proposals in that browser. Ask Codex to `read_artifact` / `read_deck` after
Save or selection changes; selection is not automatically pushed to the model.
The model's stdio channel must neither list nor execute human-only save/apply/
reject tools. Never work around this by connecting Codex to the browser's token.

The server does not call an AI provider. Saved content returned by read/create/
propose/export tools reaches Codex and its provider. Unsaved manual edits remain
in the browser until Save. Data and pending proposals persist outside the package;
one process may own a workspace at a time. See [the shared security boundary](../SECURITY.md).

Stop Codex and the Editor before updating; back up the complete Codex data directory,
verify the replacement archive, replace the installation, restart and check saved
artifacts. Do not run Claude Code against the same data directory concurrently.
Unregister with `codex mcp remove editor-platform`; data is retained. Removing the
archive directory and deleting saved data are separate explicit user actions.

## Actual-host acceptance record

For each tested candidate, record:

- Plugin source commit and version, public upstream commit, archive filename/SHA-256.
- OS/version/architecture, Codex version, browser version, date and tester.
- PASS / FAIL / NOT RUN per scenario, evidence location and any error or denial.

| Scenario | Current result |
| --- | --- |
| Fresh approved persistent registration; fresh signed-in Codex session | NOT RUN |
| Guide invocation and rich native creation by the actual model | NOT RUN |
| Real OS browser launch and real Editor display | NOT RUN |
| Manual edit, Undo/Redo, explicit Save, model reread | NOT RUN |
| Changed proposal preview, reject, apply; stale save/proposal rejection | NOT RUN |
| Human-only tools absent/refused on the model connection | NOT RUN in Codex; covered by separate protocol tests |
| Export file contents, restart/new conversation discovery | NOT RUN |
| Candidate update, data retention, uninstall/reinstall | NOT RUN |

The rows above describe native CLI registration only. Issue #10 was closed on
2026-10-17 for the separately accepted [Linux shell/browser route](codex-shell.md);
native registration is not a prerequisite for that route. Local harness tests do
not make native registration PASS. Public distribution and LP publication remain
separate owner decisions. No account creation, persistent registration or sign-in
was performed while preparing this guide.
