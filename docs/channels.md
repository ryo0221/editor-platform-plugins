# Channel contracts and current acceptance

The user targets both Windows Codex app and WSL Codex CLI for completion. The
Linux shell preview is an earlier accepted subset, not the end of that work.
Do not confuse missing native machines in this cloud with unsupported products.

| Channel | Launch / installation boundary | Current acceptance |
| --- | --- | --- |
| Windows Codex app (native Windows x64 agent) | Bundled `node.exe` + `server/code.mjs`; app STDIO settings; dedicated absolute CodexApp data directory | Setup candidate; native install/browser/update acceptance NOT RUN |
| WSL Codex CLI (Linux x64) | Bundled Linux `node` + same `server/code.mjs`; official CLI registration inside WSL; dedicated CodexWsl data | Setup candidate; real WSL interop/browser/update acceptance NOT RUN |
| Existing Codex shell | Same model-only runtime via bundled shell client; separate browser operator | Limited Debian x64 preview accepted; not native registration evidence |
| Claude Code | Existing local marketplace + same code runtime/browser | Its own actual-host release gates remain pending; unchanged here |
| Claude Desktop | Existing MCPB/stdio + host MCP Apps UI, Desktop storage | Unsigned preview; native host acceptance pending; unchanged here |
| ChatGPT remote route | Requires separate operated server | Unsupported by current product policy; retained code is historical |

[Windows/WSL setup](codex-windows-wsl.md) chooses binary, installation location,
registration fields and data path. It does not implement a new editor, storage
format, auth service or provider orchestration. The underlying common runtime
continues to own native domain validation, saved revisions, explicit proposal
review, persistence and model/browser separation. Existing platform opener code
handles Windows and WSL; setup does not replace it or modify system policies.

A future channel needs only a documented launch/transport contract, permitted
host configuration, explicit separate persistent data directory, actual UI and
review authority boundary, update/removal procedure and exact-artifact host
acceptance. A stdio host can reuse the current code runtime with a local browser;
a compatible MCP Apps host can use the existing app bridge. Do not copy editor
implementations or add a new shared server/auth abstraction merely to add a host.
No additional unnamed channels are implemented by this change.
