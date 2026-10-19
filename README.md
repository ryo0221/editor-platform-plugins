# Editor Platform Plugins

Local editor integration source for [Open Editor Platform](https://github.com/ryo0221/open-editor-platform).
The implementation mounts **real upstream Editor surfaces** for the published domains.
It uses the shared MCP Apps bridge and the same MCP server for both hosts.

**Status:** local integration preview. No hosted endpoint, app-directory listing, or
ChatGPT/Claude production-host acceptance is claimed. See [verification](docs/verification.md).

## What works

- Create and open Slide, Document, Design, Whiteboard, Data, Graph, Review, File, React UI and Animation native artifacts.
- Author native visual/structured content through `get_editor_guide` and the
  `content` input, including Slide shapes, charts, tables, images and rich text.
- Mount their upstream editing/viewing controls with local Undo/Redo and explicit saving.
- Propose typed Slide edits or a domain-validated native candidate for other Editors; preview and explicitly apply/reject.
- Reject stale proposals and competing saves using saved-revision preconditions.
- Share saved selected IDs; export native JSON plus Slide/Design/Whiteboard SVG, Document Markdown and Data CSV.
- Discover saved artifacts across conversations; move unwanted artifacts to recoverable trash and restore them with revision checks.
- Retain decks and pending proposals across a server restart using atomic local files.
- Use Streamable HTTP or stdio; local test harness uses the official MCP Apps AppBridge.

Office export is disabled by this Host; no PPTX/DOCX capability is claimed.
UI Undo/Redo covers local edits since the last load/save/accepted proposal. It is not
selective collaborative Undo. This preview is one workspace on one server process,
not a multi-user service. Generic native candidates are whole-artifact, single-user
proposals, not a shared text operation/merge contract. Domain models remain separate.

React UI supports native structure/properties, retention and a bundled fixed
Panel/Text/Counter component preview. This trusted catalog does not execute arbitrary
user code; see [the preview boundary](docs/react-preview.md). File and Review retain their upstream viewing/comparison semantics;
they are not arbitrary binary document editors. Graph uses the public relation Profile by default, or a declarative custom Profile supplied at creation and retained immutably with that artifact. Profile schema migration is not supported by this Host.

Slide charts are static snapshots. Saved Data/Graph can also be embedded as fixed
or follow references in Slide, using the public resolver and adapters; see
[reference semantics and limits](docs/references.md). Source updates refresh the
view; explicit Save/export captures versions. Other destination adapters are pending.

Animation uses the public schema-1 rectangle/group Surface and Player, with native
JSON export. External assets, nested compositions, prototype migration and video/GIF
export are not supported. Video and GIS adapters remain unimplemented.

## Set up

**Claude Code: 0.1.5 released for Linux x64 on WSL2.** Download the prebuilt
local-marketplace archive from the GitHub Release `v0.1.5` and follow the
[Claude Code guide](docs/claude-code.md) for installation, storage, permissions
and recovery. Accepted only on Windows 11 / WSL2 Ubuntu 22.04 with Claude Code
2.1.303+; native Linux desktops, macOS and Windows are not accepted. The Desktop
`.mcpb` below is a separate format.

**Codex completion targets:** Windows app (native Windows agent) and WSL CLI.
The [platform-specific installation candidate](docs/codex-windows-wsl.md) reuses
this runtime and provides isolated install/update/removal plus connection fields.
Native acceptance for both targets is pending; cloud limitations do not make them
unsupported. See [channel boundaries and acceptance](docs/channels.md).

For **Codex**, the [prebuilt shell/browser route](docs/codex-shell.md) is accepted
as a limited Linux x64 preview using an existing Codex session and a separately
prepared browser operator. Issue #10 is closed for that scope. No extra Codex or
Claude login, native MCP registration, source build or external Node is required.
There is no public download yet; normal GUI launch and native Windows/macOS are
not accepted. See the [Linux publication checklist](docs/codex-release.md).

For **Claude Desktop**, install the prebuilt `.mcpb` extension from its Settings
screen: see [the installation guide](docs/claude-desktop.md). It includes the UI,
server and runtime dependencies, and uses Desktop's built-in Node.js. No Git,
npm, external Node.js installation, API key or public endpoint is needed by users.
The unsigned package is an integration preview; actual Desktop acceptance and
directory listing are not claimed. It is not a ChatGPT installer.

The following setup is for **source development / HTTP deployments**.

Node >=22.18 and Git are required. No model API key is required: the chat host calls
tools; this server does not invoke any AI provider.

```sh
git clone --recurse-submodules https://github.com/ryo0221/editor-platform-plugins.git
cd editor-platform-plugins
npm ci
npm run build
npm start
```

Default MCP endpoint: `http://127.0.0.1:8787/mcp`. Data defaults to `./data/`.
Use `EDITOR_DATA_DIR` to choose a durable, private directory. That path and all data
are Git-ignored. Back up the directory if the data matters.

The submodule and [upstream.json](upstream.json) pin only the **public** source.
`npm run build` verifies its commit, tree, tracked source and export manifest. No
private repository or its history is required. To update it, review a new public
commit, update the submodule and pin together, and rerun the checks.

## ChatGPT / Claude

See [native authoring](docs/authoring.md) and [connection and deployment](docs/connections.md). The repository includes
`.claude-plugin/plugin.json` plus `.mcp.json` for Claude local stdio, and a Codex
compatibility manifest plus `.mcp.codex.json`. Prepare the checkout, dependencies
and UI build before using local package configurations.

**ChatGPT: unsupported under the current product policy.** The implemented remote
route requires an operated HTTPS/OAuth endpoint. The product must run in the
user's existing environment; neither the provider nor the user is asked to set up
an additional server, domain or IdP. This route is not awaiting deployment approval
and is not a supported installation option. Its source and local test evidence
remain [historical technical references](integrations/chatgpt/README.md).
Local Codex/Claude routes keep their own preview/acceptance status; they do not
establish ChatGPT support. No replacement ChatGPT local route is claimed.

## Verify

```sh
npm run check
```

For a local protocol demonstration:

```sh
npm run build:test-host
EDITOR_ENABLE_DEMO=1 npm start
# Open http://127.0.0.1:8787/demo
```

The `/demo` harness is disabled by default and cannot be enabled on a non-loopback
binding. It exercises the MCP protocol with an iframe, rather than impersonating
ChatGPT or Claude. Performance collection and automatic GitHub Actions are absent.

## Source and license

AGPL-3.0-only. Upstream source, fixtures, dependencies and third-party notices retain
their original notices in the public submodule; see its LICENSE-SCOPE and
docs/third-party. This project provides no new linking exception or proprietary
licensing promise. See [SECURITY.md](SECURITY.md) for the current access boundary.
