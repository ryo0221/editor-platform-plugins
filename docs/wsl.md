# WSL → Windows browser (#4)

Status: **accepted for Claude Code 0.1.5** on Windows 11 / WSL2 Ubuntu 22.04
(x86_64) with the Windows default browser (Edge 155) and Claude Code 2.1.303; see
the [0.1.5 release record](release-candidates/dc4b1c3-claude-code-0.1.5.md). Other
distributions, WSL versions and browsers are not accepted. Use the Linux x64 Code
archive for x86_64 WSL, not the Windows native archive. Windows Desktop continues
to use its separate MCPB and storage.

## Existing opener selection

On Linux, a nonempty `WSL_INTEROP`/`WSL_DISTRO_NAME`, or a kernel release containing
Microsoft/WSL, selects the WSL route. These local environment/kernel hints are not
an authentication boundary. Native macOS and Windows ignore WSL hints.

The plugin invokes existing `wslview` first. Only an executable-not-found (ENOENT)
error tries existing `explorer.exe` on PATH via WSL interoperability. It does not
fall back to xdg-open in WSL, so a Linux browser does not silently satisfy the
Windows-browser request. Ordinary Linux uses xdg-open, macOS uses open and native
Windows uses explorer.exe as before.

An opener's nonzero exit (except Explorer code 1), signal, permission error or
10-second timeout is a redacted BROWSER_UNAVAILABLE error. It does not trigger a second opener: a window
may already exist. Explorer code 1 returns `launch_unconfirmed`, not a BROWSER_UNAVAILABLE failure
or confirmed success. A zero exit returns `launch_requested`. Both carry
`browserVerified: false`; neither proves connection, rendering or visible content.
Ask the user to check the existing window before retrying. No browser acknowledgement
endpoint is introduced.
On timeout the launcher process is signalled to stop; descendants may already have
started. Inspect the actual browser before retrying.

Only the generated `http://127.0.0.1:<port>/browser#<64 lowercase hex>` URL is
accepted, with a valid nonzero TCP port. It is one argument, shell=false,
stdin/stdout/stderr ignored. No cmd/PowerShell command string is constructed.
Raw spawn errors and child output never enter tool results or logs. The existing
local trusted-machine boundary includes PATH, installed openers and their own
configuration; this is not protection against a malicious local executable.

No tools are installed; no browser defaults, WSL interop, firewall, network mode,
permissions or persistent authentication settings are changed. Do not enable
interop or install wslu merely to pass a test without the device owner's approval.

## Diagnostics and missing capability

Before an approved acceptance run, record Windows build, WSL version/distribution,
`uname -m`, Claude Code version and the package commit/hash. Inspect existing
`command -v wslview` and `command -v explorer.exe`. If both are missing, the error
asks the owner/administrator to decide whether an existing Windows URL opener and
interoperability are permitted. If one exists but fails, check its existing
association and policy. Do not treat bypassing an organization policy as recovery.

wslview is an optional external WSL Utilities tool; it can hand URLs to Windows'
default browser. Merely detecting WSL does not guarantee it, Windows interop or
loopback connectivity works. Microsoft documents Windows→WSL localhost access;
this candidate's exact URL uses 127.0.0.1 and two dynamic loopback ports (Editor and
React preview). Verify both on the device. Keep the exact host/origin; rewriting
it to a WSL IP or localhost can break React's origin checks. No public bind or LAN
port forwarding is part of this implementation.

**Manual URL fallback remains unavailable.** The capability is only passed to the
opener. open_editor returns handoff status, no URL, token or port; the browser consumes the fragment
into tab session storage and clears the address fragment. Do not retrieve it with
model tools, paste it into chat, or add diagnostic logging. When launch cannot work,
record FAIL/BLOCKED and stop; a human-only fallback would need separate review.

## Storage and acceptance

Default saved artifacts remain in WSL at
`${XDG_DATA_HOME:-~/.local/share}/EditorPlatform/ClaudeCode`, unless an absolute
EDITOR_DATA_DIR override is configured. Windows Desktop uses
`%LOCALAPPDATA%\EditorPlatform\ClaudeDesktop`; do not share these workspaces.
Back up the entire stopped Code data directory, including reference snapshots.
Exports downloaded by the Windows browser may be in Windows Downloads instead.

After separate installation/registration approval, use the existing local
marketplace procedure in [the Code guide](claude-code.md). Test with fictional data:

1. Run open_editor and observe an actual Windows browser and real editable Surface.
2. Type, Undo/Redo, explicitly Save, ask the model to reread; restart and reopen.
3. Preview/Reject and separately Apply a proposal through the human UI.
4. Verify native export/download contents and their actual destination.
5. Verify fixed React preview on the second loopback port; do not infer it from
   the first Editor port working.

Record PASS/FAIL/NOT RUN per step with OS, host version, commit, SHA and evidence.
Linux subprocess fixtures and mocked WSL/opener outcomes do not pass these rows.
The preexisting cdf02ad packages do not contain this change. A candidate generated
from this PR must have its own source commit and archive SHA; do not relabel old files.

Sources checked 2026-10-17:
- https://wslutiliti.es/wslu/man/wslview.html
- https://learn.microsoft.com/en-us/windows/wsl/filesystems
- https://learn.microsoft.com/en-us/windows/wsl/networking
