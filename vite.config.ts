import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    // This Host explicitly disables Office export. Keep its optional workers
    // out of the self-contained MCP View; SlideSurface itself is unchanged.
    alias: [
      { find: /^@editor-platform\/office-export-ui\/(slide|document)$/, replacement: fileURLToPath(new URL('./src/ui/office-unavailable.tsx', import.meta.url)) },
      { find: /^mermaid$/, replacement: fileURLToPath(new URL('./node_modules/mermaid/dist/mermaid.core.mjs', import.meta.url)) },
    ],
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 10000000,
    rollupOptions: { input: 'editor.html' },
  },
});
