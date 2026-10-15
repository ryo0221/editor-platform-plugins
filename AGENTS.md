# Editor Platform Plugins

- Read README.md, docs/connections.md, SECURITY.md and docs/verification.md first.
- Import only public `@editor-platform/*` entrypoints from the pinned public submodule.
- Keep shared editor fixes upstream. Do not edit vendor/editor-platform in place.
- Keep MCP/host/auth/storage behavior here. Do not add AI provider orchestration to editors.
- Treat native content as data. Retain revision checks and proposal review semantics.
- Flush pending native input before saving/exporting or changing the rendered source.
- Do not ingest other actors' edits into local snapshot Undo. Real shared history needs the
  upstream collaboration adapter; the current local history resets at saved boundaries.
- State actual-host, authorization, mobile and performance gaps truthfully.
- Do not add automatic Actions or performance measurement without a user instruction.
- Run npm run check for relevant source changes. Keep generated output/data outside Git.
