# Recording a candidate without confusing it with acceptance

`npm run package:claude-code` now emits three adjacent files for each target:

- `editor-platform-claude-code-<version>-<target>.tar.gz`
- the existing `.tar.gz.sha256`
- `.tar.gz.acceptance-template.json`

The template hashes the completed archive and records its byte count, package
version, plugin commit, dirty-source flag, public upstream commit and complete
source-manifest hash. The same source commit/dirty flag is in `build-info.json`.
A dirty checkout is not an exact commit build: use its source manifest to identify
what was actually included, and rebuild from a reviewed clean checkout before
acceptance. The template is a maintainer-generated sidecar, not signed provenance.
Verify the archive checksum through the established distribution route.

Every actual-host scenario starts **NOT RUN**. Target `win32-x64` means a Windows
package was generated, not that Windows was tested. Actual OS/version, host/version,
browser/version and date start empty. Nothing reads a user data directory, starts
a host, inspects login state or collects local paths/usernames. No network access
is needed to generate the record. The archive format/runtime behavior is unchanged.

## Smallest reviewer handoff

1. Maintainer supplies the reviewed archive, checksum and its template together.
   Verify the archive checksum and retain all three. Copy the template to a separate
   results file; rebuilding overwrites the **template**, never edit it in place.
2. Record actual OS/architecture, WSL version if applicable, host and browser
   versions and date in that copy. A tested host version is not automatically an
   accepted minimum version. Keep secrets, private content and local paths out.
3. After approved installation, execute C1–C7 using the [Claude Code procedure](claude-code.md).
   Enter PASS/FAIL/NOT RUN and a redacted observation/evidence reference for **each**
   row. Partial success is an observation, not PASS for an entire multi-step row.
   An existing source build or `--plugin-dir` session does not satisfy C1's fresh
   persistent-install requirement. Do not repeat approved successes on the exact
   same artifact merely to fill a new form; cite their original evidence.
4. For #8, additionally request the registered React UI example, open it, insert
   a registered component, change a property, interact with Counter, Save and
   reread, then Export React TSX and inspect the ZIP's source files. Record R1.
   This is a focused actual-host check, not a second full installation exercise.
5. Return only the results and redacted evidence. The maintainer checks identity
   and remaining conditions before requesting Release approval. #5's recording
   must name the **same archive SHA-256** as the accepted Release; keep Short/Long
   paths/links and privacy-review results in the video fields after real recording.

No device installation or persistent configuration is authorized by generating a
record. Keep the existing trial data; a fresh-install test uses a separately approved
installation/data directory. Never delete or replace prior saved work to pass C1.
The generator does not close issues, publish releases, change LP status, certify
signatures or validate that manually supplied evidence proves acceptance.

Codex and Desktop retain their host-specific [Codex](codex.md) and
[Desktop](claude-desktop-acceptance.md) procedures; do not label this Claude Code
C1–C7 template as their acceptance. For #4 use a separate copy per actual OS and
artifact. A Linux harness cannot fill native Windows/macOS results.
