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

Slide charts are static snapshots. Saved Data/Graph can also be embedded as fixed
or follow references in Slide, using the public resolver and adapters; see
[reference semantics and limits](docs/references.md). Source updates refresh the
view; explicit Save/export captures versions. Other destination adapters are pending.

