# Editor Platform Plugins

ChatGPT / Claude integration source for [Open Editor Platform](https://github.com/ryo0221/open-editor-platform).
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

React UI supports native structure/properties and retention; executable component
preview requires a separately hosted, pinned React runtime and is not implemented
by this preview. File and Review retain their upstream viewing/comparison semantics;
they are not arbitrary binary document editors. Graph uses the public relation Profile by default, or a declarative custom Profile supplied at creation and retained immutably with that artifact. Profile schema migration is not supported by this Host.

Slide charts are static snapshots. Cross-artifact embedding and automatic source-update
propagation are not supported; upstream work is tracked in [#264](https://github.com/ryo0221/editor-platform/issues/264).

Animation uses the public schema-1 rectangle/group Surface and Player, with native
JSON export. External assets, nested compositions, prototype migration and video/GIF
export are not supported. Video and GIS adapters remain unimplemented.

## Set up

**Claude Code first distribution: 配布準備中.** A prebuilt local-marketplace candidate
and protected local-browser Editor route are under development. See the
[Claude Code guide](docs/claude-code.md) for installation, storage, permissions,
recovery and release gates. No accepted OS, public download or live-host acceptance
is claimed. The Desktop `.mcpb` below is a separate format.

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

Web chat requires an HTTPS-reachable MCP endpoint and host-compatible authorization.
The shared UI is self-contained HTML served through an MCP resource; it does not
fetch a separately hosted editor or load external scripts/styles.

The current HTTP guard accepts a configured bearer token. OAuth discovery, account
login, per-user isolation and marketplace publication are **not implemented**.
Do not assume a static-token config can be installed into every web-chat host.
Complete a compatible OAuth gateway/integration and actual-host testing before
offering a public shared service. See the exact deployment boundary in the guide.

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
