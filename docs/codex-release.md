# Codex Linux publication checklist

This is a local release-preparation document, not an available download or a
publication approval. The route runs in the user's existing Codex execution
environment. It requires no provider-hosted service, separate server installation,
Claude account, new Codex login or native Codex MCP registration. The bundled
runtime automatically starts a temporary loopback listener and stops with its
shell client. A remote ChatGPT endpoint is not part of this distribution.

## Smallest honest distribution scope

Proposed title: **Editor Platform 0.1.3 — Codex Linux x64 shell/browser preview**.
Publish only the Linux x64 archive if the owner accepts this exact scope. Keep the
existing archive name `editor-platform-claude-code-0.1.3-linux-x64.tar.gz` to avoid
forking the common runtime; clearly direct Codex users to `CODEX.md` and its shell
route, not the archive's Claude marketplace installation steps. The filename does
not imply Claude Code acceptance or a Claude prerequisite.

Required user environment:

- Existing Codex with permission for a persistent shell process, local child
  processes and loopback listening in the user's own environment.
- Linux x64; exercised on Debian 13 x64. Bundled Node requires glibc >=2.28 and
  libstdc++ >=6.0.25. These lower bounds are not a tested distribution matrix.
- A browser and trusted operator in the same environment. The accepted headless
  case uses separately prepared Chromium/Playwright and a private opener handoff.
  Neither browser automation nor a headless opener is shipped in the archive.
- Archive extraction/checksum utilities and private writable install/data paths.

A user who has no browser operator cannot complete this accepted workflow using
only the archive. Do not advertise one-click headless use, ordinary Linux GUI
launch, Windows/macOS/WSL support or all Codex hosts. A platform that kills the
process at each turn must restart the client to reopen saved work. No separate
server deployment should be requested as a workaround.

## Candidate gates

1. Freeze a clean source commit based on current main, including public upstream
   pin, corresponding source, dependency lockfiles and retained license notices.
2. Build one Linux archive with the pinned official Node input. Record its SHA-256,
   bytes, source commit, public pin and runtime/UI/client hashes. Test those exact
   bytes; an older accepted archive is not evidence for a new one.
3. Run local correctness checks and isolated package checks. Verify source/license
   closure. Run the bundled shell client with a fresh HOME/data directory, minimal
   PATH, no external Node/npm/Git and no source checkout available to the runtime.
4. Through the real packaged Editor and separate browser operator, verify create,
   native edit/Undo/Redo/Save, model reread, reject/apply, stale proposal refusal,
   export, clean EOF shutdown and restart retention. Record automated versus human
   operations honestly; do not call this Claude Code or native Codex registration.
5. Review the candidate record and this limited availability description. Only
   after owner approval publish the exact tested archive, adjacent checksum,
   shell installation guide, release notes and evidence. Do not rebuild silently.

Maintainer commands (not end-user installation):

```sh
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run check
EDITOR_NODE_ARCHIVE=/absolute/path/node-v24.19.0-linux-x64.tar.gz npm run package:claude-code
npm run test:claude-code-package
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium node --test tests/claude-code/browser-package.test.mjs
```

The archive-browser suite tests both the direct stdio regression route and the
bundled JSON-lines shell route. It extracts to a fresh temporary location, removes
the runtime's source snapshot, uses isolated HOME/data and only a capture opener
on PATH, keeps the browser capability in a private temporary file, and deletes the
test workspace on completion. The test runner and browser are external maintainer
tools; this is process-environment isolation, not a fresh OS or network sandbox.
It does not prove normal xdg-open association or a new Codex login/installation.

## Release assets and user actions

Attach the archive and its `.sha256`, a copy of `docs/codex-shell.md`, release notes
that state the prerequisites above, and a sanitized candidate acceptance record.
The archive already contains `LICENSE`, `SOURCE.md`, source hashes, `SECURITY.md`,
Node's license and npm/embedded third-party notices. PRs #32–#37 supply the scoped
notice reconciliation; do not reinstate superseded missing-filename blockers.

Users obtain the archive/checksum through the approved release location, verify
and extract it into a private directory, then ask their existing Codex to follow
`CODEX.md`'s shell route with a dedicated absolute data directory. Save/review
happens in the real browser. Tokens must not be pasted into chat. Stop the client
before moving/replacing files; back up the entire data directory. Removing only
the extracted package preserves data; deleting that separate directory is a
separate, explicit user decision. No host registration needs removing.

Owner decisions remaining: approve the exact tested artifact and limited public
preview scope, choose the tag/release title, and approve publication. If general
GUI availability is desired instead, obtain native Linux GUI/browser acceptance
first; that is an additional claim, not a prerequisite for the limited preview.
Claude-specific #3/#4/#5/#8/#11 acceptance and ChatGPT deployment are not gates for
this Codex route. Release creation, tags, LP edits, uploads, automatic CI and
Claude authentication are not performed by this preparation.
