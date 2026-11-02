import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // @ts-expect-error - available in newer vite patch releases, harmless otherwise
    allowedHosts: true,
  },
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 },
});
