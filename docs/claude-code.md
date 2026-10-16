# Claude Code — initial distribution candidate

**配布準備中 / not released.** This is the Claude Code candidate, not the
Claude Desktop `.mcpb`. No signed-in Claude Code end-to-end acceptance, official
review, supported OS or public release is claimed. Do not enable an LP download
button until the release gates below pass.

## Candidate environment

The current packager produces Linux x64 only, with the build machine's Node binary
and its matching LICENSE/third-party notices included. Runtime use requires no
Git, npm, source build, external Node installation, API key or server command.
Linux requires a graphical desktop, browser, `xdg-open`, and a system compatible
with the bundled Node binary (official Node 24 Linux x64 baseline: glibc 2.28+).
macOS, Windows, WSL, remote SSH, cloud/headless sessions and IDE integrations are
NOT accepted. A server-side browser opened in a remote session is not the user's
local browser. Native graphics/browser compatibility remains a release gate.

Use an existing authenticated Claude Code installation with plugin/MCP permissions
allowed by its organization policy. The official docs describe persistent local
marketplace installation. A tested minimum Claude Code version is **not yet
established**; recording the exact accepted version is mandatory before release.
No plugin registration, independent login, billing or additional AI key is needed.
Claude Code's own authentication, subscription and permission checks still apply.

## Candidate installation (maintainer acceptance, not a published download)

1. Obtain the candidate archive and its `.sha256` from the same reviewed build.
   Check `sha256sum -c <archive>.sha256` before extracting. Extract into a private,
   permanent directory, e.g. `~/Applications/editor-platform-local`. Keep that
   directory: the local marketplace needs its prebuilt files for reinstall/update.
2. In the existing Claude Code terminal session:

   ```text
   /plugin marketplace add /absolute/path/to/editor-platform-local
   /plugin install editor-platform@editor-platform-local
   ```

   Choose **user scope** in the plugin panel and review the plugin/MCP permissions.
   Do not choose `--plugin-dir`: it is a development loading route, not persistent
   installation. Do not add this source repository as a prebuilt marketplace.
3. Restart Claude Code, check `/plugin` and `/mcp`, and invoke
   `/editor-platform:editor-platform` with the desired artifact request.
4. `open_editor` opens a local browser containing the real public upstream Editor.
   Choose Saved artifacts and open the created artifact. Edit, Undo/Redo and Save.
   Ask Claude to read that saved version before proposing another change. Refresh
   the Editor to load a pending proposal, preview and explicitly Apply or Reject.
   External updates preserve an unsaved draft and report a conflict. Explicit
   reload can discard a draft after confirmation; back it up as local JSON first.

The plugin starts a loopback-only server on a free port, stops it when stdio closes,
and opens no public endpoint. Browser access needs a random per-process capability,
passed to the OS browser opener as a URL fragment, then removed from the address
bar. It is stored in that tab's session storage. Do not share that tab or opener
arguments. The capability is never returned to the model or printed in logs.
Every MCP request needs its bearer token; Host and Origin checks apply. Another
local process with access to browser storage/process arguments is trusted within
this single-user machine boundary. This is not a multi-user service.

The Code stdio server omits UI-only save/apply/reject/selection tools altogether;
only the separately authenticated browser connection has them. The AI must never
simulate explicit human approval via browser automation, shell or HTTP.

## Data, updates, removal and backup

The default workspace is `${XDG_DATA_HOME:-~/.local/share}/EditorPlatform/ClaudeCode`
on Linux, outside the extracted marketplace and Claude plugin cache. Saved content,
revisions, proposals and recoverable trash persist across restarts and conversations.
Use one Claude Code process per workspace. A second session fails with an actionable
lock message rather than risking a silent concurrent overwrite.

After closing Claude Code/Editor, copy the **entire** data directory to a private
backup location. Restore the complete directory while both are stopped. It contains
artifact text and pending proposals, so handle it as private data. Delete a stale
`.claude-code.lock` only after confirming all sessions have stopped; never remove a
live process's lock. A crash leaves the lock for conservative manual recovery.

