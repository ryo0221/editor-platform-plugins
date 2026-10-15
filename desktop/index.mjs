import { startDesktop } from '../node_modules/editor-platform-desktop-runtime/index.mjs';

try {
  await startDesktop(new URL('../', import.meta.url));
} catch (error) {
  // stdout belongs exclusively to the MCP stdio protocol.
  console.error('Editor Platform could not start:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
}
