# Packaged-candidate acceptance automation (L1)

This harness checks a release candidate's behavior without a person operating the
Editor. It runs the exact archive's bundled Node and `server/code.mjs` through an
MCP stdio client, opens the real Editor UI in Playwright Chromium, and records one
result per check. Only the OS URL opener is replaced: `wslview` and `xdg-open`
shims on an isolated `PATH` write the handoff URL to a private temporary file.

It never reads or writes the installed plugin or the user's Editor data. Each
check uses a fresh temporary data directory with fictional content.

## Run

```sh
CANDIDATE_ARCHIVE=release/editor-platform-claude-code-<version>-linux-x64.tar.gz \
PREVIOUS_ARCHIVE=release/editor-platform-claude-code-<previous>-linux-x64.tar.gz \
node_modules/.bin/playwright test --config tests/acceptance/candidate.config.mjs
```

`PREVIOUS_ARCHIVE` is optional. With it, the retention check creates and saves
data with the previous candidate and then reopens and edits it with the new one.
Without it, the check covers server restart only, and the summary reports C6 as
`NOT RUN` because the update path was not exercised.

The archive must match its `.sha256` sidecar. It is copied, freshly extracted, and
its bundled Node, server entry, Code runtime module and UI files are re-verified against `build-info.json`.

## Output

All output stays under the ignored `work/acceptance/automated/` directory:

- `checks/<id>.json`: one record per check (status, error, evidence, browser and
  server errors, package digest and source commit)
- `evidence/<id>.png`: a final screenshot per check
- `result.json`: scenario summary (`PASS` / `FAIL` / `NOT RUN`) and limits

| Check | Scenario | What it verifies |
| --- | --- | --- |
| L1-C2 | C2 | OS-opener handoff (`launch_requested`), three slides with chart and table render in the Editor |
| L1-C3 | C3 | Canvas text edit and shape drag, Undo/Redo, explicit Save changes only those objects |
| L1-C4 | C4 | Proposal appears without reload; Reject keeps content; Apply changes only the proposal |
| L1-C5a | C5 | Unsaved draft survives proposal arrival, browser reload prompt and reread prompt |
| L1-C5b | C5 | Old-base proposal returns `CONFLICT`; a pending proposal expires after a manual save and cannot be applied |
| L1-C5c | C5 | A competing save from a second tab is refused; the first save and the second tab's draft remain |
| L1-C6 | C6 | Data survives restart (and update with `PREVIOUS_ARCHIVE`); a second session on the same workspace is refused |
| L1-C7 | C7 | Multi-slide SVG zip equals the host's `export_deck` SVGs; native JSON export; PPTX entry disabled |
| L1-R1 | R1 | Registered React components preview; interaction state is not reset by background refresh; TSX export |

## Limits

L1 does not replace actual-host acceptance. It does not cover installing the
plugin, permission prompts or `/mcp` status (C1), the real OS browser opening and
looking correct (OS1), or Claude Code choosing tools from a natural-language
prompt. Record those separately from a short manual check per candidate.
Headless Chromium is not Edge or Chrome on the tested OS.

The config is explicit and is not part of `npm run check` or CI.

## Actual-host automation (L2)

`tests/acceptance/host-l2.mjs` drives the **installed** plugin through real
Claude Code (`claude -p`) with the acceptance prompts, each in a new
conversation, and checks the tools the host chose and the saved result. It uses
model tokens and is run by hand only.

```sh
node tests/acceptance/host-l2.mjs [output-directory]   # default work/acceptance/host-l2
```

`EDITOR_DATA_DIR` points the plugin at a temporary workspace, so the user's data
and an open session's workspace lock are not touched. A `wslview`/`xdg-open` shim
first on `PATH` records the Editor URL instead of opening a browser. MCP tools of
this plugin are pre-allowed with `--allowedTools`; no permission prompt is shown.

| Check | Scenario | What it verifies |
| --- | --- | --- |
| L2-C2 | C2 | Skill prompt reads the slide guide, creates native content (not legacy `slides`), three slides with chart/table and shapes, requests the Editor |
| L2-C4 | C4 | A new conversation rereads the saved deck before proposing, uses its revision, and leaves the proposal pending. NOT RUN when C2 left a pending proposal of its own (the model may reasonably defer a second proposal on the same base) |
| L2-C6 | C6 | A new conversation finds the deck with `list_artifacts`, requests the Editor and creates nothing new |

Output: `<id>.jsonl` transcripts and `result.json` (host version, model, cost,
per-check PASS/FAIL with failed assertions). A tool call counts only when its result
is attached and not an error. Model behavior is nondeterministic;
review the transcript of any FAIL before recording it. L2 does not cover the
permission UI or `/mcp` status (C1) or the real OS browser (OS1).
