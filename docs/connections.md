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
merge operations. React UI includes a bundled fixed Panel/Text/Counter preview; see
[its trusted catalog boundary](react-preview.md). Animation supports public schema-1 rectangles/groups and native JSON export through
the real controlled Surface/Player. Video/GIS adapters remain unimplemented.

UI-only tools are `save_slide_draft`, `apply_slide_proposal`,
`reject_slide_proposal` and `set_slide_selection`. Their `visibility: ["app"]`
metadata asks a compliant host to keep them out of the model's tool list. This
is a host visibility contract, not an independently authenticated human signature.
Server authorization protects the entire single-owner workspace. Do not grant
untrusted MCP clients direct access on the assumption that visibility is auth.

Saved selection IDs are available to the model through `read_deck` and the View's
model-context update. UI edits are not silently sent to the model before Save.
The model should read the current revision before proposing edits. Proposal
preview never changes canonical content. Only the explicit View action applies it.

## Local clients

The Claude Code distribution candidate uses a separate model-only stdio connection
and authenticated loopback browser bridge. It does not assume CLI MCP Apps display.
See [Claude Code](claude-code.md); the source configurations below remain developer
previews, and the Desktop MCPB is not a Code installer.

Claude Desktop users can install the prebuilt `.mcpb` through Settings without
Git/npm or a separate Node.js installation. See [the installation guide](claude-desktop.md).
The extension uses Desktop's built-in runtime and keeps data outside its install
directory. This is a Desktop extension, distinct from the Claude Code plugin
manifest below. Actual signed-in Desktop installation/UI acceptance is pending.

Codex users can follow the [bundled shell/browser procedure](codex-shell.md).
Issue #10 is closed for the accepted Linux x64 existing-session shell route with
a separately prepared browser operator; see [the scoped evidence](codex-shell-verification.md).
Native MCP registration remains a separate [unaccepted candidate](codex.md).
Normal GUI launch and native Windows/macOS have not been accepted.

For source-based clients:

Prepare submodules, dependencies and the UI build first. Launch the stdio server:

```sh
npm run start:stdio
```

The checked-in Claude package uses `${CLAUDE_PLUGIN_ROOT}`. The separate OpenAI
compatibility config uses `${PLUGIN_ROOT}`. Neither config contains credentials.
Local manifest loading in the actual desktop/CLI clients remains an acceptance
check; validation in this repository covers the MCP stdio protocol itself.
CLI hosts can use tools without rendering the UI; UI-only proposal acceptance
then requires a compatible MCP Apps UI host.

## ChatGPT status — unsupported (2026-10-18)

The current ChatGPT route requires an externally reachable HTTPS/OAuth server.
That delivery model is not adopted: the product must run in the user's existing
environment without asking either the provider or the user to operate an
additional server/domain/IdP. Do not present it as "preparing", an install option,
or a task waiting for the user's hosting choice. No alternative local ChatGPT
connection is implemented or claimed here.

The [OAuth source and tests](../integrations/chatgpt/README.md),
[tool authorization notes](../integrations/chatgpt/tool-auth.md) and
[former runbook](../integrations/chatgpt/runbook.md) are retained as historical
engineering evidence, not deployment recommendations. Local test success does
not imply signed-in ChatGPT acceptance; that remains NOT RUN. Code is retained,
and #9 is closed as not_planned; no Release is implied.

The local client paths above remain separate and retain their own acceptance
requirements. In particular, Codex local runtime support does not mean ChatGPT
web support. This policy change does not certify a different remote host.

## Reference documentation

- [OpenAI MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [MCP Apps overview](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html)
- [Claude remote connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Claude plugin manifest](https://code.claude.com/docs/en/plugins-reference)

## 0.1.3 authoring and lifecycle contracts

`propose_slide_changes` accepts exactly one of `edits` (the documented `kind`
discriminator) or `content` (the complete updated native deck). The Slide guide
returns the actual JSON schemas and examples for every typed edit. Full native
chart/table/image/layout edits can also use `propose_artifact_changes`; neither
route applies a pending proposal automatically.

`create_artifact` accepts a Graph-only `profile` input matching the native
`content.profile` identity/version. The Host retains it as `artifact.profile`,
validates creation and all candidate/save/apply boundaries using public upstream
Graph APIs, and uses it in the Surface. Existing records without it use the default
relation Profile. Profiles are immutable in this Host; schema migration/editing is
not exposed. `graph-source.json` and the local Graph JSON download contain
`{graph, profile}` so a custom definition is not lost on export. The first native
export file remains the GraphDocument for native interoperability.

`list_artifacts` returns paginated metadata for active/deleted/all artifacts.
`delete_artifact` moves the specified ID to recoverable trash at its exact revision;
`restore_artifact` restores it. Both advance the revision, preserving content,
Profile and proposals while invalidating old proposal bases. Archived records
remain readable/exportable, but editing and proposal decisions are rejected.
There is no permanent-delete tool. The UI exposes the same list/trash/restore flow.
Do not delete an artifact merely because the model considers it unused.

`list_editors` and the domain guides declare saved Data/Graph → Slide reference
support. Fixed/follow metadata comes from `create_reference`; human approval is
required for existing-deck proposals. See [reference semantics](references.md) for
source issuance, view refresh, save/export capture, backup and missing-source behavior.
