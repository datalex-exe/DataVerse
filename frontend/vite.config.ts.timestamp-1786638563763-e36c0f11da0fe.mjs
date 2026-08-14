// vite.config.ts
import { defineConfig } from "file:///D:/Pranjal/sm/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Pranjal/sm/node_modules/@vitejs/plugin-react/dist/index.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///D:/Pranjal/sm/frontend/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
function wranglerDevPlugin() {
  let wranglerProcess = null;
  return {
    name: "vite-plugin-wrangler-dev",
    apply: "serve",
    // Only apply in dev server mode, never during build
    configureServer(server) {
      const apiDir = path.resolve(__dirname, "../api");
      console.log(`
[Vite Plugin] Launching Wrangler API server in ${apiDir}...
`);
      wranglerProcess = spawn("npx", ["wrangler", "dev"], {
        cwd: apiDir,
        shell: true,
        stdio: "inherit"
      });
      wranglerProcess.on("error", (err) => {
        console.error("[Vite Plugin] Failed to start Wrangler:", err.message);
      });
      server.httpServer?.once("close", () => {
        console.log("\n[Vite Plugin] Shutting down Wrangler API server...\n");
        if (wranglerProcess && !wranglerProcess.killed) {
          wranglerProcess.kill("SIGTERM");
        }
      });
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), wranglerDevPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxQcmFuamFsXFxcXHNtXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxQcmFuamFsXFxcXHNtXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9QcmFuamFsL3NtL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgc3Bhd24sIENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5cbi8vIEN1c3RvbSBWaXRlIHBsdWdpbjogbGF1bmNoZXMgd3JhbmdsZXIgZGV2IE9OTFkgZHVyaW5nIGB2aXRlYCAoZGV2IG1vZGUsIG5vdCBidWlsZClcbmZ1bmN0aW9uIHdyYW5nbGVyRGV2UGx1Z2luKCkge1xuICBsZXQgd3JhbmdsZXJQcm9jZXNzOiBDaGlsZFByb2Nlc3MgfCBudWxsID0gbnVsbDtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAndml0ZS1wbHVnaW4td3JhbmdsZXItZGV2JyxcbiAgICBhcHBseTogJ3NlcnZlJyBhcyBjb25zdCwgLy8gT25seSBhcHBseSBpbiBkZXYgc2VydmVyIG1vZGUsIG5ldmVyIGR1cmluZyBidWlsZFxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXI6IGFueSkge1xuICAgICAgY29uc3QgYXBpRGlyID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2FwaScpO1xuICAgICAgY29uc29sZS5sb2coYFxcbltWaXRlIFBsdWdpbl0gTGF1bmNoaW5nIFdyYW5nbGVyIEFQSSBzZXJ2ZXIgaW4gJHthcGlEaXJ9Li4uXFxuYCk7XG5cbiAgICAgIHdyYW5nbGVyUHJvY2VzcyA9IHNwYXduKCducHgnLCBbJ3dyYW5nbGVyJywgJ2RldiddLCB7XG4gICAgICAgIGN3ZDogYXBpRGlyLFxuICAgICAgICBzaGVsbDogdHJ1ZSxcbiAgICAgICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICAgIH0pO1xuXG4gICAgICB3cmFuZ2xlclByb2Nlc3Mub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdbVml0ZSBQbHVnaW5dIEZhaWxlZCB0byBzdGFydCBXcmFuZ2xlcjonLCBlcnIubWVzc2FnZSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gU2h1dGRvd24gd3JhbmdsZXIgd2hlbiBWaXRlIGRldiBzZXJ2ZXIgY2xvc2VzXG4gICAgICBzZXJ2ZXIuaHR0cFNlcnZlcj8ub25jZSgnY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdcXG5bVml0ZSBQbHVnaW5dIFNodXR0aW5nIGRvd24gV3JhbmdsZXIgQVBJIHNlcnZlci4uLlxcbicpO1xuICAgICAgICBpZiAod3JhbmdsZXJQcm9jZXNzICYmICF3cmFuZ2xlclByb2Nlc3Mua2lsbGVkKSB7XG4gICAgICAgICAgd3JhbmdsZXJQcm9jZXNzLmtpbGwoJ1NJR1RFUk0nKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCksIHdyYW5nbGVyRGV2UGx1Z2luKCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo4Nzg3JyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB3czogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFAsU0FBUyxvQkFBb0I7QUFDelIsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsYUFBMkI7QUFDcEMsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBSjZILElBQU0sMkNBQTJDO0FBTTVNLElBQU0sWUFBWSxLQUFLLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBRzdELFNBQVMsb0JBQW9CO0FBQzNCLE1BQUksa0JBQXVDO0FBQzNDLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQTtBQUFBLElBQ1AsZ0JBQWdCLFFBQWE7QUFDM0IsWUFBTSxTQUFTLEtBQUssUUFBUSxXQUFXLFFBQVE7QUFDL0MsY0FBUSxJQUFJO0FBQUEsaURBQW9ELE1BQU07QUFBQSxDQUFPO0FBRTdFLHdCQUFrQixNQUFNLE9BQU8sQ0FBQyxZQUFZLEtBQUssR0FBRztBQUFBLFFBQ2xELEtBQUs7QUFBQSxRQUNMLE9BQU87QUFBQSxRQUNQLE9BQU87QUFBQSxNQUNULENBQUM7QUFFRCxzQkFBZ0IsR0FBRyxTQUFTLENBQUMsUUFBUTtBQUNuQyxnQkFBUSxNQUFNLDJDQUEyQyxJQUFJLE9BQU87QUFBQSxNQUN0RSxDQUFDO0FBR0QsYUFBTyxZQUFZLEtBQUssU0FBUyxNQUFNO0FBQ3JDLGdCQUFRLElBQUksd0RBQXdEO0FBQ3BFLFlBQUksbUJBQW1CLENBQUMsZ0JBQWdCLFFBQVE7QUFDOUMsMEJBQWdCLEtBQUssU0FBUztBQUFBLFFBQ2hDO0FBQUEsTUFDRixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRjtBQUdBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLENBQUM7QUFBQSxFQUN0QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsUUFDUixJQUFJO0FBQUEsTUFDTjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsUUFDL0I7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
