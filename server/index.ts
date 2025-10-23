// load environment variables from .env when running locally or from the built bundle
// this uses the dotenv package (added to dependencies)
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();

// Trust proxies so req.ip and Cloudflare headers work correctly
app.set("trust proxy", true);

// CORS configuration for Shopify proxy support
const allowedOrigins = [
  'https://its-under-it-all.myshopify.com',
  'https://its-under-it-all.replit.app',
  'https://2d8f7c0c-938e-4f87-b0ca-9f262520d64e-00-2o84gg8qrj25w.spock.replit.dev',
  'http://localhost:5000',
  'http://0.0.0.0:5000',
  // Shopify Admin origins for embedded app iframe
  'https://admin.shopify.com',
  'https://partners.shopify.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow all Shopify admin subdomains (admin.shopify.com, partners.shopify.com, etc.)
    if (origin && (origin.includes('.shopify.com') || allowedOrigins.includes(origin))) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Shopify-Shop-Domain', 'X-Shopify-Access-Token'],
}));

// Capture raw body for webhook HMAC verification (before JSON parsing)
app.use("/api/webhooks", express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Standard JSON/URL parsing for non-webhook routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve brand images from both locations
app.use("/brand", express.static("client/public/brand"));
app.use("/assets/brand", express.static("extensions/underitall-blocks/assets/brand"));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const listenOptions: any = { port, host: "0.0.0.0" };
  // reusePort is not supported on some platforms (notably Windows). Only set it
  // when the platform supports it.
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();