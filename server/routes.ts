import type { Express } from "express";
import { createServer } from "http";
import webhookRoutes from "./webhooks";
import { db } from "./db";
import { wholesaleRegistrations, calculatorQuotes, webhookLogs, draftOrders } from "@shared/schema";
import { desc } from "drizzle-orm";
import { getShopifyConfig, executeShopifyGraphQL } from "./utils/shopifyConfig";

export function registerRoutes(app: Express) {
  // GraphQL Proxy Bypass (for Shopify CLI) - Handle CORS preflight
  app.options("/graphiql/graphql.json", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.sendStatus(200);
  });

  app.post("/graphiql/graphql.json", async (req, res) => {
    // Explicit CORS headers for cross-origin Shopify CLI requests
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    try {
      const { api_version } = req.query;
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res.status(500).json({ error: "Shopify credentials not configured" });
      }

      const version = api_version || "2025-01";
      const graphqlUrl = `https://${shopDomain}/admin/api/${version}/graphql.json`;

      const response = await fetch(graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": adminToken,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("❌ GraphQL proxy error:", error);
      res.status(500).json({ error: "GraphQL proxy failed" });
    }
  });

  // Mount webhook routes
  app.use("/api/webhooks", webhookRoutes);

  // Wholesale Account Update Route (for customer account extension)
  app.patch("/api/wholesale-account/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const shopifyConfig = getShopifyConfig();
      if (!shopifyConfig) {
        return res.status(500).json({ error: "Shopify credentials not configured" });
      }

      const { shop, accessToken } = shopifyConfig;

      // Build metaobject update mutation
      const metaobjectMutation = `
        mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
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

      // Convert flat updates to fields array format
      const fields = Object.entries(updates).map(([key, value]) => ({
        key,
        value: String(value)
      }));

      const variables = {
        id: `gid://shopify/Metaobject/${id}`,
        metaobject: {
          fields
        }
      };

      const shopifyResponse = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: metaobjectMutation,
          variables,
        }),
      });

      const result = await shopifyResponse.json();

      if (result.data?.metaobjectUpdate?.userErrors?.length > 0) {
        return res.status(400).json({
          error: "Validation errors",
          details: result.data.metaobjectUpdate.userErrors
        });
      }

      return res.json({
        success: true,
        metaobject: result.data?.metaobjectUpdate?.metaobject
      });
    } catch (error: any) {
      console.error("❌ Error updating wholesale account:", error);
      return res.status(500).json({ error: "Failed to update wholesale account" });
    }
  });

  // Admin API - Wholesale Registrations
  app.get("/api/wholesale-registrations", async (req, res) => {
    try {
      const registrations = await db
        .select()
        .from(wholesaleRegistrations)
        .orderBy(desc(wholesaleRegistrations.createdAt));
      
      // Force no-cache for fresh data on every request
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(registrations);
    } catch (error) {
      console.error("❌ Error fetching registrations:", error);
      res.status(500).json({ error: "Failed to fetch registrations" });
    }
  });

  // Admin API - Calculator Quotes
  app.get("/api/calculator/quotes", async (req, res) => {
    try {
      const quotes = await db
        .select()
        .from(calculatorQuotes)
        .orderBy(desc(calculatorQuotes.createdAt));
      
      // Force no-cache for fresh data on every request
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(quotes);
    } catch (error) {
      console.error("❌ Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Calculator - Calculate pricing (no save)
  app.post("/api/calculator/calculate", async (req, res) => {
    try {
      const { width, length, thickness, quantity } = req.body;

      // Import pricing calculator
      const { calculateQuote } = await import("./utils/pricingCalculator");

      const priceData = calculateQuote(width, length, thickness, quantity);
      res.json(priceData);
    } catch (error) {
      console.error("❌ Error calculating price:", error);
      res.status(500).json({ error: "Failed to calculate price" });
    }
  });

  // Calculator - Save quote
  app.post("/api/calculator/quote", async (req, res) => {
    try {
      const quoteData = req.body;

      const quote = await db
        .insert(calculatorQuotes)
        .values({
          width: quoteData.width,
          length: quoteData.length,
          thickness: quoteData.thickness,
          shape: quoteData.shape,
          area: quoteData.area,
          quantity: quoteData.quantity,
          totalPrice: quoteData.totalPrice,
          pricePerSqFt: quoteData.pricePerSqFt,
          projectName: quoteData.projectName,
          installLocation: quoteData.installLocation,
          poNumber: quoteData.poNumber,
          clientName: quoteData.clientName,
          notes: quoteData.notes,
        })
        .returning();

      res.json(quote[0]);
    } catch (error) {
      console.error("❌ Error saving quote:", error);
      res.status(500).json({ error: "Failed to save quote" });
    }
  });

  // Wholesale Registration - Create new registration
  app.post("/api/wholesale-registration", async (req, res) => {
    try {
      const registrationData = req.body;

      const registration = await db
        .insert(wholesaleRegistrations)
        .values({
          firmName: registrationData.firmName,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          title: registrationData.title,
          email: registrationData.email,
          phone: registrationData.phone,
          website: registrationData.website,
          businessAddress: registrationData.businessAddress,
          businessAddress2: registrationData.businessAddress2,
          city: registrationData.city,
          state: registrationData.state,
          zipCode: registrationData.zipCode,
          instagramHandle: registrationData.instagramHandle,
          certificationUrl: registrationData.certificationUrl,
          businessType: registrationData.businessType,
          yearsInBusiness: registrationData.yearsInBusiness,
          isTaxExempt: registrationData.isTaxExempt,
          taxId: registrationData.taxId,
          taxIdProofUrl: registrationData.taxIdProofUrl,
          howDidYouHear: registrationData.howDidYouHear,
          receivedSampleSet: registrationData.receivedSampleSet || false,
          status: "pending",
        })
        .returning();

      res.json(registration[0]);
    } catch (error) {
      console.error("❌ Error creating registration:", error);
      res.status(500).json({ error: "Failed to create registration" });
    }
  });

  // Company Enrichment (placeholder - implement when OpenAI/CRM integration ready)
  app.post("/api/enrich-company", async (req, res) => {
    try {
      // TODO: Implement company enrichment with OpenAI/CRM
      res.json({ enriched: false, message: "Enrichment not yet implemented" });
    } catch (error) {
      console.error("❌ Error enriching company:", error);
      res.status(500).json({ error: "Failed to enrich company" });
    }
  });

  // Admin API - Draft Orders
  app.get("/api/draft-orders", async (req, res) => {
    try {
      const orders = await db
        .select()
        .from(draftOrders)
        .orderBy(desc(draftOrders.createdAt));
      
      // Force no-cache for fresh data on every request
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(orders);
    } catch (error) {
      console.error("❌ Error fetching draft orders:", error);
      res.status(500).json({ error: "Failed to fetch draft orders" });
    }
  });

  // Create Draft Order via Shopify Admin API
  app.post("/api/draft-order", async (req, res) => {
    try {
      const { calculatorQuoteId, lineItems, customerEmail, note } = req.body;

      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res.status(500).json({ error: "Shopify credentials not configured" });
      }

      // Validate lineItems (must be array)
      if (!Array.isArray(lineItems) || lineItems.length === 0) {
        return res.status(400).json({
          error: "Missing or invalid lineItems",
          details: "lineItems must be a non-empty array"
        });
      }

      // Create Shopify Draft Order via Admin API
      const draftOrderMutation = `
        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
              invoiceUrl
              totalPrice
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          email: customerEmail || "noreply@underitall.com",
          note: note || "Created via UnderItAll Calculator",
          lineItems: lineItems.map((item: any) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            customAttributes: item.customAttributes || [],
          })),
        },
      };

      const shopifyResponse = await fetch(
        `https://${shopDomain}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify({ query: draftOrderMutation, variables }),
        }
      );

      const shopifyData = await shopifyResponse.json();

      if (shopifyData.errors || shopifyData.data?.draftOrderCreate?.userErrors?.length > 0) {
        console.error("❌ Shopify draft order creation failed:", shopifyData);
        return res.status(500).json({
          error: "Failed to create Shopify draft order",
          details: shopifyData.errors || shopifyData.data?.draftOrderCreate?.userErrors,
        });
      }

      const draftOrder = shopifyData.data.draftOrderCreate.draftOrder;

      // Save to local database
      const [savedOrder] = await db
        .insert(draftOrders)
        .values({
          shopifyDraftOrderId: draftOrder.id,
          shopifyDraftOrderUrl: `https://${shopDomain}/admin/draft_orders/${draftOrder.id.split('/').pop()}`,
          invoiceUrl: draftOrder.invoiceUrl,
          totalPrice: draftOrder.totalPrice,
          lineItems: lineItems,
          calculatorQuoteId: calculatorQuoteId || null,
        })
        .returning();

      res.json({
        success: true,
        draftOrder: savedOrder,
        invoiceUrl: draftOrder.invoiceUrl,
      });
    } catch (error) {
      console.error("❌ Error creating draft order:", error);
      res.status(500).json({ error: "Failed to create draft order" });
    }
  });

  // Debug endpoint - Visual UI for testing/monitoring
  app.get("/debug", async (req, res) => {
    try {
      // Fetch recent data for debugging
      const [recentRegistrations, recentQuotes, recentWebhooks] = await Promise.all([
        db.select().from(wholesaleRegistrations).orderBy(desc(wholesaleRegistrations.createdAt)).limit(10),
        db.select().from(calculatorQuotes).orderBy(desc(calculatorQuotes.createdAt)).limit(10),
        db.select().from(webhookLogs).orderBy(desc(webhookLogs.timestamp)).limit(20),
      ]);

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔧 UnderItAll Debug Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #e0e0e0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      font-family: 'Archivo', sans-serif;
      color: #F2633A;
      margin-bottom: 2rem;
      font-size: 2.5rem;
      text-shadow: 0 2px 4px rgba(242, 99, 58, 0.3);
    }
    .section {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(242, 99, 58, 0.2);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(10px);
    }
    .section h2 {
      font-family: 'Archivo', sans-serif;
      color: #F2633A;
      margin-bottom: 1rem;
      font-size: 1.5rem;
      border-bottom: 2px solid rgba(242, 99, 58, 0.3);
      padding-bottom: 0.5rem;
    }
    .status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status.pending { background: #fbbf24; color: #1a1a1a; }
    .status.approved { background: #10b981; color: #fff; }
    .status.rejected { background: #ef4444; color: #fff; }
    .webhook-success { background: #10b981; color: #fff; }
    .webhook-crm { background: #6366f1; color: #fff; }
    .webhook-shopify { background: #96bf48; color: #1a1a1a; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid rgba(242, 99, 58, 0.1);
    }
    th {
      background: rgba(242, 99, 58, 0.1);
      color: #F2633A;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.875rem;
    }
    tr:hover { background: rgba(242, 99, 58, 0.05); }
    .timestamp {
      color: #9ca3af;
      font-size: 0.875rem;
    }
    .json-viewer {
      background: #1a1a1a;
      border: 1px solid rgba(242, 99, 58, 0.2);
      border-radius: 6px;
      padding: 1rem;
      overflow-x: auto;
      max-height: 200px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: #10b981;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .stat-card {
      background: rgba(242, 99, 58, 0.1);
      border: 1px solid rgba(242, 99, 58, 0.3);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #F2633A;
    }
    .stat-label {
      font-size: 0.875rem;
      color: #9ca3af;
      text-transform: uppercase;
    }
    .refresh-btn {
      background: #F2633A;
      color: #fff;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 2rem;
      transition: all 0.3s ease;
    }
    .refresh-btn:hover {
      background: #d94d2a;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(242, 99, 58, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 UnderItAll Debug Dashboard</h1>
    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>

    <!-- Stats Overview -->
    <div class="section">
      <h2>📊 Quick Stats</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${recentRegistrations.length}</div>
          <div class="stat-label">Recent Registrations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${recentQuotes.length}</div>
          <div class="stat-label">Recent Quotes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${recentWebhooks.length}</div>
          <div class="stat-label">Recent Webhooks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${recentWebhooks.filter((w: any) => w.source === 'shopify').length}</div>
          <div class="stat-label">Shopify Events</div>
        </div>
      </div>
    </div>

    <!-- Wholesale Registrations -->
    <div class="section">
      <h2>👥 Recent Wholesale Registrations</h2>
      ${recentRegistrations.length === 0 ? '<p style="color: #9ca3af;">No registrations found</p>' : `
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${recentRegistrations.map((reg: any) => `
              <tr>
                <td><strong>${reg.firmName || 'N/A'}</strong></td>
                <td>${reg.firstName} ${reg.lastName}</td>
                <td>${reg.email}</td>
                <td><span class="status ${reg.status}">${reg.status}</span></td>
                <td class="timestamp">${new Date(reg.createdAt).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Calculator Quotes -->
    <div class="section">
      <h2>📐 Recent Calculator Quotes</h2>
      ${recentQuotes.length === 0 ? '<p style="color: #9ca3af;">No quotes found</p>' : `
        <table>
          <thead>
            <tr>
              <th>Dimensions</th>
              <th>Product</th>
              <th>Price</th>
              <th>Install</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${recentQuotes.map((quote: any) => `
              <tr>
                <td>${quote.rugWidth}" × ${quote.rugLength}"</td>
                <td>${quote.productName}</td>
                <td><strong style="color: #10b981;">$${quote.totalPrice}</strong></td>
                <td>${quote.installLocation || 'Not specified'}</td>
                <td class="timestamp">${new Date(quote.createdAt).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Webhook Logs -->
    <div class="section">
      <h2>🔔 Recent Webhook Events</h2>
      ${recentWebhooks.length === 0 ? '<p style="color: #9ca3af;">No webhooks logged</p>' : `
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Source</th>
              <th>Shop/Domain</th>
              <th>Timestamp</th>
              <th>Payload Preview</th>
            </tr>
          </thead>
          <tbody>
            ${recentWebhooks.map((hook: any) => `
              <tr>
                <td><strong>${hook.type}</strong></td>
                <td><span class="status webhook-${hook.source}">${hook.source}</span></td>
                <td>${hook.shopDomain || 'N/A'}</td>
                <td class="timestamp">${new Date(hook.timestamp).toLocaleString()}</td>
                <td>
                  <details>
                    <summary style="cursor: pointer; color: #F2633A;">View JSON</summary>
                    <div class="json-viewer">${JSON.stringify(hook.payload, null, 2)}</div>
                  </details>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Environment Check -->
    <div class="section">
      <h2>⚙️ Environment Configuration</h2>
      <table>
        <tbody>
          <tr>
            <td><strong>SHOPIFY_SHOP_DOMAIN</strong></td>
            <td>${process.env.SHOPIFY_SHOP_DOMAIN ? '✅ Configured' : '❌ Missing'}</td>
          </tr>
          <tr>
            <td><strong>SHOPIFY_ADMIN_ACCESS_TOKEN</strong></td>
            <td>${process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? '✅ Configured' : '❌ Missing'}</td>
          </tr>
          <tr>
            <td><strong>CRM_BASE_URL</strong></td>
            <td>${process.env.CRM_BASE_URL || '❌ Missing'}</td>
          </tr>
          <tr>
            <td><strong>CRM_API_KEY</strong></td>
            <td>${process.env.CRM_API_KEY ? '✅ Configured' : '❌ Missing'}</td>
          </tr>
          <tr>
            <td><strong>SHOPIFY_WEBHOOK_SECRET</strong></td>
            <td>${process.env.SHOPIFY_WEBHOOK_SECRET ? '✅ Configured' : '⚠️ Missing (dev mode)'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    console.log('🔧 Debug Dashboard loaded');
    console.log('Registrations:', ${JSON.stringify(recentRegistrations.length)});
    console.log('Quotes:', ${JSON.stringify(recentQuotes.length)});
    console.log('Webhooks:', ${JSON.stringify(recentWebhooks.length)});
  </script>
</body>
</html>
      `;

      res.send(html);
    } catch (error) {
      console.error("❌ Debug endpoint error:", error);
      res.status(500).send(`
        <h1 style="color: #ef4444;">Debug Error</h1>
        <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
      `);
    }
  });

  // Metaobject debug endpoint - Test metaobject queries
  app.get("/api/debug-metaobject", async (req, res) => {
    try {
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res.status(500).json({
          error: "Missing Shopify credentials",
          shopDomain: !!shopDomain,
          adminToken: !!adminToken
        });
      }

      // Query metaobject definition
      const definitionQuery = `
        query {
          metaobjectDefinitionByType(type: "$app:wholesale_account") {
            id
            name
            type
            displayNameKey
            fieldDefinitions {
              key
              name
              type {
                name
              }
            }
          }
        }
      `;

      const defResponse = await fetch(
        `https://${shopDomain}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify({ query: definitionQuery }),
        }
      );

      const defData = await defResponse.json();

      // Query metaobjects
      const objectsQuery = `
        query {
          metaobjects(type: "$app:wholesale_account", first: 5) {
            nodes {
              id
              handle
              displayName
              fields {
                key
                value
              }
            }
          }
        }
      `;

      const objResponse = await fetch(
        `https://${shopDomain}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify({ query: objectsQuery }),
        }
      );

      const objData = await objResponse.json();

      res.json({
        success: true,
        definition: defData.data?.metaobjectDefinitionByType,
        metaobjects: objData.data?.metaobjects?.nodes || [],
        errors: {
          definition: defData.errors,
          metaobjects: objData.errors
        }
      });
    } catch (error) {
      console.error("❌ Debug metaobject error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Health check with integration status
  app.get("/api/health", async (req, res) => {
    try {
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;

      // Check Shopify integration
      const shopifyHealth: any = {
        configured: !!(shopDomain && adminToken),
        shop: shopDomain,
      };

      if (shopDomain && adminToken) {
        try {
          // Check for metaobject definition
          const query = `
            query {
              metaobjectDefinitionByType(type: "$app:wholesale_account") {
                id
                name
                type
              }
              metaobjects(type: "$app:wholesale_account", first: 1) {
                nodes {
                  id
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
              body: JSON.stringify({ query }),
            }
          );

          const data = await response.json();

          if (data.data?.metaobjectDefinitionByType) {
            shopifyHealth.metaobjectDefinition = true;
            shopifyHealth.metaobjectId = data.data.metaobjectDefinitionByType.id;
            shopifyHealth.entryCount = data.data.metaobjects?.nodes?.length || 0;
          } else {
            shopifyHealth.metaobjectDefinition = false;
          }
        } catch (error) {
          shopifyHealth.error = error instanceof Error ? error.message : "Unknown error";
        }
      }

      // Check CRM integration
      const crmHealth: any = {
        configured: !!(crmBaseUrl && crmApiKey),
        baseUrl: crmBaseUrl,
      };

      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        shopify: shopifyHealth,
        crm: crmHealth,
      });
    } catch (error) {
      console.error("❌ Health check error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Health check failed"
      });
    }
  });

  return createServer(app);
}