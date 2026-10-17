import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({ plugins: [react(), viteSingleFile()], resolve: { dedupe: ['react', 'react-dom'] }, build: { target: 'es2022', outDir: 'dist-react-preview', rollupOptions: { input: 'react-preview.html' } } });
