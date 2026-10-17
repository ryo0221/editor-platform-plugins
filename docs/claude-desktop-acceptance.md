# Claude Desktop unsigned preview — native acceptance (#11)

Decision: **remain unsigned integration preview**. Do not mark the LP's
`claudeDesktop.status` available or claim supported OS versions from this checklist.
No signing key, certificate, directory submission, release or installation is
performed by this document. Signing/release policy requires a separate decision.

## Current evidence, 2026-10-17

This execution environment is Linux x64 with no signed-in macOS/Windows Claude
Desktop session. All native rows below are **NOT RUN**. Prior Linux package tests,
path unit tests and Chromium MCP Apps harness results are useful preparation but
cannot pass a native installer, Desktop runtime, sandbox or host UI row. The older
user report of 0.1.1 UI display does not establish current bundle acceptance.

| Environment | Required access | Current result |
| --- | --- | --- |
| macOS, record version/build and arm64/x64 | Existing signed-in Claude Desktop, GUI, permitted local extensions, writable app-data and downloads | NOT RUN — environment unavailable |
| Windows, record version/build and x64/arm64 | Existing signed-in Claude Desktop, GUI, permitted local extensions, writable LOCALAPPDATA and downloads | NOT RUN — environment unavailable |

Do not create accounts, bypass organization controls, install software or request
credentials to unblock this work. Ask the owner to provide an approved existing
native test environment when ready. No secrets are needed in chat. If installation
is disallowed, record BLOCKED with the exact policy/error and do not work around it.

## Maintainer handoff before any native run

1. Build from the exact reviewed public plugin commit and pinned public upstream:
   `npm ci`, `npm run package:claude`, `npm run test:claude-package`.
   These are development steps; end users need no npm, Git or external Node.
2. Keep the `.mcpb`, adjacent SHA-256 file, public source/license notices and build
   metadata together. Record plugin commit, upstream commit, package filename,
   hash, manifest version and build Node in a private evidence folder. Do not
   infer the bundle version from a stale document. No generated archive in Git.
3. Verify on the target OS without installing extra tools:
   macOS `shasum -a 256 /path/to/candidate.mcpb`; Windows PowerShell
   `Get-FileHash -Algorithm SHA256 'C:\path\candidate.mcpb'`.
   Compare with the maintainer's checksum; a matching hash is integrity evidence,
   not a signature or publisher identity guarantee.
4. Use a disposable OS account/profile and fictional artifacts where feasible.
   Back up existing EditorPlatform data with Desktop closed. Do not overwrite
   real data to obtain a clean test. One Desktop backend process per data directory.
5. Prepare this record once per OS/architecture. Record UTC date, tester, OS/build,
   Desktop version/channel, actual bundled Node version if observable without
   changing runtime, account policy (no identity/token), bundle hash and commit.
   Mark unavailable fields unknown; do not guess Desktop runtime selection.

## Native run — execute each row independently on each OS

Use the [existing installation guide](claude-desktop.md). Only an approved native
operator may install the candidate through Settings → Extensions. UI labels may
change; record the actual route. Maintain a local evidence directory containing
screenshots and sanitized logs. Every PASS must cite an evidence filename and
expected/actual values. FAIL or BLOCKED does not become PASS after a Linux test.

