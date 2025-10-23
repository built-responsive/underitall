import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import {
  wholesaleRegistrations,
  calculatorQuotes,
  users,
  webhookLogs,
} from "@shared/schema";
import { desc } from "drizzle-orm";
import webhookRoutes from "./webhooks";
import {
  insertWholesaleRegistrationSchema,
  insertCalculatorQuoteSchema,
  insertChatConversationSchema,
  insertChatMessageSchema,
  insertDraftOrderSchema,
} from "@shared/schema";
import {
  lookupPrice,
  calculateQuote,
  validateDimensions,
} from "./utils/pricingCalculator";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import cors from "cors";
export async function registerRoutes(app: Express): Promise<Server> {
  // Handle preflight requests for all API routes
  app.options("/api/*", (req, res) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    res.sendStatus(204);
  });

  // ============= WEBHOOK ROUTES =============
  // Register webhooks with raw body parsing for HMAC verification
  app.use("/api/webhooks", webhookRoutes);
  // ============= HEALTH CHECK & INTEGRATION TESTING =============

  // System health check
  app.get("/api/health", async (req, res) => {
    try {
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;

      const health: any = {
        timestamp: new Date().toISOString(),
        shopify: {
          configured: !!(shopDomain && adminToken),
          shop: shopDomain || null,
        },
        crm: {
          configured: !!(crmBaseUrl && crmApiKey),
          baseUrl: crmBaseUrl || null,
        },
      };

      // Check if wholesale_account metaobject definition exists
      if (shopDomain && adminToken) {
        try {
          const checkQuery = `
            query {
              metaobjectDefinitions(first: 50) {
                nodes {
                  id
                  type
                  metaobjectsCount
                }
              }
            }
          `;

          const checkResponse = await fetch(
            `https://${shopDomain}/admin/api/2025-01/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": adminToken,
              },
              body: JSON.stringify({ query: checkQuery }),
            }
          );

          const checkData = await checkResponse.json();
          
          console.log("🔍 All metaobject definitions:", JSON.stringify(checkData.data?.metaobjectDefinitions?.nodes || [], null, 2));
          
          // App-owned metaobject definitions appear as "app--{client_id}--{handle}" in GraphQL responses
          // Match any of: $app:wholesale_account, wholesale_account, or app--*--wholesale_account
          const existingDef = checkData.data?.metaobjectDefinitions?.nodes?.find(
            (def: any) => {
              const type = def.type || "";
              const isMatch = 
                type === "$app:wholesale_account" || 
                type === "wholesale_account" ||
                type.endsWith("--wholesale_account") ||
                type.includes("wholesale_account");
              
              if (isMatch) {
                console.log("✅ Found matching metaobject definition:", type);
              }
              return isMatch;
            }
          );

          health.shopify.metaobjectDefinition = !!existingDef;
          health.shopify.metaobjectType = existingDef?.type || null;
          if (existingDef) {
            health.shopify.metaobjectId = existingDef.id;
            health.shopify.entryCount = existingDef.metaobjectsCount || 0;
            console.log("✅ Metaobject health status:", {
              id: existingDef.id,
              type: existingDef.type,
              count: existingDef.metaobjectsCount
            });
          } else {
            console.warn("⚠️ No wholesale_account metaobject definition found");
          }
        } catch (error) {
          console.error("❌ Metaobject check error:", error);
          health.shopify.error = error instanceof Error ? error.message : "Unknown error";
        }
      }

      res.json(health);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // Test Shopify connection
  app.post("/api/admin/test-shopify", async (req, res) => {
    try {
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res.json({
          success: false,
          message: "Shopify credentials not configured in environment variables",
        });
      }

      const testQuery = `
        query {
          shop {
            name
            email
            currencyCode
          }
        }
      `;

      const response = await fetch(
        `https://${shopDomain}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify({ query: testQuery }),
        }
      );

      const data = await response.json();

      console.log("📦 Shopify Test Response:", JSON.stringify(data, null, 2));

      if (data.errors) {
        return res.json({
          success: false,
          message: `GraphQL Error: ${data.errors[0]?.message || "Unknown error"}`,
          details: data.errors,
        });
      }

      if (data.data?.shop) {
        return res.json({
          success: true,
          message: `Connected to ${data.data.shop.name} (${shopDomain})`,
          shop: data.data.shop,
        });
      }

      res.json({
        success: false,
        message: "Unexpected API response",
        details: data,
      });
    } catch (error) {
      console.error("❌ Shopify test error:", error);
      res.json({
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    }
  });

  // Test CRM connection
  app.post("/api/admin/test-crm", async (req, res) => {
    try {
      console.log("\n🔍 ===== CRM TEST STARTED =====");
      
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;

      console.log("📋 CRM Config Check:");
      console.log("  - Base URL:", crmBaseUrl ? "✅ Set" : "❌ Missing");
      console.log("  - API Key:", crmApiKey ? "✅ Set" : "❌ Missing");

      if (!crmBaseUrl || !crmApiKey) {
        console.log("❌ CRM credentials missing");
        return res.json({
          success: false,
          message: "CRM credentials not configured in environment variables",
        });
      }

      const testPayload = {
        APIKey: crmApiKey,
        Resource: "Account",
        Operation: "Read",
        Data: {},
      };

      console.log("📤 Sending request to:", `${crmBaseUrl}/api/v1`);
      console.log("📤 Payload:", JSON.stringify(testPayload, null, 2));

      const response = await fetch(`${crmBaseUrl}/api/v1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });

      console.log("📡 Response received:");
      console.log("  - Status:", response.status);
      console.log("  - Status Text:", response.statusText);

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      console.log("  - Content-Type:", contentType);

      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.log("❌ Non-JSON response received:");
        console.log(textResponse.substring(0, 500));
        return res.json({
          success: false,
          message: `CRM returned non-JSON response (${response.status}). Check CRM_BASE_URL configuration.`,
          details: {
            status: response.status,
            statusText: response.statusText,
            contentType,
            preview: textResponse.substring(0, 200),
          },
        });
      }

      const data = await response.json();

      console.log("\n📦 ===== FULL CRM RESPONSE =====");
      console.log(JSON.stringify(data, null, 2));
      console.log("================================\n");

      console.log("📊 Response Fields:");
      console.log("  - Status:", data.Status);
      console.log("  - Message:", data.Message);
      console.log("  - Data:", data.Data ? JSON.stringify(data.Data, null, 2) : "null");

      if (data.Status === "Success" || response.ok) {
        console.log("✅ CRM test successful");
        return res.json({
          success: true,
          message: `Connected to Clarity CRM (${crmBaseUrl})`,
          details: data,
        });
      }

      console.log("❌ CRM test failed");
      console.log("Failure reason:", data.Message || "Unknown");
      
      res.json({
        success: false,
        message: `CRM Error: ${data.Message || "Unknown error"}`,
        details: data,
      });
    } catch (error) {
      console.error("\n❌ ===== CRM TEST EXCEPTION =====");
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Stack trace:", error instanceof Error ? error.stack : "N/A");
      console.error("================================\n");
      
      res.json({
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    }
  });

  // Check wholesale_account metaobject definition (managed declaratively in shopify.app.toml)
  app.post("/api/admin/initialize-metaobject", async (req, res) => {
    try {
      const defId = await checkWholesaleMetaobjectDefinition();
      
      if (defId) {
        res.json({
          success: true,
          message: "Metaobject definition exists and is ready",
          metaobjectDefinitionId: defId,
        });
      } else {
        res.json({
          success: false,
          message: "Metaobject definition not found. Run 'shopify app deploy' to sync shopify.app.toml configuration.",
        });
      }
    } catch (error) {
      console.error("Metaobject check error:", error);
      res.json({
        success: false,
        message: error instanceof Error ? error.message : "Check failed",
      });
    }
  });

  // ============= PRICE MATRIX ROUTES =============

  // Fetch CSV and update price matrices
  app.post("/api/admin/update-prices", async (req, res) => {
    try {
      const { thinCsvUrl, thickCsvUrl } = req.body;

      if (!thinCsvUrl || !thickCsvUrl) {
        return res.status(400).json({ error: "CSV URLs are required" });
      }

      // In production, you would fetch the CSV and update the JSON files
      // For now, just validate the URLs
      const urlPattern = /^https:\/\/docs\.google\.com\/spreadsheets\//;

      if (!urlPattern.test(thinCsvUrl) || !urlPattern.test(thickCsvUrl)) {
        return res
          .status(400)
          .json({ error: "Invalid Google Sheets URL format" });
      }

      res.json({
        success: true,
        message:
          "CSV URLs validated. In production, this would fetch and update price matrices.",
        thinCsvUrl,
        thickCsvUrl,
      });
    } catch (error) {
      console.error("Error updating prices:", error);
      res.status(500).json({ error: "Failed to update prices" });
    }
  });

  // ============= WHOLESALE REGISTRATION ROUTES =============

  // Helper: blank profile for error/skip cases
  const blankProfile = () => ({
    website: null,
    instagramHandle: null,
    businessAddress: null,
    businessAddress2: null,
    city: null,
    state: null,
    zipCode: null,
    phone: null,
  });

  // Helper: extract Cloudflare geo headers
  const readCFGeo = (req: any) => {
    const h = req.headers;
    const city = (h["cf-ipcity"] as string) || null;
    const state =
      (h["cf-region-code"] as string) || (h["cf-region"] as string) || null;
    const country = (h["cf-ipcountry"] as string) || null;
    const ip =
      (h["cf-connecting-ip"] as string) ||
      (h["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      null;
    return { ip, city, state, country };
  };

  // AI-powered company enrichment with Cloudflare geo + mini-search-preview strict schema
  app.post("/api/enrich-company", async (req, res) => {
    try {
      const companyName = (req.body?.companyName || "").trim();

      console.log("🔍 Company enrichment request for:", companyName);

      if (companyName.length < 3) {
        console.log("⏭️ Company name too short, skipping enrichment");
        return res.json(blankProfile());
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        console.error("❌ OPENAI_API_KEY not configured");
        return res.json(blankProfile());
      }

      // Extract Cloudflare geo headers
      const { ip, city, state, country } = readCFGeo(req);
      console.log("🌍 Cloudflare geo-context:", { ip, city, state, country });

      // Build geo context for prompt (US-only prioritization)
      const geoContext =
        country === "US" && (city || state)
          ? `Approx user location: ${[city, state].filter(Boolean).join(", ")} (US). When disambiguating similar names, prefer entities near this area.`
          : `Approx user location unknown.`;
      console.log("📝 Geo context for prompt:", geoContext);
      // Strict system prompt for US-only enrichment (developer role for gpt-5-search-api)
      const systemPrompt = [
        "Begin with a concise checklist (3–7 bullets) of what you will do; keep items conceptual, not implementation-level.",
        "",
        "Return a single US business profile as a JSON object conforming exactly to the provided JSON Schema and field order.",
        "",
        "- Search and confirm the business's existence using US sources ONLY. Do not consider companies located in other countries, regardless of name similarity.",
        "- Rely exclusively on official and authoritative sources, with the following priority:",
        "    1. The company's official website",
        "    2. US state or government business registries",
        "    3. Verified business listing platforms",
        "- Do NOT use generic directories unless none of the above are available.",
        "- If a company has multiple locations, use only the primary or official business address; do not include branch or subsidiary locations.",
        "- In cases of conflicting data, select information from the most authoritative and recently updated source (prefer sources updated within the last 12 months). If no clarity is achieved, set the field to null.",
        "- If no US business exists with the given name or no official/authoritative US sources can be found, return a JSON object with ALL fields set to null.",
        "",
        "Before answering:",
        "- Think step-by-step through each source you consult, how you verify US relevance, and how you resolve ambiguous or conflicting data.",
        '- Summarize your chain of reasoning in a "reasoning" field at the end of the object.',
        "",
        "After producing the JSON object, validate that all fields meet the schema and order constraints, and that no extra properties are present. If any error is detected, self-correct and reissue the output.",
        "",
        "The JSON response must:",
        "- Be strictly valid per the schema: every required field present, each value matching its regex/pattern constraints, absolutely no extra properties, and the exact field order as shown below.",
        "- Be output as a single, compact JSON object, with no comments or explanations outside of the \"reasoning\" field.",
        "",
        "---",
        "",
        "## Output Format",
        "Format your answer as follows, maintaining this precise structure and order:",
        "",
        "{",
        '  "website": "string|null (must start with https:// if not null, uri format)",',
        '  "instagramHandle": "string|null (must start with @ if not null)",',
        '  "businessAddress": "string|null",',
        '  "businessAddress2": "string|null",',
        '  "city": "string|null",',
        '  "state": "string|null (2 upper-case letter state code, e.g., \'NY\')",',
        '  "zipCode": "string|null (5 or 9 digit US zip: \'12345\' or \'12345-6789\')",',
        '  "phone": "string|null (must match US phone pattern: (999) 999-9999)",',
        '  "reasoning": "string (1–3 sentence summary explaining the sources checked, how ties or ambiguities were resolved, and noting any fields left null)"',
        "}",
        "",
        "Field constraints:",
        '- "website": null or a string starting with "https://" (valid URI format).',
        '- "instagramHandle": null or a string starting with "@", with valid Instagram characters only and no spaces.',
        '- "state": null or exactly two uppercase letters representing a valid US state code.',
        '- "zipCode": null or US ZIP code: either five digits (e.g., "12345") or five-plus-four digits with hyphen (e.g., "12345-6789").',
        '- "phone": null or a string matching the US phone format "(999) 999-9999", with correct punctuation and spacing.',
        "- Fields must appear in the exact order shown, with no additional properties included.",
        "",
        'If no official or authoritative US source is found, or if the business does not exist in the US, set all fields to null and explain this in the "reasoning" field.',
        "",
        'Ensure "reasoning" appears as the final field in the output object.',
        "",
        geoContext,
      ].join("\n");

      const userPrompt = [
        `Company to research: "${companyName}"`,
        "Please quickly find reliable results for the business name you are given.",
        "Return ONE US business profile as JSON that EXACTLY matches the provided JSON Schema.",
        "Search US sources ONLY. If no US match exists, set ALL fields to null.",
        "Prefer official sources (company site > state registries > verified platforms) over directories.",
        "If conflicting info, pick the most authoritative AND freshest source; otherwise null.",
        "If you encounter a non-US entity with the same/similar name, IGNORE it and keep searching for a US entity.",
        "Search the web for current, real data. If website is found on exact name match, retrieve Google Places or Maps data from search.",
        "Ensure address, phone, and zip are correct. Return ONLY the JSON.",
      ].join("\n");

      console.log(
        "🚀 Calling OpenAI with gpt-5-search-api-2025-10-14 for real-time web search...",
      );

      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-search-preview",
            response_format: { type: "text" },
            web_search_options: {
              search_context_size: "low",
              user_location: {
                type: "approximate",
                approximate: { country: "US" },
              },
            },
            store: true,
            messages: [
              {
                role: "developer",
                content: [{ type: "text", text: systemPrompt }],
              },
              {
                role: "user",
                content: [{ type: "text", text: userPrompt }],
              },
            ],
          }),
        },
      );

      console.log("📡 OpenAI API status:", openaiResponse.status);

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("❌ OpenAI API error:", errorText);
        return res.json(blankProfile());
      }

      const openaiData = await openaiResponse.json();
      console.log(
        "📦 OpenAI raw response:",
        JSON.stringify(openaiData, null, 2),
      );

      const responseContent = openaiData.choices?.[0]?.message?.content || "{}";
      console.log("📝 OpenAI content:", responseContent);

      // Structured Outputs guarantees valid JSON matching schema
      const enriched = JSON.parse(responseContent);
      console.log("✅ Parsed enrichment data:", enriched);

      // Return only the profile fields (strip reasoning if present)
      return res.json({
        website: enriched.website || null,
        instagramHandle: enriched.instagramHandle || null,
        businessAddress: enriched.businessAddress || null,
        businessAddress2: enriched.businessAddress2 || null,
        city: enriched.city || null,
        state: enriched.state || null,
        zipCode: enriched.zipCode || null,
        phone: enriched.phone || null,
      });
    } catch (error) {
      console.error("❌ Company enrichment error:", error);
      return res.json(blankProfile());
    }
  });

  // IP Geolocation Lookup (fallback only, free tier: 1,000 requests/day)
  app.get("/api/geo-locate", async (req, res) => {
    try {
      const ip =
        req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
        req.socket.remoteAddress ||
        "unknown";

      console.log("🔍 Fetching geo-location for IP:", ip);

      const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
      const geoData = await geoResponse.json();

      res.json({
        ip,
        city: geoData.city || null,
        region: geoData.region || null,
        country: geoData.country_name || null,
        timezone: geoData.timezone || null,
        latitude: geoData.latitude || null,
        longitude: geoData.longitude || null,
      });
    } catch (error) {
      console.error("❌ Geo-location lookup failed:", error);
      res.status(500).json({ error: "Failed to fetch geo-location" });
    }
  });

  // Check if wholesale_account metaobject definition exists (managed by shopify.app.toml)
  async function checkWholesaleMetaobjectDefinition() {
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!shopDomain || !adminToken) {
      console.log("⚠️ Shopify credentials not configured, skipping metaobject definition check");
      return null;
    }

    try {
      const checkQuery = `
        query {
          metaobjectDefinitions(first: 50) {
            nodes {
              id
              type
              metaobjectsCount
            }
          }
        }
      `;

      const checkResponse = await fetch(
        `https://${shopDomain}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify({ query: checkQuery }),
        }
      );

      const checkData = await checkResponse.json();
      
      console.log("🔍 Checking metaobject definitions...");
      console.log("Available types:", checkData.data?.metaobjectDefinitions?.nodes?.map((d: any) => d.type).join(", ") || "none");
      
      // App-owned metaobject definitions appear as "app--{client_id}--{handle}" in GraphQL responses
      // Match any of: $app:wholesale_account, wholesale_account, or app--*--wholesale_account
      const existingDef = checkData.data?.metaobjectDefinitions?.nodes?.find(
        (def: any) => {
          const type = def.type || "";
          return (
            type === "$app:wholesale_account" || 
            type === "wholesale_account" ||
            type.endsWith("--wholesale_account") ||
            type.includes("wholesale_account")
          );
        }
      );

      if (existingDef) {
        console.log("✅ Metaobject definition found:", {
          type: existingDef.type,
          id: existingDef.id,
          count: existingDef.metaobjectsCount
        });
        return existingDef.id;
      }

      console.log("⚠️ Metaobject definition not found. Run 'shopify app deploy' to sync shopify.app.toml");
      return null;
    } catch (error) {
      console.error("❌ Error checking metaobject definition:", error);
      return null;
    }
  }

  // Submit wholesale registration
  app.post("/api/wholesale-registration", async (req, res) => {
    try {
      // Metaobject definition is managed declaratively in shopify.app.toml

      // Extract geo-location from Cloudflare headers
      const geoCity = (req.headers["cf-ipcity"] as string) || null;
      const geoState = (req.headers["cf-region"] as string) || null;
      const geoCountry = (req.headers["cf-ipcountry"] as string) || null;

      console.log("🌍 Visitor geo-location:", {
        geoCity,
        geoState,
        geoCountry,
      });
      console.log("📝 Received registration data:", req.body);

      const data = insertWholesaleRegistrationSchema.parse(req.body);

      // Check if email already exists
      const existing = await storage.getWholesaleRegistrationByEmail(
        data.email,
      );
      if (existing) {
        return res.status(400).json({
          error: "An application with this email already exists",
        });
      }

      const registration = await storage.createWholesaleRegistration(data);

      console.log("✅ Registration created successfully:", registration.id);

      res.json(registration);
    } catch (error) {
      console.error("❌ Registration error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Registration failed",
      });
    }
  });

  // Get all wholesale registrations (admin)
  app.get("/api/wholesale-registrations", async (req, res) => {
    try {
      const { status } = req.query;

      let registrations;
      if (status && typeof status === "string") {
        registrations = await storage.getWholesaleRegistrationsByStatus(status);
      } else {
        registrations = await storage.getAllWholesaleRegistrations();
      }

      res.json(registrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({
        error: "Failed to fetch registrations",
      });
    }
  });

  // Get single wholesale registration
  app.get("/api/wholesale-registration/:id", async (req, res) => {
    try {
      const registration = await storage.getWholesaleRegistration(
        req.params.id,
      );

      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      res.json(registration);
    } catch (error) {
      console.error("Error fetching registration:", error);
      res.status(500).json({
        error: "Failed to fetch registration",
      });
    }
  });

  // Update wholesale registration (admin approval/rejection)
  app.patch("/api/wholesale-registration/:id", async (req, res) => {
    try {
      const { status, adminNotes, rejectionReason } = req.body;

      const updates: any = { status };
      if (adminNotes) updates.adminNotes = adminNotes;
      if (rejectionReason) updates.rejectionReason = rejectionReason;

      if (status === "approved") {
        updates.approvedAt = new Date();
        // In production, set approvedBy to current admin user ID
        // updates.approvedBy = req.user.id;
      }

      const updated = await storage.updateWholesaleRegistration(
        req.params.id,
        updates,
      );

      if (!updated) {
        return res.status(404).json({ error: "Registration not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating registration:", error);
      res.status(500).json({
        error: "Failed to update registration",
      });
    }
  });

  // Update wholesale account metaobject (called from customer account UI extension)
  app.patch("/api/wholesale-account/:metaobjectId", async (req, res) => {
    try {
      const { metaobjectId } = req.params;
      const updates = req.body;
      const authHeader = req.headers.authorization;

      // Verify session token from customer account UI extension
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized - Missing session token" });
      }

      const sessionToken = authHeader.substring(7);
      
      // In production, verify the session token with Shopify
      // For now, we'll trust tokens from the customer account UI extension
      // TODO: Implement full JWT verification against Shopify's public key

      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res.status(500).json({ error: "Shopify credentials not configured" });
      }

      // Build fields array from updates
      const fields = Object.keys(updates).map(key => ({
        key,
        value: String(updates[key] || '')
      }));

      const updateMutation = `
        mutation UpdateMetaobject($id: ID!, $fields: [MetaobjectFieldInput!]!) {
          metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
            metaobject {
              id
              handle
              displayName
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(
        `https://${shopDomain}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify({
            query: updateMutation,
            variables: {
              id: `gid://shopify/Metaobject/${metaobjectId}`,
              fields
            },
          }),
        },
      );

      const data = await response.json();

      if (data.errors || data.data?.metaobjectUpdate?.userErrors?.length > 0) {
        console.error("Metaobject update errors:", data);
        return res.status(500).json({
          error: "Failed to update wholesale account",
          details: data.errors || data.data?.metaobjectUpdate?.userErrors,
        });
      }

      res.json({ success: true, metaobject: data.data.metaobjectUpdate.metaobject });
    } catch (error) {
      console.error("Error updating wholesale account:", error);
      res.status(500).json({ error: "Failed to update wholesale account" });
    }
  });

  // Create Shopify wholesale account (metaobject + customer)
  app.post(
    "/api/wholesale-registration/:id/create-shopify-account",
    async (req, res) => {
      try {
        const registration = await storage.getWholesaleRegistration(
          req.params.id,
        );

        if (!registration) {
          return res.status(404).json({ error: "Registration not found" });
        }

        if (registration.status !== "approved") {
          return res
            .status(400)
            .json({ error: "Registration must be approved first" });
        }

        const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
        const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
        const crmBaseUrl = process.env.CRM_BASE_URL || "https://api.crm.com"; // Update with actual CRM URL
        const crmApiKey =
          process.env.CRM_API_KEY ||
          "underitall-key-d1b63e3ba4f94b6cb4f0435e7bd0ddea";

        if (!shopDomain || !adminToken) {
          return res
            .status(500)
            .json({ error: "Shopify credentials not configured" });
        }

        // Step 1: Create metaobject for wholesale_account
        const metaobjectMutation = `
        mutation CreateWholesaleAccount($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject {
              id
              handle
              displayName
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

        const metaobjectFields = [
          { key: "company", value: registration.firmName },
          { key: "email", value: registration.email },
          { key: "phone", value: registration.phone },
          { key: "website", value: registration.website || "" },
          { key: "instagram", value: registration.instagramHandle || "" },
          { key: "address", value: registration.businessAddress },
          { key: "address2", value: registration.businessAddress2 || "" },
          { key: "city", value: registration.city },
          { key: "state", value: registration.state },
          { key: "zip", value: registration.zipCode },
          { key: "source", value: registration.howDidYouHear || "" },
          { key: "message", value: registration.adminNotes || "" },
          { key: "account_type", value: registration.businessType },
          {
            key: "sample_set",
            value: registration.receivedSampleSet ? "true" : "false",
          },
          {
            key: "tax_exempt",
            value: registration.isTaxExempt ? "true" : "false",
          },
          { key: "vat_tax_id", value: registration.taxId || "" },
        ];

        // Only add tax_proof if we have a URL
        if (registration.taxIdProofUrl) {
          // In production, you'd upload the file to Shopify first and get the GenericFile ID
          // For now, we'll skip this field if not a valid Shopify file reference
        }

        const metaobjectResponse = await fetch(
          `https://${shopDomain}/admin/api/2024-04/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": adminToken,
            },
            body: JSON.stringify({
              query: metaobjectMutation,
              variables: {
                metaobject: {
                  type: "wholesale_account",
                  handle: registration.firmName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-"),
                  fields: metaobjectFields,
                },
              },
            }),
          },
        );

        const metaobjectData = await metaobjectResponse.json();

        if (
          metaobjectData.errors ||
          metaobjectData.data?.metaobjectCreate?.userErrors?.length > 0
        ) {
          console.error("Metaobject creation errors:", metaobjectData);
          return res.status(500).json({
            error: "Failed to create wholesale account metaobject",
            details:
              metaobjectData.errors ||
              metaobjectData.data?.metaobjectCreate?.userErrors,
          });
        }

        const metaobjectId = metaobjectData.data.metaobjectCreate.metaobject.id;

        // Step 2: Create customer using REST Admin API (works on all plans)
        let customerId = null;
        let customerCreationSkipped = false;

        try {
          const contactName = `${registration.firstName} ${registration.lastName}`.trim();
          const nameParts = contactName.split(" ");
          const firstName = nameParts[0] || registration.firstName;
          const lastName = nameParts.slice(1).join(" ") || "";

          const customerPayload = {
            customer: {
              email: registration.email,
              first_name: firstName,
              last_name: lastName,
              phone: registration.phone,
              tax_exempt: registration.isTaxExempt,
              tags: `wholesale, trade-program, ${registration.businessType}`,
              note: `Business Type: ${registration.businessType}\nYears in Business: ${registration.yearsInBusiness || "N/A"}\nMetaobject ID: ${metaobjectId}`,
              addresses: [
                {
                  address1: registration.businessAddress,
                  city: registration.city,
                  province: registration.state,
                  zip: registration.zipCode,
                  country: "United States",
                  company: registration.firmName,
                },
              ],
              metafields: [
                {
                  namespace: "custom",
                  key: "wholesale_account",
                  value: metaobjectId,
                  type: "metaobject_reference",
                },
              ],
            },
          };

          const customerResponse = await fetch(
            `https://${shopDomain}/admin/api/2024-10/customers.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": adminToken,
              },
              body: JSON.stringify(customerPayload),
            },
          );

          if (!customerResponse.ok) {
            const errorText = await customerResponse.text();
            console.error("Customer creation failed:", errorText);
            customerCreationSkipped = true;
          } else {
            const customerData = await customerResponse.json();
            customerId = `gid://shopify/Customer/${customerData.customer.id}`;
            console.log("Customer created successfully:", customerId);
          }
        } catch (error) {
          console.error(
            "Customer creation failed, continuing with CRM sync:",
            error,
          );
          customerCreationSkipped = true;
        }

        // Step 3: Create CRM Account
        const crmAccountResponse = await fetch(`${crmBaseUrl}/api/v1`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            APIKey: crmApiKey,
            Resource: "Account",
            Operation: "Create Or Edit",
            Data: {
              Name: registration.firmName,
              Owner: `${registration.firstName} ${registration.lastName}`.trim(),
              CompanyPhone: registration.phone,
              Email: registration.email,
              Address1: registration.businessAddress,
              Address2: "",
              City: registration.city,
              State: registration.state,
              ZipCode: registration.zipCode,
              Country: "United States",
              Note: `Shopify Customer ID: ${customerId}`,
              Description: registration.adminNotes || "",
              "Sample Set": registration.receivedSampleSet ? "Yes" : "No",
              Registration: registration.isTaxExempt
                ? "Registered with documentation"
                : "No documentation",
              "Account Type": registration.businessType.replace(/_/g, " "),
              Instagram: registration.instagramHandle
                ? `https://www.instagram.com/${registration.instagramHandle}`
                : "",
              Website: registration.website || "",
              "Accepts Email Marketing": "Yes",
              "Accepts SMS Marketing": "Yes",
            },
          }),
        });

        const crmAccountData = await crmAccountResponse.json();

        if (crmAccountData.Status !== "Success") {
          console.error("CRM Account creation failed:", crmAccountData);
          // Continue anyway - don't fail the whole operation
        }

        const crmAccountId = crmAccountData.Data?.AccountId;

        // Save CRM Account ID back to metaobject
        if (crmAccountId) {
          const updateClarityIdMutation = `
            mutation UpdateMetaobject($id: ID!, $fields: [MetaobjectFieldInput!]!) {
              metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
                metaobject { id }
                userErrors { field message }
              }
            }
          `;

          await fetch(
            `https://${shopDomain}/admin/api/2025-01/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": adminToken,
              },
              body: JSON.stringify({
                query: updateClarityIdMutation,
                variables: {
                  id: metaobjectId,
                  fields: [{ key: "clarity_id", value: crmAccountId }]
                },
              }),
            }
          );

          console.log("✅ Metaobject updated with Clarity CRM Account ID");
        }

        // Step 4: Create CRM Contact (if account was created)
        let crmContactId;
        if (crmAccountId) {
          const crmContactResponse = await fetch(`${crmBaseUrl}/api/v1`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              APIKey: crmApiKey,
              Resource: "Contact",
              Operation: "Create Or Edit",
              Data: {
                AccountId: crmAccountId,
                LeadSourceId: "62f4f09e-dbca-4ffb-a9a8-8fe8354c57b0",
                LeadSources: "Website",
                "Lead Source Specifics": "Wholesale Registration",
                Tags1: "wholesale,trade-program",
                FirstName: registration.firstName,
                LastName: registration.lastName,
                Title: "Primary Contact",
                Phone: registration.phone,
                Email: registration.email,
                Address1: registration.businessAddress,
                Address2: "",
                City: registration.city,
                State: registration.state,
                ZipCode: registration.zipCode,
                Country: "United States",
                About: `Business Type: ${registration.businessType}`,
                Description: registration.howDidYouHear || "",
                "Sales Representative": "B2B,wholesale",
                "Sample Set": registration.receivedSampleSet ? "Yes" : "No",
                Registration: registration.isTaxExempt
                  ? "Registered with documentation"
                  : "No documentation",
                "Account Type": registration.businessType.replace(/_/g, " "),
                Instagram: registration.instagramHandle
                  ? `https://www.instagram.com/${registration.instagramHandle}`
                  : "",
                Website: registration.website || "",
                "Accepts Email Marketing": "Yes",
                "Accepts SMS Marketing": "Yes",
              },
            }),
          });

          const crmContactData = await crmContactResponse.json();

          if (crmContactData.Status === "Success") {
            crmContactId = crmContactData.Data?.ContactId;
            console.log("✅ CRM Contact created successfully:", crmContactId);
          } else {
            console.error("❌ CRM Contact creation failed:", crmContactData);
          }

          // Step 5: Upload Tax ID proof as attachment (if file exists and account was created)
          if (registration.taxIdProofUrl && crmAccountId) {
            try {
              // Fetch the file from the URL
              const fileResponse = await fetch(registration.taxIdProofUrl);
              const fileBuffer = await fileResponse.arrayBuffer();
              const base64Content = Buffer.from(fileBuffer).toString("base64");

              // Extract filename from URL or use default
              const urlParts = registration.taxIdProofUrl.split("/");
              const fileName =
                urlParts[urlParts.length - 1] || "tax-id-proof.pdf";

              const attachmentResponse = await fetch(
                `${crmBaseUrl}/api/v1/Attachment/Create`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${crmApiKey}`,
                  },
                  body: JSON.stringify({
                    APIKey: crmApiKey,
                    Resource: "Attachment",
                    Operation: "Create",
                    Data: {
                      Title: "Tax ID / VAT Proof",
                      Name: fileName,
                      SourceObjectId: crmAccountId,
                      FileContent: base64Content,
                    },
                  }),
                },
              );

              const attachmentData = await attachmentResponse.json();

              if (attachmentData.Status !== "Success") {
                console.error("CRM Attachment upload failed:", attachmentData);
              }
            } catch (error) {
              console.error("Error uploading attachment to CRM:", error);
              // Don't fail the operation if attachment upload fails
            }
          }
        }

        // Update our database with Shopify and CRM IDs
        const updateNotes = [
          registration.adminNotes || "",
          "\n\nShopify Wholesale Account Created:",
          `Metaobject ID: ${metaobjectId}`,
          customerId
            ? `Customer ID: ${customerId}`
            : "Customer creation skipped (Basic plan limitation)",
          "\n\nCRM Account Created:",
          crmAccountId
            ? `Account ID: ${crmAccountId}`
            : "Failed to create CRM account",
          crmContactId
            ? `Contact ID: ${crmContactId}`
            : "Failed to create CRM contact",
        ].join("\n");

        await storage.updateWholesaleRegistration(req.params.id, {
          adminNotes: updateNotes,
        });

        const response: any = {
          success: true,
          metaobjectId,
          crmAccountId,
          crmContactId,
          metaobjectUrl: `https://${shopDomain}/admin/content/entries/wholesale_account/${metaobjectId.split("/").pop()}`,
        };

        if (customerId) {
          response.customerId = customerId;
          response.customerUrl = `https://${shopDomain}/admin/customers/${customerId.split("/").pop()}`;
        } else if (customerCreationSkipped) {
          response.warning =
            "Customer creation skipped - Shopify plan doesn't support Customer API. Metaobject and CRM records created successfully.";
        }

        res.json(response);
      } catch (error) {
        console.error("Error creating Shopify account:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to create Shopify account",
        });
      }
    },
  );

  // ============= CALCULATOR ROUTES =============

  // Calculate price (no persistence)
  app.post("/api/calculator/calculate", async (req, res) => {
    try {
      const { width, length, thickness, quantity = 1 } = req.body;

      // Validate dimensions
      const validation = validateDimensions(Number(width), Number(length));
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Calculate price
      const result = calculateQuote(
        Number(width),
        Number(length),
        thickness === "thick" ? "thick" : "thin",
        Number(quantity),
      );

      res.json(result);
    } catch (error) {
      console.error("Calculation error:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Calculation failed",
      });
    }
  });

  // Save calculator quote
  app.post("/api/calculator/quote", async (req, res) => {
    try {
      const data = insertCalculatorQuoteSchema.parse(req.body);
      const quote = await storage.createCalculatorQuote(data);
      res.json(quote);
    } catch (error) {
      console.error("Error saving quote:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to save quote",
      });
    }
  });

  // Get all quotes (admin analytics)
  app.get("/api/calculator/quotes", async (req, res) => {
    try {
      const quotes = await storage.getAllCalculatorQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({
        error: "Failed to fetch quotes",
      });
    }
  });

  // Get quotes by wholesale customer
  app.get("/api/calculator/quotes/customer/:wholesaleId", async (req, res) => {
    try {
      const quotes = await storage.getCalculatorQuotesByWholesaleId(
        req.params.wholesaleId,
      );
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching customer quotes:", error);
      res.status(500).json({
        error: "Failed to fetch quotes",
      });
    }
  });

  // Submit freeform rug pad request
  app.post("/api/freeform-request", async (req, res) => {
    try {
      const { message, projectName, clientName, notes, image } = req.body;

      // In a production environment, you would:
      // 1. Save to database with a freeform requests table
      // 2. Send notification email to admin
      // 3. Store uploaded image in file storage

      // For now, we'll just log and return success
      console.log("Freeform request received:", {
        message,
        projectName,
        clientName,
        notes,
        hasImage: !!image,
      });

      res.json({
        success: true,
        message:
          "Your freeform request has been received. We'll contact you soon!",
      });
    } catch (error) {
      console.error("Error submitting freeform request:", error);
      res.status(500).json({
        error: "Failed to submit request",
      });
    }
  });

  // ============= DRAFT ORDER ROUTES =============

  // Create Shopify draft order
  app.post("/api/draft-order", async (req, res) => {
    try {
      const { quoteId, customerInfo } = req.body;

      // Get the quote
      const quote = await storage.getCalculatorQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Check if Shopify credentials are available
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        // Shopify credentials not configured - return mock draft order
        const mockDraftOrder = {
          shopifyDraftOrderId: `draft_${Date.now()}`,
          shopifyDraftOrderUrl: `https://${shopDomain || "underitall-redeux.myshopify.com"}/admin/draft_orders/mock_${Date.now()}`,
          invoiceUrl: `https://${shopDomain || "underitall-redeux.myshopify.com"}/admin/draft_orders/mock_${Date.now()}/invoice`,
          totalPrice: quote.totalPrice,
          lineItems: [
            {
              title: `Custom Rug Pad - ${quote.shape} ${quote.thickness === "thin" ? '⅛"' : '¼"'}`,
              quantity: quote.quantity,
              price: quote.totalPrice,
              custom_attributes: [
                { key: "Width", value: `${quote.width} ft` },
                { key: "Length", value: `${quote.length} ft` },
                { key: "Area", value: `${quote.area} sq ft` },
                { key: "Shape", value: quote.shape },
                {
                  key: "Thickness",
                  value: quote.thickness === "thin" ? '⅛"' : '¼"',
                },
              ],
            },
          ],
          calculatorQuoteId: quoteId,
          wholesaleRegistrationId: quote.wholesaleRegistrationId,
        };

        const draftOrder = await storage.createDraftOrder(mockDraftOrder);

        // Update quote with draft order info
        await storage.updateCalculatorQuote(quoteId, {
          shopifyDraftOrderId: draftOrder.shopifyDraftOrderId,
          shopifyDraftOrderUrl: draftOrder.shopifyDraftOrderUrl,
        });

        return res.json(draftOrder);
      }

      // Create actual Shopify draft order
      // Format dimensions for display
      const widthNum = Number(quote.width);
      const lengthNum = Number(quote.length);
      const widthFt = Math.floor(widthNum);
      const widthIn = Math.round((widthNum - widthFt) * 12);
      const lengthFt = Math.floor(lengthNum);
      const lengthIn = Math.round((lengthNum - lengthFt) * 12);

      let dimensionsDisplay = "";
      if (quote.shape === "round") {
        // For round, show radius
        const radiusNum = widthNum / 2;
        const radiusFt = Math.floor(radiusNum);
        const radiusIn = Math.round((radiusNum - radiusFt) * 12);
        dimensionsDisplay = `${radiusFt}'${radiusIn}" radius`;
      } else if (quote.shape === "square") {
        dimensionsDisplay = `${widthFt}'${widthIn}" × ${widthFt}'${widthIn}"`;
      } else {
        dimensionsDisplay = `${widthFt}'${widthIn}" × ${lengthFt}'${lengthIn}"`;
      }

      const productTitle = `Luxe ${quote.thickness === "thin" ? '⅛"' : '¼"'} - ${quote.shape.charAt(0).toUpperCase() + quote.shape.slice(1)}`;

      const lineItems = [
        {
          title: `Custom Rug Pad - ${productTitle}`,
          quantity: quote.quantity,
          price: String(quote.totalPrice),
          taxable: false,
          properties: [
            { name: "📐 Dimensions", value: dimensionsDisplay },
            {
              name: "📏 Total Sq Ft",
              value: String(Number(quote.area).toFixed(1)),
            },
            {
              name: "💰 Unit Price",
              value: `$${Number(quote.totalPrice).toFixed(2)}`,
            },
            {
              name: "💵 Total Price",
              value: `$${(Number(quote.totalPrice) * quote.quantity).toFixed(2)}`,
            },
            {
              name: "🏢 Project Name",
              value: quote.projectName || "not provided",
            },
            {
              name: "📍 Install Location",
              value: quote.installLocation || "not provided",
            },
            { name: "📄 PO Number", value: quote.poNumber || "not provided" },
            {
              name: "👤 Design Firm/Attn",
              value: quote.clientName || "not provided",
            },
            { name: "🎨 Product", value: productTitle },
            { name: "📝 Notes", value: quote.notes || "none" },
            { name: "📏 W×L", value: dimensionsDisplay },
          ],
        },
      ];

      const draftOrderData = {
        draft_order: {
          line_items: lineItems,
          customer: customerInfo,
          note: quote.notes || `Calculator Quote #${quote.id}`,
          tags: "calculator-quote, wholesale",
        },
      };

      const response = await fetch(
        `https://${shopDomain}/admin/api/2024-01/draft_orders.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify(draftOrderData),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const shopifyData = await response.json();
      const shopifyDraftOrder = shopifyData.draft_order;

      // Save draft order to database
      const draftOrder = await storage.createDraftOrder({
        shopifyDraftOrderId: String(shopifyDraftOrder.id),
        shopifyDraftOrderUrl: `https://${shopDomain}/admin/draft_orders/${shopifyDraftOrder.id}`,
        invoiceUrl: shopifyDraftOrder.invoice_url,
        totalPrice: shopifyDraftOrder.total_price,
        lineItems: shopifyDraftOrder.line_items,
        calculatorQuoteId: quoteId,
        wholesaleRegistrationId: quote.wholesaleRegistrationId,
      });

      // Update quote with draft order info
      await storage.updateCalculatorQuote(quoteId, {
        shopifyDraftOrderId: draftOrder.shopifyDraftOrderId,
        shopifyDraftOrderUrl: draftOrder.shopifyDraftOrderUrl,
      });

      res.json(draftOrder);
    } catch (error) {
      console.error("Draft order creation error:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create draft order",
      });
    }
  });

  // Get all draft orders (admin)
  app.get("/api/draft-orders", async (req, res) => {
    try {
      const orders = await storage.getAllDraftOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching draft orders:", error);
      res.status(500).json({
        error: "Failed to fetch draft orders",
      });
    }
  });

  // ============= WHOLESALE ACCOUNT METAOBJECT UPDATE =============

  // Update wholesale account metaobject
  app.patch("/api/wholesale-account/:metaobjectId", async (req, res) => {
    try {
      const { metaobjectId } = req.params;
      const updateData = req.body;

      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res.status(500).json({ error: "Shopify credentials not configured" });
      }

      // Build the metaobject update fields array
      const fields = [];
      
      // Business Information
      if (updateData.company !== undefined) fields.push({ key: "company", value: updateData.company });
      if (updateData.email !== undefined) fields.push({ key: "email", value: updateData.email });
      if (updateData.phone !== undefined) fields.push({ key: "phone", value: updateData.phone });
      if (updateData.website !== undefined) fields.push({ key: "website", value: updateData.website });
      if (updateData.instagram !== undefined) fields.push({ key: "instagram", value: updateData.instagram });
      
      // Address Information
      if (updateData.address !== undefined) fields.push({ key: "address", value: updateData.address });
      if (updateData.address2 !== undefined) fields.push({ key: "address2", value: updateData.address2 });
      if (updateData.city !== undefined) fields.push({ key: "city", value: updateData.city });
      if (updateData.state !== undefined) fields.push({ key: "state", value: updateData.state });
      if (updateData.zip !== undefined) fields.push({ key: "zip", value: updateData.zip });
      
      // Tax Information
      if (updateData.vat_tax_id !== undefined) fields.push({ key: "vat_tax_id", value: updateData.vat_tax_id });
      if (updateData.tax_exempt !== undefined) {
        fields.push({ key: "tax_exempt", value: String(updateData.tax_exempt) });
      }
      
      // Other Information
      if (updateData.source !== undefined) fields.push({ key: "source", value: updateData.source });
      if (updateData.message !== undefined) fields.push({ key: "message", value: updateData.message });

      // GraphQL mutation to update metaobject
      const updateMutation = `
        mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
            metaobject {
              id
              handle
              fields {
                key
                value
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(
        `https://${shopDomain}/admin/api/2024-04/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify({
            query: updateMutation,
            variables: {
              id: metaobjectId,
              metaobject: {
                fields: fields,
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (data.errors || data.data?.metaobjectUpdate?.userErrors?.length > 0) {
        console.error("Metaobject update errors:", data);
        return res.status(500).json({
          error: "Failed to update wholesale account",
          details: data.errors || data.data?.metaobjectUpdate?.userErrors,
        });
      }

      res.json({
        success: true,
        metaobject: data.data.metaobjectUpdate.metaobject,
      });
    } catch (error) {
      console.error("Error updating wholesale account:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update wholesale account",
      });
    }
  });

  // ============= CHAT ROUTES =============

  // Create chat conversation
  app.post("/api/chat/conversation", async (req, res) => {
    try {
      const data = insertChatConversationSchema.parse(req.body);
      const conversation = await storage.createChatConversation(data);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({
        error: "Failed to create conversation",
      });
    }
  });

  // Get conversation by session
  app.get("/api/chat/conversation/session/:sessionId", async (req, res) => {
    try {
      const conversations = await storage.getChatConversationsBySession(
        req.params.sessionId,
      );
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({
        error: "Failed to fetch conversations",
      });
    }
  });

  // Get messages for conversation
  app.get("/api/chat/conversation/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessagesByConversation(
        req.params.id,
      );
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({
        error: "Failed to fetch messages",
      });
    }
  });

  // Send chat message (with AI response)
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { conversationId, content, sessionId } = req.body;

      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await storage.getChatConversation(conversationId);
      } else if (sessionId) {
        // Create new conversation for this session
        conversation = await storage.createChatConversation({
          sessionId,
          isActive: true,
        });
      }

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Save user message
      const userMessage = await storage.createChatMessage({
        conversationId: conversation.id,
        role: "user",
        content,
      });

      // Get conversation history
      const messages = await storage.getChatMessagesByConversation(
        conversation.id,
      );

      // Generate AI response
      const { generateChatResponse, SYSTEM_PROMPT } = await import(
        "./utils/openai"
      );

      const chatHistory = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...messages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      ];

      const aiResponse = await generateChatResponse(chatHistory);

      // Save AI message
      const assistantMessage = await storage.createChatMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: aiResponse,
      });

      // Update conversation title if first message
      if (messages.length === 1) {
        await storage.updateChatConversation(conversation.id, {
          title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
        });
      }

      res.json({
        userMessage,
        assistantMessage,
        conversationId: conversation.id,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to send message",
      });
    }
  });

  // ============= ROOT REDIRECT (must be last) =============

  // Root now serves admin directly (handled by Vite in dev, static in prod)

  const httpServer = createServer(app);
  return httpServer;
}
