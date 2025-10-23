import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: process.env.NODE_ENV === "production" 
    ? "https://its-under-it-all.replit.app/" 
    : "",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization","Access-Control-Allow-Origin", "Access-Control-Allow-Headers"],
      setHeaders: ["Access-Control-Allow-Origin"],
      preflightContinue: true,
      optionsSuccessStatus: 204,
      exposedHeaders: ["Content-Type", "Authorization"],
      optionsFailureStatus: 400
    },
    
    proxy: {
      "/api": {
        target: "http://0.0.0.0:5000",
        secure: false,
        changeOrigin: true,
        ws: true,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            proxyReq.setHeader("X-Forwarded-Host", req.headers.host);
          });
        },
        
        
        
        
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: ["."],
      allowList: ["./client/src"],
      denyList: ["**/.*"]
      
    },
  },
});