For a candidate update, stop Claude Code, back up data, verify the new archive,
replace the extracted marketplace files, then run:

```text
/plugin marketplace update editor-platform-local
/plugin update editor-platform@editor-platform-local
```

Restart and verify old artifacts reopen. Do not overwrite a live installation.
Rollback by restoring the previous candidate and, if a data migration was introduced,
its corresponding backup. This candidate introduces no data migration.

To uninstall, use `/plugin uninstall editor-platform@editor-platform-local` (matching
the installed scope), then `/plugin marketplace remove editor-platform-local`.
The extracted directory can then be removed. The data directory is deliberately
retained. Permanently removing it is a separate explicit user action after backup;
trash in the Editor is recoverable and does not erase disk content.

Local saving does not mean data is never sent to AI: read/create/propose/export
results pass saved content to Claude Code and its model provider. Unsaved browser
edits are not included until explicit Save. The plugin calls no AI service itself.

## Errors and recovery

- Browser opener fails: restore `xdg-open` and the default graphical browser, then
  retry `open_editor`. Headless/remote sessions are not supported.
- Browser disconnects after Claude Code exit: restart Claude Code and call
  `open_editor` again. The old process's port/capability are intentionally expired.
- Port conflicts: the OS chooses an available loopback port automatically. A bind
  failure is a startup failure, not a reason to open a public bind or remove auth.
- Missing/blocked runtime: check extracted executable permissions, OS/architecture,
  noexec mount policy and bundled Node compatibility. Do not replace it with a
  downloaded script or ask an end user to build sources.
- Workspace locked: close the other Claude Code session. After a crash, stop all
  sessions, back up data, and remove only `.claude-code.lock` before retrying.
- Revision conflict: preserve the unsaved draft as JSON, read the latest saved
  revision and recreate the proposal against it. Do not bypass version checks.
- Install/policy denial: inspect `/plugin` and `/mcp`; retain Claude Code's permission
  boundary and organization policy. This plugin cannot override them.

## Features and release gates

The public pin supports Slide, Document, Design, Whiteboard, Data, Graph, Review,
File and React UI native artifacts. See README for the actual export formats and
limits. No Office export, live executable React preview, cross-artifact sync,
Animation/Video/GIS or collaborative shared Undo is claimed. Undo/Redo resets at
load/save/accepted-proposal boundaries.

Before publishing: record OS, architecture, Claude Code version, plugin version,
upstream commit, artifact SHA-256 and PASS/FAIL/NOT RUN for every issue #1 scenario.
Test fresh persistent installation and restart, three rich slides, manual edits,
Undo/Redo, Save, saved-content reread, preview/reject/apply, stale proposals/saves,
restart/new-conversation discovery, update retention and actual exported files.
Record a short fictional-data demonstration in the actual host. A local harness
video is not actual-host evidence. Publish archive, checksum, installation guide,
release notes and notices together only after acceptance.

LP handoff remains: status `preparing`; version `0.1.3 candidate`; download URL,
supported environments and actual-host demo URL `not available`. LP source is a
separate repository; no LP download link is enabled by this change.

Maintainers build from public sources with initialized submodules and npm ci:

```sh
EDITOR_NODE_LICENSE=/absolute/path/to/matching-node-LICENSE npm run package:claude-code
```

This runs public-source verification, builds the real UI/browser bridge, bundles
server dependencies, includes the current Linux x64 Node binary and license,
public corresponding source and third-party notices, and emits a local marketplace
archive plus SHA-256 under `release/`. Review the runtime provenance before release.
Do not infer OS acceptance from successful packaging.

Official references checked 2026-10-16:

- https://code.claude.com/docs/en/plugins/manifest-reference
- https://code.claude.com/docs/en/plugins/install
