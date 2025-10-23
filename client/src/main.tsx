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

createRoot(document.getElementById("root")!).render(<App />);