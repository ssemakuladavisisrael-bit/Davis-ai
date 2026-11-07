import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Render serves Davis AI from the domain root, so built assets must use root-relative paths.
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Do not open a Vite HMR WebSocket in hosted/preview environments.
      hmr: false,
      watch: null,
    },
  };
});
