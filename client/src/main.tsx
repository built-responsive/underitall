import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Extend Window interface for calculator config
declare global {
  interface Window {
    UNDERITALL_CALCULATOR_API_URL?: string;
    UNDERITALL_BRAND_ASSETS_URL?: string;
  }
}

console.log("🚀 main.tsx executed - React mounting...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ FATAL: #root element not found in DOM!");
} else {
  console.log("✅ #root element found, creating React root...");
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log("✅ React root created and rendered");
}