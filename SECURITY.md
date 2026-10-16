# Security boundary

The Claude Code candidate starts an ephemeral loopback listener with a random
256-bit browser capability. It omits UI-only operations from its model stdio
connection. The browser capability is passed only to the OS opener as a fragment,
then held in tab session storage. It is not returned to the model. Local processes
with process/browser-storage access remain trusted; this is not OS isolation.
Host, Origin and bearer checks protect MCP calls. Generic HTML contains no saved
content. See docs/claude-code.md for persistence and conservative workspace locking.

This is a single-owner integration preview. Files in its data directory are not
separated by user or organization. Run one process per workspace; atomic writes
and revision serialization do not coordinate multiple server processes.

The Claude Desktop MCPB runs directly over stdio without an HTTP listener. Its
default data directory is the user's OS application-data directory under
`EditorPlatform/ClaudeDesktop`, outside the extension installation. It uses the
Desktop-provided Node runtime; it does not run npm/Git, fetch dependencies, spawn
other programs or invoke a model API at startup. This is application behavior,
not an OS-level filesystem sandbox. The unsigned bundle includes corresponding
public source and license notices; it has not undergone directory review.

The HTTP endpoint binds loopback by default. A non-loopback binding requires an
access token. Host/Origin checks reject unconfigured hosts and cross-origin browser
requests. UI communication uses the MCP Apps bridge, not credentialed cross-origin
fetch. Health reveals only availability; the local test harness is opt-in.

The server validates bounded native content and typed edits, preserves stable IDs,
and rejects stale revisions. It does not execute instructions, JavaScript or shell
commands from deck text. Text is artifact data even when passed to an AI host.

UI-only tool visibility depends on a compliant trusted MCP host; it does not prove
human approval against a malicious direct MCP client. Do not expose this preview
to untrusted clients or multiple users. Authentication, TLS, OAuth and account
isolation must be established by a reviewed deployment before shared use.

No analytics, model-provider calls, telemetry or external image fetching are added
by the plugin. Model-visible results include saved deck text, IDs and proposals;
users choose which data they share with their chat provider. The integration does
not claim to change the provider's own data handling.

Report a suspected vulnerability through GitHub private vulnerability reporting if
enabled. Do not put secrets or private deck contents in a public issue. If private
reporting is unavailable, open a minimal issue requesting a private contact path.
