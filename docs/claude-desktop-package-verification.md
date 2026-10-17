# Claude Desktop MCPB: preview policy and package verification

Issue #11 remains open. The approved policy is **unsigned integration preview**;
formal distribution and accepted OS/Desktop versions remain the user's decision.
No certificate, signing service, payment, native installation, publication or CI
was initiated. The manifest's platform list is a target declaration, not acceptance.

## Official requirements checked 2026-10-17

- [Claude's installation guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
  specifies Settings → Extensions → Advanced settings → Install Extension for a
  custom `.mcpb`, provides a built-in Node runtime, and says private extensions are
  updated by manually installing the new package. It does not establish an accepted
  minimum Desktop version for this project. Record the actual Desktop and selected
  Node versions on each native OS; the candidate requires Node >=20.19.0.
- [MCPB manifest specification](https://github.com/modelcontextprotocol/mcpb/blob/70fe3b34cd6dff1b3bba046638edc72a6467a4fb/MANIFEST.md)
  supports the retained 0.3 Node manifest, `${__dirname}` entry argument and
  generated tool discovery. No new configuration fields, API keys or external
  runtimes are needed for this package. We retain the lockfile's MCPB CLI 2.1.2;
  schema validation is narrower than Desktop acceptance.
- [MCPB CLI signing documentation](https://github.com/modelcontextprotocol/mcpb/blob/70fe3b34cd6dff1b3bba046638edc72a6467a4fb/CLI.md)
  makes signing optional in the development workflow and describes `sign`, `verify`
  and `info`. Production signing uses a PEM X.509 code-signing certificate, matching
  private key and any required intermediates. This is MCPB signing, not macOS
  notarization or Windows application signing. A checksum detects changed bytes;
  it does not establish publisher identity. Self-signing does not establish trust.
- [Desktop enterprise policy](https://support.claude.com/en/articles/12622667-enterprise-configuration-for-claude-desktop)
  can disable extensions; machine policy overrides in-app controls. Do not infer
  that an unsigned preview can install in every organization, or bypass a refusal.

For any future formal offer, the user must first choose preview versus formal
status, accepted OS/Desktop versions, publisher identity, certificate procurement,
key custody, rotation/revocation and distribution/update ownership. Only after
separate authorization would a maintainer sign a reviewed bundle and verify it on
the target native trust stores. No keys were generated or requested in this task.

## Changes from main 4fee5fc

The Desktop manifest still advertised nine domains and excluded Animation despite
its inclusion in the packaged server. Its description now matches the ten-domain
candidate, including Animation's rectangle/group/native-JSON limit. Desktop still
has no React preview listener, Office export, Video or GIS adapter. No runtime
code, shared README, package.json, lockfile or public upstream pin was changed.

The packaged INSTALL.md also used relative links whose targets were not at the
archive root. Links now address the repository, with an explicit pointer to the
exact source-snapshot documents bundled in the archive.

The installation guide now distinguishes the required Node version from an
observed Desktop runtime, explains private-package manual updates and exact-hash
identification, and records policy refusals without relaxing trust settings.
The package suite additionally checks the strict 0.3 schema, absence of a signature
block, the official verifier's `unsigned` result, and one-argument path substitution
with Japanese/spaces and Windows/macOS path strings. Those string cases are **not**
native execution or installation tests.

## Local evidence

Candidate implementation/test commit: `669c81f2c4d170edd03a2befc92fe657de451d29`
(on requested main `4fee5fc39c6c31b76f3db58b4d85c7f575957b83`). Build metadata
records a clean source checkout. Later evidence-only documentation is not rebuilt.
Environment: Debian 13 x64, Node 24.19.0, Chromium 151.0.7922.173; test child runtime
also Node 20.19.0 on Linux. MCPB CLI 2.1.2 is the existing pinned dependency.
The local candidate is `release/editor-platform-claude-0.1.3.mcpb`, SHA-256
`d1e224269b6f4f015e1f451c1bc9d55f48db942199b87fa7ed85506cd9963ded`.
It has not been published.
All generated bundles, logs, runtimes and temporary workspaces stay outside Git.
A Linux Node 20.19.0 binary was downloaded for the declared-minimum runtime check;
its archive hash was verified against [Node's official SHASUMS256.txt](https://nodejs.org/dist/v20.19.0/SHASUMS256.txt):
`8a4dbcdd8bccef3132d21e8543940557e55dcf44f00f0a99ba8a062f4552e722`.
It is a test runtime only, not included in the MCPB or installed into Desktop.

| Evidence | Result |
| --- | --- |
| Pinned MCPB CLI manifest validation | PASS |
| Required local build/type/unit/browser suite | PASS: 51 unit/protocol + 26 Chromium; no retries/skips |
| MCPB packaging and isolated package checks on Node 24.19.0 | PASS: 4 checks |
| Same installed package on declared minimum Node 20.19.0 | PASS: 4 checks, server child executed on Linux Node 20.19.0 |
| Signed-in Windows / macOS Desktop installation, permissions, UI/save/reopen, update and sandbox | NOT RUN |
| Signed-package verification against native trust stores | NOT RUN; unsigned preview retained |
| Formal status / LP promotion / public distribution | Pending user decision; keep preview |

The full check passed before the final guide-link correction; the final package
rebuild repeated typecheck/build, and both runtime package runs include the new
bundled-guide link check. Initial full-check attempt failed on a test's incorrect
MCPB schema export name; it was corrected to the exported versioned schema API.
No production runtime change was needed. `mcpb info` and the verifier report the
final package **unsigned**, not a successful signed trust-chain verification.

The isolated package test launches the real bundled stdio server outside the
checkout with only its runtime files, exercises all ten native domains and saved
references/proposals, then relocates and restarts it. It does not launch Claude,
exercise its installer, prove its Node selection or certify its sandbox. Likewise,
Chromium MCP Apps harness results do not establish Windows/macOS Desktop acceptance.

## Native handoff (requires an authorized native operator)

Use the existing [OS-specific acceptance table](claude-desktop-acceptance.md).
First record the candidate commit/hash, OS/architecture, Desktop version and policy.
Then install the exact candidate, create a Document, manually edit and Save,
reopen the same ID after Desktop restart/new conversation, review/apply/reject a
proposal and check actual exported bytes. Complete the table independently for
Windows and macOS. If policy blocks installation, record BLOCKED and the exact
reason; do not change policy or trust stores to turn it into a PASS.

For hash comparison only: macOS `shasum -a 256 <candidate.mcpb>`;
Windows PowerShell `Get-FileHash <candidate.mcpb> -Algorithm SHA256`.
Match the provider's recorded hash before installation. No native run was performed
here. Keep LP's Claude Desktop offering described as an unsigned integration
preview until the user accepts the native records and chooses its formal status.
