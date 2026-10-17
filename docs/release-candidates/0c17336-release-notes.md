# Editor Platform for Claude Code 0.1.3 — unpublished candidate notes

**配布準備中 / preparing.** This is a reviewable release-note draft for source
`0c17336a125659dda85af90153c9b84e651679ae`, not a published release or installation
approval. Replace the candidate identity after final packaging changes; do not
copy historical hashes into a later release. Actual Claude Code, macOS/Windows
acceptance and the accepted minimum host version remain NOT RUN / unset.

## What the candidate provides

Create and edit Slide, Document, Design, Whiteboard, Data, Graph, Review, File,
React UI and Animation artifacts using the public upstream Editors. The local
browser allows native edits, local Undo/Redo, explicit Save, proposal preview,
Reject and Apply. The model can reread saved revisions; it cannot call the
browser's save/apply/reject tools. Saved Data/Graph references can appear in Slide.
The plugin itself makes no AI service calls; Claude Code's existing authentication,
subscription and permissions still apply.

Native JSON is retained. Additional outputs include Slide/Design/Whiteboard SVG,
Document Markdown, Data CSV and registered React UI TSX source. The current Slide
browser export button downloads the first slide SVG; native JSON and the MCP
export retain all slides. React preview is restricted to the bundled
Panel/Text/Counter catalog. Animation is schema-1 rectangles/groups and native
JSON. No Office export, arbitrary executable React components, Video/GIS adapter
or collaborative shared Undo is promised. Local Undo resets at saved/load/accepted
proposal boundaries.

The archive contains its pinned Node 24.19.0 runtime, server, UI, corresponding
public source and notices. End users do not need a separate Node/npm/Git install
or source build. Storage stays outside the extracted plugin; back up the full
workspace while the process is stopped. Only one process may own a workspace.
The local browser uses a random per-process capability and loopback server.
No public service, shared tenancy or new external AI key is needed.

## Distribution set to review

See [exact inventory](0c17336-inventory.json) for four local marketplace archives:
Linux x64, macOS arm64, macOS x64 and Windows x64. Each has a `.sha256` and an
`.acceptance-template.json` sidecar. A built target is **not** an accepted OS.
Keep unsupported candidates out of any supported-download list.

Before an authorized release, prepare the following together from the final
accepted candidate:

- Accepted-target archive(s), unchanged since their recorded acceptance, plus
  individual checksums and copied completed acceptance records. Retain empty
  original templates separately; never replace them with fabricated PASS rows.
- Final release notes, installation/backup/update/removal guide and a machine
  inventory of filenames, bytes, archive hashes, source commit and public pin.
- Bundled source, LICENSE, Node LICENSE, THIRD-PARTY-NOTICES and applicable license
  texts; resolve the 21 root-text omissions named in the current inventory.
- Actual tested OS/architecture/Claude Code/browser versions, explicit accepted
  minimum version decision, limitations and evidence references.

The archives are unsigned local candidates. SHA-256 establishes file identity,
not publisher signature verification. No Release, tag, asset upload or LP change
was performed. Checks passed locally as documented in
[acceptance evidence](0c17336-acceptance.md); host acceptance is still separate.

## LP handoff values now

| Field | Value |
| --- | --- |
| Status | `preparing` / 配布準備中 |
| Display version | `0.1.3 candidate` |
| Candidate source | `0c17336a125659dda85af90153c9b84e651679ae` |
| Public editor pin | `97ea905745101b3814d14febcc0c31b157023c71` |
| Release URL | `null` — not published |
| Download URL | `null` — keep download disabled |
| Supported environments | `[]` — native/host acceptance not established |
| Accepted minimum Claude Code version | `null` |
| Guide | [Commit-pinned installation guide](https://github.com/ryo0221/editor-platform-plugins/blob/0c17336a125659dda85af90153c9b84e651679ae/docs/claude-code.md) |
| Editor types / export limits | As listed above; do not infer Office support |
| Actual-host Short/Long demo URLs | `null` — #5 footage not recorded here |
| Recording artifact SHA-256 | `null` until real recording names its candidate |

After acceptance and explicit publication approval, replace URLs with the real
published Release/asset locations and narrow supported environments to those
actually accepted. The video must identify the same accepted archive SHA-256.
There is no reserved release URL or invented future tag in this draft. A later
#10 shell-client bundle requires a fresh inventory and corresponding guide check.
