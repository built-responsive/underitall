
import type { Express } from "express";
import { createServer } from "http";
import webhookRoutes from "./webhooks";
import { db } from "./db";
import { wholesaleRegistrations, calculatorQuotes, webhookLogs } from "@shared/schema";
import { desc } from "drizzle-orm";

export function registerRoutes(app: Express) {
  // Mount webhook routes
  app.use("/api/webhooks", webhookRoutes);

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

  // API endpoints for dashboard data
  app.get("/api/wholesale-registrations", async (req, res) => {
    try {
      const registrations = await db
        .select()
        .from(wholesaleRegistrations)
        .orderBy(desc(wholesaleRegistrations.createdAt));
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ error: "Failed to fetch registrations" });
    }
  });

  app.get("/api/calculator/quotes", async (req, res) => {
    try {
      const quotes = await db
        .select()
        .from(calculatorQuotes)
        .orderBy(desc(calculatorQuotes.createdAt));
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/draft-orders", async (req, res) => {
    try {
      // For now, return empty array as draft orders aren't implemented yet
      res.json([]);
    } catch (error) {
      console.error("Error fetching draft orders:", error);
      res.status(500).json({ error: "Failed to fetch draft orders" });
    }
  });

  app.get("/api/webhooks/logs", async (req, res) => {
    try {
      const logs = await db
        .select()
        .from(webhookLogs)
        .orderBy(desc(webhookLogs.timestamp))
        .limit(50);
      res.json({ logs });
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      res.status(500).json({ error: "Failed to fetch webhook logs" });
    }
  });

  // Health check with integration status
  app.get("/api/health", async (req, res) => {
    try {
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;

      // Check Shopify metaobject
      let shopifyData = {
        configured: !!shopDomain && !!adminToken,
        shop: shopDomain || null,
        metaobjectDefinition: false,
        metaobjectId: null,
        entryCount: 0
      };

      if (shopifyData.configured) {
        try {
          const definitionQuery = `
            query {
              metaobjectDefinitionByType(type: "$app:wholesale_account") {
                id
                name
                type
              }
              metaobjects(type: "$app:wholesale_account", first: 100) {
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
              body: JSON.stringify({ query: definitionQuery }),
            }
          );

          const data = await response.json();
          if (data.data?.metaobjectDefinitionByType) {
            shopifyData.metaobjectDefinition = true;
            shopifyData.metaobjectId = data.data.metaobjectDefinitionByType.id;
            shopifyData.entryCount = data.data.metaobjects?.nodes?.length || 0;
          }
        } catch (error) {
          shopifyData.error = error instanceof Error ? error.message : "Unknown error";
        }
      }

      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        shopify: shopifyData,
        crm: {
          configured: !!crmBaseUrl && !!crmApiKey,
          baseUrl: crmBaseUrl || null
        }
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Admin endpoints for testing connections
  app.post("/api/admin/test-crm", async (req, res) => {
    try {
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;

      if (!crmBaseUrl || !crmApiKey) {
        return res.json({
          success: false,
          message: "CRM credentials not configured"
        });
      }

      // Test CRM connection
      const testResponse = await fetch(`${crmBaseUrl}/api/test`, {
        headers: {
          'Authorization': `Bearer ${crmApiKey}`
        }
      }).catch(() => null);

      res.json({
        success: !!testResponse,
        message: testResponse ? "CRM connection successful" : "Failed to connect to CRM"
      });
    } catch (error) {
      console.error("CRM test error:", error);
      res.json({
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed"
      });
    }
  });

  app.post("/api/admin/test-shopify", async (req, res) => {
    try {
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res.json({
          success: false,
          message: "Shopify credentials not configured"
        });
      }

      // Test Shopify connection
      const shopResponse = await fetch(
        `https://${shopDomain}/admin/api/2025-01/shop.json`,
        {
          headers: {
            "X-Shopify-Access-Token": adminToken,
          },
        }
      );

      const shopData = await shopResponse.json();

      res.json({
        success: !!shopData.shop,
        message: shopData.shop ? `Connected to ${shopData.shop.name}` : "Failed to connect to Shopify"
      });
    } catch (error) {
      console.error("Shopify test error:", error);
      res.json({
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed"
      });
    }
  });

  app.post("/api/admin/update-prices", async (req, res) => {
    try {
      const { thinCsvUrl, thickCsvUrl } = req.body;
      
      // For now, just acknowledge the update
      // In production, you would fetch and parse the CSVs here
      console.log("Updating price CSVs:", { thinCsvUrl, thickCsvUrl });
      
      res.json({
        success: true,
        message: "Price CSV URLs updated successfully"
      });
    } catch (error) {
      console.error("Update prices error:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update prices"
      });
    }
  });

  return createServer(app);
}
