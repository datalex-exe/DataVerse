import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Custom Vite plugin: launches wrangler dev ONLY during `vite` (dev mode, not build)
function wranglerDevPlugin() {
  let wranglerProcess: ChildProcess | null = null;
  return {
    name: 'vite-plugin-wrangler-dev',
    apply: 'serve' as const, // Only apply in dev server mode, never during build
    configureServer(server: any) {
      const apiDir = path.resolve(__dirname, '../api');
      console.log(`\n[Vite Plugin] Launching Wrangler API server in ${apiDir}...\n`);

      wranglerProcess = spawn('npx', ['wrangler', 'dev'], {
        cwd: apiDir,
        shell: true,
        stdio: 'inherit',
      });

      wranglerProcess.on('error', (err) => {
        console.error('[Vite Plugin] Failed to start Wrangler:', err.message);
      });

      // Shutdown wrangler when Vite dev server closes
      server.httpServer?.once('close', () => {
        console.log('\n[Vite Plugin] Shutting down Wrangler API server...\n');
        if (wranglerProcess && !wranglerProcess.killed) {
          wranglerProcess.kill('SIGTERM');
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wranglerDevPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
