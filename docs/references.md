# Data and Graph references in Slide

This Host connects the public reference resolver/adapters for **saved Data/Graph →
Slide**. Document, Design and Whiteboard destination wiring is not implemented in
this plugin yet. Ordinary native Slide charts remain independent static snapshots.
There is no cross-workspace, remote URL, nested-reference or multi-user service.

Use `list_reference_sources` to discover saved views. `create_reference` accepts
`source:{artifactId,domain,target}` and `mode:"fixed"|"follow"`. Data's domain is
`data`, with `target:{kind:"table"|"chart",viewId}`; Graph uses `structured-graph`,
with `target:{kind:"graph",viewId:<native graph.id>}`. Optional columnIds, rowIds or
nodeIds restrict stable native IDs. The returned `reference` and `src` belong on
a Slide image object. For an existing deck, submit a native proposal with
`propose_artifact_changes`; the human previews and accepts/rejects it as before.
Preparing a reference never modifies a destination.

The real Slide Surface also exposes the upstream reference insertion/inspection
controls. Fixed references retain their issued version. Follow references refresh
the view from committed source revisions (polled every four seconds). Unsaved source
inputs and unaccepted proposals are not reference sources. Source refresh does not
write the destination or enter its local Undo history. Explicit Save or export
captures source snapshots and SVG projections. Existing destination revision
checks still reject competing saves. Native JSON retains the exact closure;
graphic SVG is a static capture, not an executable live connection.

Missing/deleted sources and missing views/columns/nodes display a diagnostic.
Save/export fails instead of silently substituting old content. A fixed reference
also checks that its source is still active. Restore the source and refresh to
recover. Do not remove the reference's source identity or hashes to bypass errors.

The single-owner server issues snapshots from atomically committed artifact files
and retains immutable copies in `reference-snapshots/` within its private data
directory. A reference presented for create/propose/save/export must match an
issued version; recomputing a hash on forged content is not sufficient. Graph's
owned Profile is retained as a hashed dependency. Current access here means the
source belongs to this authenticated workspace and is not in trash; it is not
per-user authorization or OAuth. A backup must include the complete data directory,
including this new folder. Historical reference snapshots have no automatic
cleanup; fixed references and restart integrity depend on retaining them.

Imports from another workspace are rejected until their source/version can be
issued by this workspace. No new cross-workspace trust/authorization contract is
introduced. Exported JSON remains inspectable data, not a promise that another
Host can resolve its source IDs. Existing native source/destination size limits
still apply, including the plugin's 2 MB destination limit.

Real signed-in Claude Code/Codex/ChatGPT/Desktop, native Windows/macOS and mobile
acceptance remain NOT RUN. Local browser tests do not establish those conditions.
