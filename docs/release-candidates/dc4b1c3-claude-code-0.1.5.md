# Editor Platform for Claude Code 0.1.5 — Linux x64 (WSL2)

Release approved by the owner on 2026-10-19 for this exact archive. Source commit
`dc4b1c3ee7bba49138fc89b30371349ad9d66cda` (clean); public upstream
`97ea905745101b3814d14febcc0c31b157023c71`.

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `editor-platform-claude-code-0.1.5-linux-x64.tar.gz` | 52,241,110 | `7a717178f31fab74e242c685b23d6bccb9af90294ad0319af0d9c2191d37a417` |

[Completed acceptance record](dc4b1c3-claude-code-0.1.5-acceptance.json).

## Accepted scope

- Windows 11 / WSL2 Ubuntu 22.04 (x86_64, glibc 2.35), Editor opened in the
  Windows default browser (Microsoft Edge 155) through `explorer.exe`.
- Claude Code **2.1.303** (accepted minimum host version), terminal session,
  local-marketplace plugin installed in **user scope**.

Native Linux desktops, macOS, Windows-native Claude Code, remote SSH,
cloud/headless sessions and IDE integrations are not accepted. The archive is
unsigned; SHA-256 identifies the file, not the publisher.

## What it provides

Create and edit Slide, Document, Design, Whiteboard, Data, Graph, Review, File,
React UI and Animation artifacts with the public upstream Editors in a local
browser: native edits, local Undo/Redo, explicit Save, and proposal preview,
Reject and Apply. Claude rereads saved revisions; it cannot call the browser's
save/apply/reject tools. The plugin calls no AI service itself and needs no
separate Node/npm/Git install, API key or server. Data stays in
`~/.local/share/EditorPlatform/ClaudeCode`, outside the extracted plugin.

Exports: native JSON, Slide/Design/Whiteboard SVG (a multi-slide deck downloads
one ZIP of every slide), Document Markdown, Data CSV and registered React UI TSX.
No Office export, arbitrary executable React components, Video/GIS adapters or
collaborative shared Undo. Local Undo resets at save/load/accepted-proposal
boundaries.

Changes since the 0.1.3 candidate: an unsaved Editor draft is guarded on reload
and tab close (0.1.4); a multi-slide SVG export contains every slide (0.1.4);
React preview keeps its runtime state across saved-state polls (0.1.5).

## Install

Verify, extract into a permanent private directory, then in Claude Code:

```sh
sha256sum -c editor-platform-claude-code-0.1.5-linux-x64.tar.gz.sha256
mkdir -p ~/Applications/editor-platform-local
tar xzf editor-platform-claude-code-0.1.5-linux-x64.tar.gz -C ~/Applications/editor-platform-local
```

```text
/plugin marketplace add /absolute/path/to/editor-platform-local
/plugin install editor-platform@editor-platform-local
```

Choose user scope, restart Claude Code, and check `/plugin` and `/mcp`. Backup,
update, removal and recovery are in the attached `claude-code.md`. The
`INSTALL.md` inside the archive was frozen before acceptance and still says
"配布準備中 / not released"; the attached guide supersedes its status lines.

## Evidence and known gaps

All C1–C7, OS1 and R1 rows PASS on these bytes. C1 (fresh user-scope install,
restart, `/plugin`, `/mcp`, first skill run) and OS1 were run by hand. C2/C4/C6
also passed the actual-host L2 automation (`claude -p`). C3, C5 and the C4
Reject/Apply steps rely on the L1 packaged-candidate automation in headless
Chromium 153 on the same WSL host, accepted by the owner; they were not repeated
by hand in Edge on 0.1.5.

- The first-use permission dialog for MCP tools was not observed: the C1 session
  ran in Claude Code auto mode.
- No actual-host demo video has been recorded.
- No other OS, browser or Claude Code version has been tested.
