# Connections and deployment

## Shared architecture

The host calls `create_deck`, `read_deck`, `propose_slide_changes` and `export_deck`.
The first three tools link to `ui://editor-platform/editors-v1.html`. That resource
contains the built React Slide Editor and the official MCP Apps App bridge.

For all published domains, use `create_artifact`, `read_artifact`,
`propose_artifact_changes` and `export_artifact`. The matching UI-only save/apply/
reject/selection tools use `artifactId`. Tool results carry either the original
`deck` envelope or a native `artifact` envelope; the View selects the real upstream
Surface by its domain. No universal content model is introduced. Generic proposals
carry complete native candidates with revision checks; they are not collaborative
merge operations. React UI live preview needs a separate pinned runtime; its
