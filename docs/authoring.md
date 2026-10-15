# Native authoring through the chat host

Version 0.1.2 fixes a real authoring limitation in the first Desktop package:
`create_deck` accepted only slide titles and body strings, and the generic Slide
creation path rejected native content. A working editor shell therefore did not
mean the chat model could create designed slides. Other domains accepted native
JSON but did not explain its structure to the model.

## Model workflow

1. Call `get_editor_guide({kind})` before authoring substantive content.
2. Adapt its native contract and example to the user's request and source data.
3. Pass the resulting native JSON as `content` to `create_artifact` (all nine
   public domains) or `create_deck` (typed Slide schema).
4. For an existing artifact, read its current revision and IDs, then submit a
   same-domain candidate through `propose_artifact_changes` with that revision.
5. The user previews and explicitly accepts/rejects the change in the real UI.

The MCP initialization instructions and individual tool descriptions teach this
workflow; the user does not need to configure another AI provider or API key.
The model runs in the chat host. This repository does not add AI orchestration.

## What native content enables

| Kind | Authored structure |
| --- | --- |
| Slide | Independent editable shapes/text, charts, tables, embedded images, rich text, colors and pixel layout |
| Document | Headings, styled/rich text, actual lists/tables/images and Mermaid diagrams |
| Design | Frames, hierarchy, native visual elements, images and layout |
| Whiteboard | Separate nodes/sections and actual connectors |
| Data | Columns, populated rows and saved views including charts |
| Graph | Typed entity nodes, related edges, attributes and positions under the public relation Profile |
| Review | Before/after sources and explicit revision identities |
| File | Retained image/text data for the native viewer |
| React UI | Retained structure/properties; executable preview remains unavailable |

Guide examples are validated against the upstream domain models and exercised
through the real MCP protocol. They are fictional format examples, not evidence
for a user's presentation or a template that should be copied unchanged.
Images are supplied embedded data; this package does not generate photographs.

Native candidates are whole-artifact single-owner snapshots. Revision conflicts
and existing Slide locks still apply. This is not a collaboration merge contract.
The legacy `create_deck.slides` title/body shorthand remains for compatibility and
explicitly plain-text slides; it is not the designed-content path.

## Acceptance

The browser suite creates rich native Slide and Document content through MCP,
then checks the real upstream editor: chart bars, table cells, embedded image,
typography, manual text changes and persistence, proposal preview/application,
rich Document blocks and a successfully rendered Mermaid image. These cases
would fail if creation silently discarded everything except titles/body text.

These are deterministic content/protocol/rendering checks. They do not certify
the quality of Claude's choices or verify every possible prompt. After updating
the extension, restart Desktop and use a new conversation so the current tool
schemas and model instructions are loaded.
