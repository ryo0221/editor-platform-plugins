---
name: editor-platform
description: Create editable slides, documents, designs, whiteboards, data and graphs with Open Editor Platform, open the real local Editor, and propose changes for human review.
---

Use the editor-platform MCP tools for editable artifacts. The plugin starts and
stops its own local connection. Do not run npm, build sources, edit plugin
configuration or start a public server for the user. Do not request an extra AI
API key or service registration. Claude Code authentication and permission checks
still apply.

1. Call `list_editors` to discover the installed capabilities and limits.
2. Call `get_editor_guide` for the chosen kind. Use its validated native example
   and schemas; never guess native fields. For a visual slide deck, supply native
   text, shapes, charts, tables and deliberate layouts rather than title/body
   shorthand. Adapt fictional examples to the request without inventing facts.
3. Create with `create_artifact` (or `create_deck` for Slide). Native source is the
   artifact: do not substitute an HTML mock, screenshot or generated image for
   the actual Editor.
4. Call `open_editor` to open the real Editor in the local graphical browser.
   Treat launch_requested/launch_unconfirmed as handoff status, not proof of browser
   connection or visible content. Ask the user to check the existing window; do not
   automatically retry. Tell the user to choose the artifact from Saved artifacts. The browser offers
   direct native editing, Undo/Redo, explicit Save and proposal preview/review.
   For remote/headless Claude Code sessions, explain that local graphical browser
   opening is required; do not claim the CLI displays an embedded Editor.
5. If the user saves a selection in the Code browser, it is not automatically
   delivered to this conversation. When they ask to use the selection, explicitly
   read the artifact and its saved selection IDs; never assume a context event
   arrived from the separate browser connection.
   After the user saves, call `read_artifact`/`read_deck` to read the latest saved
   content and revision. Unsaved browser drafts are unavailable to the AI.
6. Read the domain guide and propose changes against that exact `baseRevision`.
   Preserve native IDs and unrelated manual edits. On conflict, read again and
   reconsider; never force a stale candidate into the new revision.
7. Ask the user to refresh the Editor to see the pending proposal, preview it,
   then explicitly Apply or Reject. Never use a shell, HTTP request, automation
   or other tool to save a draft or accept/reject on the human's behalf. Only
   those explicit browser actions change saved manual content or accept proposals.
8. Read again to confirm the saved outcome. Do not report a proposal as applied
   before the user accepts it. Undo/Redo is local since the last load/save/apply;
   it does not undo another actor's edits or prior saved history.
9. In later conversations use `list_artifacts` (follow pagination), then read/open
   the selected ID. Delete only on explicit request; deletion is recoverable
   trash, not permanent erasure. Export only advertised formats and check the
   returned files. Office export, cross-artifact sync, executable React preview,
   Animation supports asset-free schema-1 rectangles/groups and native JSON export.
   Video and GIS adapters are unavailable.

Artifacts persist outside the plugin installation. Local storage does not mean
AI isolation: read/create/propose/export results share saved content with Claude
Code and its model provider. Do not put private content in troubleshooting logs.