| ID | Action and expected evidence | macOS | Windows |
| --- | --- | --- | --- |
| D01 | Install exact hash; capture unsigned warning, permissions and manifest identity; no npm/Git/API key requested | NOT RUN | NOT RUN |
| D02 | Restart Desktop, enable extension in new conversation; list_editors and get_editor_guide succeed; inspect server startup errors/runtime | NOT RUN | NOT RUN |
| D03 | Ask for fictional Document titled `Desktop acceptance`, containing `Before save 123`; real editable Surface appears, not text/HTML substitute | NOT RUN | NOT RUN |
| D04 | Type `Manual edit 456 日本語` in native input; immediately click Save without blur; read_artifact returns changed native content and increased revision | NOT RUN | NOT RUN |
| D05 | Reopen same ID, restart Desktop and use a new conversation/list_artifacts; same saved text and revision persist | NOT RUN | NOT RUN |
| D06 | Request a proposal against current revision; preview and Reject via UI; canonical content unchanged; propose again and Apply via UI; reread changed content | NOT RUN | NOT RUN |
| D07 | Preserve an unsaved manual draft while a competing save/proposal changes revision; conflict is surfaced and no silent overwrite occurs | NOT RUN | NOT RUN |
| D08 | Create rich Slide with chart/table/shapes; real Surface renders, edit native text and save/reopen; existing chart/table survive | NOT RUN | NOT RUN |
| D09 | Export advertised native JSON and Document Markdown; download permission/target and bytes checked; do not claim Office export | NOT RUN | NOT RUN |
| D10 | Inspect actual private storage path and persistence outside extension directory; no unexpected HTTP listener or dependency-download subprocess | NOT RUN | NOT RUN |
| D11 | Disable/re-enable/restart; data retained. If an update candidate is approved, update from recorded prior version, repeat reopen; relocation alone is not update acceptance | NOT RUN | NOT RUN |
| D12 | Uninstall only in disposable profile after backup; record retained data and restore behavior; no automatic data-erasure claim | NOT RUN | NOT RUN |

Expected data directories: macOS `~/Library/Application Support/EditorPlatform/ClaudeDesktop`;
Windows `%LOCALAPPDATA%\EditorPlatform\ClaudeDesktop`. The local Node server's
filesystem access is not constrained by the MCP Apps iframe sandbox. Record its
actual permissions separately; do not claim OS sandboxing from an embedded UI.

## MCP Apps sandbox acceptance

Use host developer diagnostics only if permitted; redact tokens, usernames and
private content. Do not relax CSP, disable host sandboxing or enable external
runtime/network permissions to make a case pass. No malicious payload is needed.

| ID | Expected boundary / native observation | macOS | Windows |
| --- | --- | --- | --- |
| S01 | Actual host loads `ui://` HTML resource and establishes MCP Apps bridge; no page errors | NOT RUN | NOT RUN |
| S02 | Record host iframe sandbox/CSP if observable; no unapproved external scripts/styles/network; unsupported inspection remains NOT OBSERVED | NOT RUN | NOT RUN |
| S03 | Tool result reaches View; resize/theme and UI interactions work within host frame | NOT RUN | NOT RUN |
| S04 | UI-only save/apply/reject tools absent from model-visible discovery; explicitly note visibility is host policy, not cryptographic human approval | NOT RUN | NOT RUN |
| S05 | Explicit selection sharing reflects supported host capabilities; no false claim of automatic sharing | NOT RUN | NOT RUN |
| S06 | Download behavior obeys host sandbox; capture allowed/blocked outcome and native saved file | NOT RUN | NOT RUN |
| S07 | Reload/new conversation reconnects; expired/closed frame does not silently save stale content | NOT RUN | NOT RUN |
| S08 | Actual bundle size/resource limits and Document rich rendering work without reduced test substitute | NOT RUN | NOT RUN |

## Signing and status gate

Official MCPB tooling supports package signing and verification; acceptance of an
unsigned package depends on the actual host/organization policy. A checksum does
not substitute for trust. Before signing, separately decide publisher identity,
certificate procurement/cost, protected key custody, signing environment, rotation
and revocation, verification on both native hosts, and distribution/update policy.
Do not generate a self-signed key and call the package trusted or notarized.
MCPB signing is distinct from platform application signing/notarization.

Keep preview status even if functional rows pass, until the owner explicitly
accepts the OS/version record and signing/formal-distribution decision. Report
partial acceptance per OS/architecture, never extrapolate Windows from macOS or
vice versa. No merge, release or Issue closure is part of this preparation.

Official references checked 2026-10-17:

- https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
- https://github.com/modelcontextprotocol/mcpb/blob/main/README.md
- https://github.com/modelcontextprotocol/mcpb/blob/main/CLI.md
- https://modelcontextprotocol.io/extensions/apps/overview
