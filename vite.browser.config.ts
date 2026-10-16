import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';
export default mergeConfig(base, defineConfig({ build: { outDir: 'dist-browser', rollupOptions: { input: 'browser.html' } } }));
