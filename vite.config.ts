import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // WebSocket-free production build for GitHub Pages.\n    // GitHub Pages does not provide a Vite HMR socket.\n    // GitHub Pages serves this repository from /Davis-ai/.
    // Keep API calls root-relative so the hosted frontend can still talk to a backend when configured.
    base: '/Davis-ai/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Do not open a Vite HMR WebSocket in hosted/preview environments.
      // The app does not depend on WebSockets for its API features.
      hmr: false,
      ws: false,
      watch: null,
    },
  };
});
