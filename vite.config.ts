import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Render serves the app from the domain root; GitHub Pages uses the repository subpath.
    base: process.env.RENDER ? '/' : '/Davis-ai/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Do not open a Vite HMR WebSocket in hosted/preview environments.
      hmr: false,
      ws: false,
      watch: null,
    },
  };
});
