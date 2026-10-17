# Codex shell and browser candidate

Use an existing Codex session with shell access to operate the extracted package
through its bundled MCP client. No second Codex process, new login, native MCP
registration, source clone, npm, build or external Node is needed. The package
does not call a model provider. This route requires the host to permit a persistent
shell process, local process launch and loopback listening.

Status: Linux x64 shell/browser preview. The current Codex session exercised the
packaged model-only server and real Chromium through an external shell client and
headless browser operator. This candidate adds the missing bundled shell client;
see the separate verification record. Ordinary desktop browser association and
native Windows/macOS remain unaccepted. There is no public Release download yet.

## Start from the archive

Obtain the maintainer-supplied Linux x64 archive and adjacent checksum through the
same trusted delivery route. Retain its acceptance template and build metadata.
Verify and extract into an empty directory you own:

```sh
sha256sum -c editor-platform-claude-code-0.1.3-linux-x64.tar.gz.sha256
mkdir editor-platform-candidate
tar -xzf editor-platform-claude-code-0.1.3-linux-x64.tar.gz -C editor-platform-candidate
cd editor-platform-candidate
plugin="$PWD/plugins/editor-platform"
EDITOR_DATA_DIR="$HOME/.local/share/EditorPlatform/CodexShell" \
  "$plugin/runtime/node" "$plugin/server/shell-client.mjs"
```

Choose a dedicated absolute data directory; keep existing work and other hosts'
storage separate. This creates application data, not Codex configuration. Keep
stdin open for the whole browser session. With a shell tool, start an interactive
terminal session and send subsequent lines to that same session. A one-shot pipe
ending at EOF stops the server and disconnects the browser. `--help` prints usage
without starting a server. The initial response is a JSON `ready` event.

## Ask Codex to create and review

Codex sends one JSON object per line to the running shell client. Responses carry
the same optional `id`; tool results retain MCP `isError` and `structuredContent`.
An error is not a successful edit. Requests are processed in order.

```json
{"id":1,"method":"tools/list"}
{"id":2,"tool":"get_editor_guide","arguments":{"kind":"document"}}
```

Ask Codex to call `create_artifact` with `kind: "document"`, a fictional title and
the guide's complete `exampleContent` as `content`. Do not invent a native schema.
Use the returned artifact ID in later requests; do not paste private IDs into
public reports. Then request the browser:

```json
{"id":3,"tool":"open_editor","arguments":{}}
```

On a graphical Linux desktop the unchanged server invokes `xdg-open`. Both
`launch_requested` and `launch_unconfirmed` have `browserVerified: false`;
inspect the browser before retrying. Neither status proves visible content.
The shared browser currently says “Claude Code”; that label does not identify
which host is operating this shared runtime.

1. In Saved artifacts, open the fictional Document. Edit a heading using the real
   editor, then click Save. Ask Codex to call `read_artifact` and check the text and
   incremented revision. Unsaved edits are not automatically shared.
2. Ask Codex to propose another heading using `propose_artifact_changes` with the
   current `baseRevision`, a summary, and complete native content. Preserve other
   blocks and synchronize native rich spans with the changed text.
3. In the browser choose Reload from storage, Show proposal, then Reject. Ask
   Codex to reread: canonical content and revision must remain unchanged.
4. Request the same proposal again, preview it, and click Apply. Reread the new
   content/revision. Save/apply/reject belong to the browser; never give Codex the
   browser token or substitute direct calls to human-only operations.
5. Download the saved Markdown and inspect it. Reload the page, reopen the saved
   artifact, then stop/restart the shell client against the same data directory
   and discover it again with `list_artifacts` and `read_artifact`.

Use EOF to stop the shell client cleanly. If the process is interrupted, follow
the existing installation guide's conservative workspace-lock recovery; never
delete a lock while a writer is alive. Stop before replacing package files and
back up the complete data directory. Restart retention is not version-upgrade
acceptance. No Codex unregister command is needed because no registration occurred.

## Headless verification is a separate operator setup

The cloud run used an external Playwright operator, existing Chromium, and a
custom `xdg-open` handoff. These are **not bundled runtime requirements or an
out-of-box headless feature**. The shell client alone does not install a browser,
automate DOM input or provide a fallback URL. A user without an existing graphical
browser needs a separately reviewed operator setup; do not advertise that case as
ready using only this archive.

In the recorded setup, only the trusted browser operator received the capability
fragment via a mode-0600 file inside a mode-0700 private directory. It was never
returned through MCP, included in screenshots/transcripts or given to the model
client. The real browser removed the fragment after opening; the temporary file
was removed after shutdown. The custom opener's exit status is not evidence that
the system's normal GUI association works. Do not ship a token-printing opener or
ask a user to paste the capability into chat. No headless opener is bundled here.

## Data and proposed availability wording

Saved content returned by MCP reaches the existing Codex host and its provider;
the browser holds unsaved edits until Save. Storage is outside the extracted
package. One process owns a workspace at a time. See [security](../SECURITY.md).

Proposed LP wording: **“Linux x64 shell/browser preview — prebuilt runtime;
existing Codex shell access required. Cloud headless workflow verified with a
separate browser operator. Native MCP registration, normal GUI launch and other
OS environments are not accepted.”** Keep `codex.status` preparing if the LP
cannot express this scope or no distributable candidate/guide URL is supplied.
This document does not publish a Release, change LP configuration or close #10.
