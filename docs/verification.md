# Verification — 2026-10-16

## Exact dependency

The public upstream is pinned to `a9e708331ff9b78886a02d3c30dca67bfafdf2e8`,
tree `f4d4f7ca6187cca786e2a3bef16cc71b54113a71`, with its export-manifest hash
recorded in upstream.json. The submodule's tracked files were unchanged.

## Completed checks

- Dependency installation and lockfile generation: PASS.
- Pinned upstream verification, strict TypeScript and production UI build: PASS.
- Server/domain/HTTP/MCP/stdio/desktop-storage/authoring tests: **21 passed**, no skips.
- Desktop Chromium protocol harness: **17 passed**, no retries or skips.
- Browser tests fail on page errors and console errors; the final run had none.
- Representative Document and Graph screenshots were inspected, including Japanese
  text with locally available Noto fonts. All nine mount cases retain screenshots
  outside Git for local inspection.

Server cases cover all eight non-Slide native domains and Slide, real changed
candidates, preview/apply/reject, saved-revision conflicts, restart retention,
bounded native validation, invalid IDs, exports, bearer/Host/Origin boundaries,
MCP initialize/tool/resource discovery and a stdio launch from outside the repo cwd.

Browser cases cover all nine native Surface mounts, explicit saving and native JSON
downloads; actual Document typing/save/reload; Slide preview/reject/apply; Document
native proposal acceptance; protection of an unsaved manual draft against an
external save; and a real Graph add-node command/save/reload with its Profile.
These bounded cases are not full-domain upstream regression or complete feature
acceptance for every tool in each Surface.

The final browser configuration uses one fresh browser per case. This restricted
cloud required an explicit Chromium executable and `EDITOR_BROWSER_SINGLE_PROCESS=1`;
the single-process browser cannot reliably create a second context after closing
the first. This changes process isolation in the test runner, not application
assertions, timeout budgets, editor permissions or host CSP semantics.

## Not accepted by these checks

- No actual signed-in ChatGPT/Claude web or desktop integration has been tested.
- No marketplace submission, review, install acceptance or hosted endpoint.
- No OAuth server/gateway, organization policy, per-user tenancy or production service.
- No React UI executable-component preview runtime. Its native model, structure and
  properties are retained/editable; the UI declares the runtime requirement.
- Animation, Video and GIS are absent from the public source pin. No private source
  was copied to manufacture a public adapter.
- File/PDF imported binary interoperability, Office exports, embedded content across
  Editors and unrestricted shared editing are not certified by this integration.
- No mobile acceptance, performance measurement, browser-family matrix or new Actions.

The View is currently a single self-contained HTML bundle for all published domains
(approximately 7.94 MB uncompressed at this checkpoint). Real-host resource size,
CSP, worker, download and embedding behavior still need acceptance in each provider.

## Reproduce

```sh
git submodule update --init --recursive
npm ci
npm run check
```

Provide `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for a preinstalled browser if Playwright's
managed browser is unavailable. `EDITOR_BROWSER_SINGLE_PROCESS=1` is only needed
on environments that impose the same restricted-process constraint.

## Claude Desktop MCPB — 0.1.1

- `npm run check`: PASS (strict types/build, 18 server tests, 14 browser cases).
- Current browser rerun: Chromium 153.0.8010.0, single-process cloud configuration;
  no application/page console errors, retries or skips. Playwright's managed
  browser download was unavailable; an npm-distributed Chromium binary was used.
- Official `@anthropic-ai/mcpb` 2.1.2 manifest validation and packing: PASS.
- `npm run test:claude-package`: **2 passed**, running the installed server with
  Node **20.19.0**, the declared minimum runtime (the build host uses Node 24.19).
- Archive checks cover complete corresponding public source, retained lockfiles /
  declarations / tsconfig, license texts, safe paths and SHA-256 integrity.
- Runtime files alone were extracted outside the repository, into a path containing
  spaces and Japanese text. No source checkout, external node_modules, npm, tsx,
  Git, model API key or network dependency download was available to that server.
- Actual stdio initialize/discovery, all nine domain create/read/export calls,
  changed Document proposal preview/reject/apply, manual saving, stale conflicts,
  UI resource bytes and repeated restarts: PASS.
- Moving the installation to a different directory retained all nine artifacts,
  pending proposals and later saved content through the stable application-data
  directory. The packaged HTML is the same Vite output tested by the browser harness.
- Windows/macOS default storage paths are covered by unit checks. Native Windows
  and macOS execution, Claude's installer/runtime selection, its sandbox and MCP
  Apps UI/download behavior still require real-host acceptance. No signed-in
  Claude Desktop installation or directory approval is claimed.

Maintainers reproduce the package separately from the main checks:

```sh
npm run package:claude
npm run test:claude-package
```

`EDITOR_TEST_NODE=/absolute/path/to/node` selects a separate installed-runtime
binary for the package smoke test. The MCPB uses only portable JavaScript/HTML;
developer esbuild/Playwright binaries are not runtime dependencies in the archive.

## Rich native authoring — 0.1.2

The user reported that the 0.1.1 extension opened the Editor in Claude Desktop,
but the generated result contained only title/body text. The Slide creation API
was indeed restricted to that shorthand; successful mounts did not establish
useful authoring. This revision adds a typed full-native Slide creation input,
native Slide snapshot proposals, nine per-domain model guides, and explicit MCP
authoring instructions. It does not call an AI provider itself.

- `npm run check`: PASS, **21 server tests and 17 browser cases**.
- Actual MCP guide/create calls retain each of the nine rich/native example
  contents exactly, including chart views and explicit React UI limitations.
- The real Slide Surface displays independent styled text/shapes, actual chart
  bars and table cells, and embedded image data. A native text edit saves/reloads
  without dropping the table/chart structure. Native chart/background proposals
  preview and apply only through explicit review.
- The real Document Surface displays styled text, table cells, an image and a
  rendered Mermaid image with nonzero intrinsic dimensions; native block types
  survive saving. Both rich views were visually inspected with Japanese fonts.
- Existing revision conflicts and locked Slide group/descendant protections are
  exercised for native candidates; proposal creation leaves saved content intact.
- Representative visual checks were repeated with local Noto Sans JP test fonts.
  These fonts are test-environment assets, not new extension dependencies.
- The offline package check now creates all nine domains from their guides rather
  than only mounting default empty artifacts. The package exposes 18 tools.

These checks use deterministic authored examples and the local MCP Apps harness.
They verify the available API and actual rendering, not the quality of a live
Claude model's response. The user report confirms 0.1.1 host UI display, but this
agent has not signed in to Claude Desktop or certified live 0.1.2 generation.
