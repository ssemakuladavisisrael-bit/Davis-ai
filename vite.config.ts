import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages serves this repository from /Davis-ai/.
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
      watch: null,
    },
  };
});
