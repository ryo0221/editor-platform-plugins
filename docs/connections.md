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
structure/properties remain editable and retainable. Animation/Video/GIS are pending
public-source availability rather than silently importing private code.

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

Claude Desktop users can install the prebuilt `.mcpb` through Settings without
Git/npm or a separate Node.js installation. See [the installation guide](claude-desktop.md).
The extension uses Desktop's built-in runtime and keeps data outside its install
directory. This is a Desktop extension, distinct from the Claude Code plugin
manifest below. Actual signed-in Desktop installation/UI acceptance is pending.

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

## Web chat

Both providers need an endpoint reachable from their servers, not a loopback URL
on the user's computer. Deploy behind TLS with a host-compatible OAuth gateway.
For this preview, proxy authenticated requests into the one private workspace;
do not use it as a multi-tenant backend. Have the trusted gateway validate OAuth
and inject the private upstream bearer credential. Never put that credential in
HTML, a repository, model-visible tool data, a URL or a distributable manifest.

Configure `HOST`, `PORT`, `EDITOR_ALLOWED_HOST` (hostname only),
`EDITOR_ACCESS_TOKEN` (at least 32 characters for non-loopback bindings), and
`EDITOR_DATA_DIR`. The startup guard prevents accidentally serving an unauthenticated
non-loopback endpoint. Restrict upstream network access to the gateway. The bearer
guard is **not** an OAuth implementation; a complete gateway is a separate required
deployment component, and no such live deployment was performed here.

ChatGPT: add the HTTPS `/mcp` endpoint as a custom MCP server and configure the
gateway's supported authentication. Claude: add it as a custom remote connector.
Use a private test deployment before submitting to either directory. Confirm UI
rendering, tool visibility, authorization, download behavior and host CSP limits
in each real host. This source preview does not claim those checks have passed.

## Reference documentation

- [OpenAI MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [MCP Apps overview](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html)
- [Claude remote connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Claude plugin manifest](https://code.claude.com/docs/en/plugins-reference)
