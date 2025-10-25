import type { Express, Request, Response } from "express";
import { createServer } from "http";
import webhookRoutes from "./webhooks";
import { db } from "./db";
import {
  wholesaleRegistrations,
  calculatorQuotes,
  webhookLogs,
  draftOrders,
  notificationRecipients,
} from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { getShopifyConfig, executeShopifyGraphQL } from "./utils/shopifyConfig";
import path from "path";
import { getUnreadMessages, sendEmail } from "./gmail";
import { emailTemplates, emailSendLog } from "@shared/schema";
import { sendTemplatedEmail, initializeDefaultTemplates } from "./services/emailService";

export function registerRoutes(app: Express) {
  // Customer Account Extension API - Fetch Wholesale Account Data (from CRM)
  app.get("/api/customer/wholesale-account", async (req, res) => {
    try {
      // TODO: Add session token authentication here (from customer account extension)
      // For now, accept customerId from query param (secure this in production)
      const { customerId } = req.query;

      if (!customerId) {
        return res.status(400).json({ error: "Missing customerId" });
      }

      // Fetch customer's wholesale_clarity_id from Shopify
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res
          .status(500)
          .json({ error: "Shopify credentials not configured" });
      }

      const customerQuery = `
        query GetCustomerMetafield($customerId: ID!) {
          customer(id: $customerId) {
            id
            email
            firstName
            lastName
            metafield(namespace: "custom", key: "wholesale_clarity_id") {
              value
            }
          }
        }
      `;

      const customerResponse = await fetch(
        `https://${shopDomain}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminToken,
          },
          body: JSON.stringify({
            query: customerQuery,
            variables: { customerId },
          }),
        },
      );

      const customerData = await customerResponse.json();
      const customer = customerData?.data?.customer;
      const clarityAccountId = customer?.metafield?.value;

      if (!clarityAccountId) {
        return res.json({
          hasWholesaleAccount: false,
          message: "No wholesale account found",
        });
      }

      // Fetch CRM account data using AccountNumber (clarityAccountId is like "AC000931")
      const crmBaseUrl =
        process.env.CRM_BASE_URL || "http://liveapi.claritysoftcrm.com";
      const crmApiKey = process.env.CRM_API_KEY;

      if (!crmApiKey) {
        return res.status(500).json({ error: "CRM_API_KEY not configured" });
      }

      const { default: http } = await import("http");
      const crmPayload = {
        APIKey: crmApiKey,
        Resource: "Account",
        Operation: "Get",
        SQLFilter: `AccountNumber = '${clarityAccountId}'`,
      };
      const payloadString = JSON.stringify(crmPayload);

      const options = {
        hostname: "liveapi.claritysoftcrm.com",
        port: 80,
        path: "/api/v1",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payloadString),
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "User-Agent": "curl/7.68.0",
        },
      };

      const crmData = await new Promise<any>((resolve, reject) => {
        const req = http.request(options, (crmRes: any) => {
          let data = "";
          crmRes.on("data", (chunk: any) => (data += chunk));
          crmRes.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Failed to parse CRM response: ${data}`));
            }
          });
        });

        req.on("error", reject);
        req.write(payloadString);
        req.end();
      });

      if (!crmData.Data || crmData.Data.length === 0) {
        return res.json({
          hasWholesaleAccount: false,
          message: "CRM account not found",
        });
      }

      const crmAccount = crmData.Data[0];

      // Map CRM fields to frontend-friendly format
      res.json({
        hasWholesaleAccount: true,
        clarityAccountId,
        account: {
          company: crmAccount.Account || crmAccount.AccountCoreName,
          accountNumber: crmAccount.AccountNumber,
          email: crmAccount.CompanyEmail || "",
          phone: crmAccount.CompanyPhone || "",
          website: crmAccount.Website || "",
          instagram: crmAccount.Instagram || "",
          address: crmAccount.Address1 || "",
          address2: crmAccount.Address2 || "",
          city: crmAccount.City || "",
          state: crmAccount.State || "",
          zip: crmAccount.ZipCode || "",
          taxExempt: crmAccount["Tax Exempt"] === "Yes",
          taxId: crmAccount.EIN || "",
          accountType: crmAccount["Account Type"] || "",
          sampleSet: crmAccount["Sample Set"] === "Yes",
          source: crmAccount["Lead Source Specifics"] || "",
          owner: crmAccount.Owner || "",
          createdDate: crmAccount.CreationDate,
          // Include ALL 50+ fields for debugging
          _raw: crmAccount,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching wholesale account:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch wholesale account",
      });
    }
  });

  // Customer Account Extension API - Update Wholesale Account Data (sync to CRM)
  app.patch("/api/customer/wholesale-account", async (req, res) => {
    try {
      // TODO: Add session token authentication here
      const { customerId, clarityAccountId, updates } = req.body;

      if (!customerId || !clarityAccountId) {
        return res
          .status(400)
          .json({ error: "Missing customerId or clarityAccountId" });
      }

      // Update CRM Account via "Create Or Edit" operation
      const crmBaseUrl =
        process.env.CRM_BASE_URL || "http://liveapi.claritysoftcrm.com";
      const crmApiKey = process.env.CRM_API_KEY;

      if (!crmApiKey) {
        return res.status(500).json({ error: "CRM_API_KEY not configured" });
      }

      const { default: http } = await import("http");
      const crmPayload = {
        APIKey: crmApiKey,
        Resource: "Account",
        Operation: "Create Or Edit",
        Data: {
          AccountNumber: clarityAccountId, // Required for matching existing account
          AccountName: updates.company,
          CompanyPhone: updates.phone || "",
          Website: updates.website || "",
          Address1: updates.address,
          Address2: updates.address2 || "",
          City: updates.city,
          State: updates.state,
          ZipCode: updates.zip,
          Instagram: updates.instagram || "",
        },
      };
      const payloadString = JSON.stringify(crmPayload);

      const options = {
        hostname: "liveapi.claritysoftcrm.com",
        port: 80,
        path: "/api/v1",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payloadString),
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "User-Agent": "curl/7.68.0",
        },
      };

      const crmData = await new Promise<any>((resolve, reject) => {
        const req = http.request(options, (crmRes: any) => {
          let data = "";
          crmRes.on("data", (chunk: any) => (data += chunk));
          crmRes.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Failed to parse CRM response: ${data}`));
            }
          });
        });

        req.on("error", reject);
        req.write(payloadString);
        req.end();
      });

      console.log("✅ CRM Account updated:", crmData);

      // Also update local DB for caching/audit trail
      await db
        .update(wholesaleRegistrations)
        .set({
          firmName: updates.company,
          phone: updates.phone,
          website: updates.website,
          instagramHandle: updates.instagram,
          businessAddress: updates.address,
          businessAddress2: updates.address2,
          city: updates.city,
          state: updates.state,
          zipCode: updates.zip,
        })
        .where(eq(wholesaleRegistrations.clarityAccountId, clarityAccountId));

      res.json({ success: true, message: "Wholesale account updated in CRM" });
    } catch (error) {
      console.error("❌ Error updating wholesale account:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to update wholesale account",
      });
    }
  });

  // App Proxy Route - Serves wholesale profile within Shopify storefront
  app.get("/apps/wholesale/*", async (req, res) => {
    try {
      // Shopify sends proxy params in query: shop, logged_in_customer_id, etc.
      const { shop, logged_in_customer_id } = req.query;

      console.log("📦 App Proxy request:", {
        path: req.path,
        shop,
        customerId: logged_in_customer_id,
      });

      // Serve React app with injected Shopify params for App Bridge
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="shopify-api-key" content="78a602699150bda4e49a40861707d500" />
          <title>Wholesale Profile</title>
          <script type="text/javascript">
            // Inject Shopify params for App Bridge from query string
            window.__SHOPIFY_SHOP__ = "${shop || ""}";
            window.__SHOPIFY_CUSTOMER_ID__ = "${logged_in_customer_id || ""}";
            window.__SHOPIFY_EMBEDDED__ = false; // App Proxy runs outside admin iframe
          </script>
          <!-- Load App Bridge (optional for proxy, but safe to include) -->
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" type="text/javascript"></script>
          <!-- Vite dev assets -->
          <script type="module" src="https://its-under-it-all.replit.app/@vite/client"></script>
          <script type="module" src="https://its-under-it-all.replit.app/src/main.tsx"></script>
        </head>
        <body>
          <div id="root"></div>
          <script>
            console.log('📦 App Proxy loaded:', {
              shop: window.__SHOPIFY_SHOP__,
              customerId: window.__SHOPIFY_CUSTOMER_ID__
            });
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("❌ App proxy error:", error);
      res.status(500).send("Error loading profile");
    }
  });

  // CRM Account Lookup - Query by AccountId (not AccountNumber)
  app.post("/api/crm/account", async (req, res) => {
    try {
      const { accountId } = req.body;

      if (!accountId) {
        return res.status(400).json({ error: "Missing accountId" });
      }

      const crmBaseUrl =
        process.env.CRM_BASE_URL || "http://liveapi.claritysoftcrm.com";
      const crmApiKey = process.env.CRM_API_KEY;

      if (!crmApiKey) {
        return res.status(500).json({ error: "CRM_API_KEY not configured" });
      }

      console.log(`📥 CRM Account Lookup Request: ${accountId}`);

      const crmPayload = {
        APIKey: crmApiKey,
        Resource: "Account",
        Operation: "Get",
        AccountId: accountId,
      };

      console.log("📤 Exact CRM Payload:");
      console.log(JSON.stringify(crmPayload, null, 2));

      // Use native http module to mimic curl's exact behavior (HTTP/1.1, all headers)
      const { default: http } = await import("http");
      const payloadString = JSON.stringify(crmPayload);

      const options = {
        hostname: "liveapi.claritysoftcrm.com",
        port: 80,
        path: "/api/v1",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payloadString),
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "User-Agent": "curl/7.68.0",
        },
      };

      console.log("📤 Request Options (curl-like):");
      console.log(JSON.stringify(options, null, 2));

      const crmData = await new Promise<any>((resolve, reject) => {
        const req = http.request(options, (res: any) => {
          let data = "";
          res.on("data", (chunk: any) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Failed to parse CRM response: ${data}`));
            }
          });
        });

        req.on("error", reject);
        req.write(payloadString);
        req.end();
      });

      console.log("📤 CRM Account Response:");
      console.log(JSON.stringify(crmData, null, 2));

      // Verify full payload (log field count)
      if (crmData.Data) {
        const fieldCount = Object.keys(crmData.Data).length;
        console.log(`✅ Account found with ${fieldCount} fields`);
      }

      res.json(crmData);
    } catch (error) {
      console.error("❌ CRM account lookup error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "CRM lookup failed",
      });
    }
  });

  // Shopify GraphQL endpoint for client-side queries (settings, admin, etc.)


  // Notification Recipients Management
  app.get("/api/notification-recipients", async (req, res) => {
    try {
      const { category } = req.query;
      const query = category 
        ? db.select().from(notificationRecipients).where(eq(notificationRecipients.category, category as string))
        : db.select().from(notificationRecipients);
      
      const recipients = await query;
      res.json({ recipients });
    } catch (error) {
      console.error("❌ Error fetching recipients:", error);
      res.status(500).json({ error: "Failed to fetch recipients" });
    }
  });

  app.post("/api/notification-recipients", async (req, res) => {
    try {
      const { email, category } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      
      const [recipient] = await db
        .insert(notificationRecipients)
        .values({
          email,
          category: category || "wholesale_notifications",
          active: true,
        })
        .onConflictDoNothing()
        .returning();
      
      res.json({ success: true, recipient });
    } catch (error) {
      console.error("❌ Error adding recipient:", error);
      res.status(500).json({ error: "Failed to add recipient" });
    }
  });

  app.delete("/api/notification-recipients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db
        .delete(notificationRecipients)
        .where(eq(notificationRecipients.id, id));
      
      res.json({ success: true, message: "Recipient removed" });
    } catch (error) {
      console.error("❌ Error removing recipient:", error);
      res.status(500).json({ error: "Failed to remove recipient" });
    }
  });

  // Enhanced test-send with template rendering + HTML support
  app.post("/api/gmail/send-test", async (req, res) => {
    try {
      const { to, templateId, subject, htmlContent, variables } = req.body;
      
      if (!to || !subject || (!htmlContent && !templateId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields: to, subject, and (htmlContent or templateId)" 
        });
      }

      let finalHtml = htmlContent;
      let finalSubject = subject;

      // If templateId provided, render from template
      if (templateId) {
        const [template] = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, templateId))
          .limit(1);
        
        if (!template) {
          return res.status(404).json({ success: false, error: "Template not found" });
        }

        // Simple variable replacement (same as emailService.ts)
        finalHtml = template.htmlContent;
        finalSubject = template.subject;
        
        if (variables) {
          Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            finalHtml = finalHtml.replace(regex, variables[key] || '');
            finalSubject = finalSubject.replace(regex, variables[key] || '');
          });
        }
      }

      // Convert HTML to plain text fallback
      const plainText = finalHtml
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      // Send via Gmail API with HTML support
      const { google } = await import('googleapis');
      const { default: http } = await import("http");
      
      // Get fresh access token
      const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
      const xReplitToken = process.env.REPL_IDENTITY 
        ? 'repl ' + process.env.REPL_IDENTITY 
        : process.env.WEB_REPL_RENEWAL 
        ? 'depl ' + process.env.WEB_REPL_RENEWAL 
        : null;

      if (!xReplitToken) {
        throw new Error('Gmail connection not available');
      }

      const connectionSettings = await fetch(
        'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
        {
          headers: {
            'Accept': 'application/json',
            'X_REPLIT_TOKEN': xReplitToken
          }
        }
      ).then(res => res.json()).then(data => data.items?.[0]);

      const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

      if (!accessToken) {
        throw new Error('Gmail access token not available');
      }

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build MIME message with HTML + plain text
      const message = [
        `From: UnderItAll <noreply@itsunderitall.com>`,
        `To: ${to}`,
        `Subject: ${finalSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="boundary123"`,
        '',
        '--boundary123',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        plainText,
        '--boundary123',
        'Content-Type: text/html; charset=UTF-8',
        '',
        finalHtml,
        '--boundary123--',
      ].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      res.json({ 
        success: true, 
        messageId: result.data.id,
        message: "Test email sent successfully with HTML formatting"
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to send test email" 
      });
    }
  });

  app.post("/api/shopify/graphql", async (req, res) => {
    try {
      const { query, variables } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Missing GraphQL query" });
      }

      console.log("📥 GraphQL Request:");
      console.log(JSON.stringify({ query, variables }, null, 2));

      // Use the centralized executeShopifyGraphQL util
      const data = await executeShopifyGraphQL(query, variables);

      console.log("📤 GraphQL Response:");
      console.log(JSON.stringify(data, null, 2));

      res.json(data);
    } catch (error) {
      console.error("❌ Shopify GraphQL error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "GraphQL query failed",
      });
    }
  });

  // GraphQL Proxy Bypass (for Shopify CLI) - Handle CORS preflight
  app.options("/graphiql/graphql.json", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    res.sendStatus(200);
  });

  app.post("/graphiql/graphql.json", async (req, res) => {
    // Explicit CORS headers for cross-origin Shopify CLI requests
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );

    try {
      const { api_version } = req.query;
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shopDomain || !adminToken) {
        return res
          .status(500)
          .json({ error: "Shopify credentials not configured" });
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

  // Email Template API endpoints
  app.get("/api/email-templates", async (req, res) => {
    try {
      const templates = await db.select().from(emailTemplates).orderBy(emailTemplates.name);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ error: "Failed to fetch email templates" });
    }
  });

  app.get("/api/email-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, id))
        .limit(1);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching email template:", error);
      res.status(500).json({ error: "Failed to fetch email template" });
    }
  });

  app.put("/api/email-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const [updated] = await db
        .update(emailTemplates)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(emailTemplates.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({ error: "Failed to update email template" });
    }
  });

  app.post("/api/email-templates/test", async (req, res) => {
    try {
      const { templateId, to, variables } = req.body;
      
      // Get template name
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, templateId))
        .limit(1);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Send test email
      const result = await sendTemplatedEmail(to, template.name, variables);
      
      res.json({ 
        success: result, 
        message: result ? "Test email sent successfully" : "Failed to send test email" 
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  app.get("/api/email-send-log", async (req, res) => {
    try {
      const logs = await db
        .select()
        .from(emailSendLog)
        .orderBy(desc(emailSendLog.createdAt))
        .limit(100);
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching email send log:", error);
      res.status(500).json({ error: "Failed to fetch email send log" });
    }
  });

  // Initialize email templates on startup
  initializeDefaultTemplates().catch(console.error);

  // Gmail API endpoints
  app.get("/api/gmail/unread", async (req, res) => {
    try {
      const messages = await getUnreadMessages();
      res.json({ success: true, messages });
    } catch (error) {
      console.error("Error fetching Gmail messages:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch messages" 
      });
    }
  });

  app.post("/api/gmail/send", async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      
      if (!to || !subject || !body) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields: to, subject, body" 
        });
      }

      const result = await sendEmail(to, subject, body);
      res.json({ ...result });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to send email" 
      });
    }
  });

  // Mount webhook routes (includes /logs endpoint with no-cache headers)
  app.use("/api/webhooks", webhookRoutes);

  // Wholesale Registration Update Route (for admin dashboard)
  app.patch("/api/wholesale-registration/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Update in local database
      const [updated] = await db
        .update(wholesaleRegistrations)
        .set(updates)
        .where(eq(wholesaleRegistrations.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Registration not found" });
      }

      return res.json({
        success: true,
        registration: updated,
      });
    } catch (error: any) {
      console.error("❌ Error updating registration:", error);
      return res.status(500).json({ error: "Failed to update registration" });
    }
  });

  // Wholesale Account Update Route (for customer account extension)
  app.patch("/api/wholesale-account/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const shopifyConfig = getShopifyConfig();
      if (!shopifyConfig) {
        return res
          .status(500)
          .json({ error: "Shopify credentials not configured" });
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
        value: String(value),
      }));

      const variables = {
        id: `gid://shopify/Metaobject/${id}`,
        metaobject: {
          fields,
        },
      };

      const shopifyResponse = await fetch(
        `https://${shop}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: metaobjectMutation,
            variables,
          }),
        },
      );

      const result = await shopifyResponse.json();

      if (result.data?.metaobjectUpdate?.userErrors?.length > 0) {
        return res.status(400).json({
          error: "Validation errors",
          details: result.data.metaobjectUpdate.userErrors,
        });
      }

      return res.json({
        success: true,
        metaobject: result.data?.metaobjectUpdate?.metaobject,
      });
    } catch (error: any) {
      console.error("❌ Error updating wholesale account:", error);
      return res
        .status(500)
        .json({ error: "Failed to update wholesale account" });
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
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
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

  // Wholesale registration submission (only save to DB as pending, no CRM creation yet)
  app.post(
    "/api/wholesale-registration",
    async (req: Request, res: Response) => {
      try {
        const formData = req.body;
        console.log("📝 Wholesale registration received:", formData);

        // Map marketingOptIn and smsConsent to CRM-compatible fields
        const registrationData = {
          ...formData,
          acceptsEmailMarketing: formData.marketingOptIn || false,
          acceptsSmsMarketing: formData.smsConsent || false,
          status: "pending",
          submittedAt: new Date(),
        };

        // Save to database (pending approval)
        const [registration] = await db
          .insert(wholesaleRegistrations)
          .values(registrationData)
          .returning();

        console.log(
          "✅ Registration saved to database (pending):",
          registration.id,
        );
        console.log("🔒 CRM creation deferred until admin approval");

        // Send Gmail notification to admins (non-blocking)
        try {
          const { sendNewWholesaleApplicationEmail } = await import("./services/emailService");
          
          // Get notification recipients from database
          const recipients = await db
            .select()
            .from(notificationRecipients)
            .where(eq(notificationRecipients.category, "wholesale_notifications"))
            .where(eq(notificationRecipients.active, true));
          
          const recipientEmails = recipients.length > 0 
            ? recipients.map(r => r.email)
            : ["sales@itsunderitall.com", "admin@itsunderitall.com"]; // fallback

          await sendNewWholesaleApplicationEmail({
            to: recipientEmails,
            registrationId: registration.id,
            firstName: registration.firstName,
            lastName: registration.lastName,
            firmName: registration.firmName,
            email: registration.email,
            phone: registration.phone || undefined,
            businessType: registration.businessType,
            businessAddress: registration.businessAddress,
            businessAddress2: registration.businessAddress2 || undefined,
            city: registration.city,
            state: registration.state,
            zipCode: registration.zipCode,
            applicationDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            applicationNumber: registration.id.substring(0, 8).toUpperCase(),
          });
          console.log("✅ Gmail notification sent to admins");
        } catch (emailError) {
          console.error("⚠️ Gmail notification failed (non-blocking):", emailError);
          // Don't fail the registration—email is non-critical
        }

        res.json({
          success: true,
          registrationId: registration.id,
          message: "Registration submitted. Awaiting admin approval.",
        });
      } catch (error) {
        console.error("❌ Registration error:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Registration failed",
        });
      }
    },
  );

  // CRM Duplicate Check - Search for potential conflicts before approval
  app.post(
    "/api/admin/check-crm-duplicates/:id",
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Fetch registration from DB
        const [registration] = await db
          .select()
          .from(wholesaleRegistrations)
          .where(eq(wholesaleRegistrations.id, id));

        if (!registration) {
          return res.status(404).json({ error: "Registration not found" });
        }

        const crmApiKey = process.env.CRM_API_KEY;
        if (!crmApiKey) {
          return res.status(500).json({ error: "CRM_API_KEY not configured" });
        }

        // Build SQL filter for duplicate detection (company name, phone, or website)
        const filters = [];
        if (registration.firmName) {
          filters.push(
            `Account = '${registration.firmName.replace(/'/g, "''")}'`,
          );
        }
        if (registration.phone) {
          filters.push(`CompanyPhone = '${registration.phone}'`);
        }
        if (registration.website) {
          filters.push(`Website = '${registration.website}'`);
        }

        const sqlFilter = filters.join(" OR ");

        const crmPayload = {
          APIKey: crmApiKey,
          Resource: "Account",
          Operation: "Get",
          Columns: [
            "Account",
            "AccountID",
            "AccountNumber",
            "City",
            "State",
            "CompanyPhone",
            "Website",
          ],
          SQLFilter: sqlFilter,
          Sort: {
            Column: "CreationDate",
            Order: "Desc",
          },
        };

        console.log("🔍 CRM Duplicate Check Payload:");
        console.log(JSON.stringify(crmPayload, null, 2));

        const { default: http } = await import("http");
        const payloadString = JSON.stringify(crmPayload);

        const options = {
          hostname: "liveapi.claritysoftcrm.com",
          port: 80,
          path: "/api/v1",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payloadString),
            Accept: "*/*",
            "Accept-Encoding": "gzip, deflate",
            Connection: "keep-alive",
            "User-Agent": "curl/7.68.0",
          },
        };

        const crmData = await new Promise<any>((resolve, reject) => {
          const req = http.request(options, (crmRes: any) => {
            let data = "";
            crmRes.on("data", (chunk: any) => (data += chunk));
            crmRes.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch (error) {
                reject(new Error(`Failed to parse CRM response: ${data}`));
              }
            });
          });

          req.on("error", reject);
          req.write(payloadString);
          req.end();
        });

        console.log("📤 CRM Duplicate Check Response:");
        console.log(JSON.stringify(crmData, null, 2));

        // Return potential conflicts (empty array if none found)
        res.json({
          conflicts: crmData?.Data || [],
          registration: {
            firmName: registration.firmName,
            phone: registration.phone,
            website: registration.website,
          },
        });
      } catch (error) {
        console.error("❌ CRM duplicate check error:", error);
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Duplicate check failed",
        });
      }
    },
  );

  // CRM Account Sync - Create or update CRM account (with optional AccountId for match)
  app.post(
    "/api/admin/sync-to-crm/:id",
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { accountId } = req.body; // Optional: AccountId if updating existing account

        // Fetch registration from DB
        const [registration] = await db
          .select()
          .from(wholesaleRegistrations)
          .where(eq(wholesaleRegistrations.id, id));

        if (!registration) {
          return res.status(404).json({ error: "Registration not found" });
        }

        const crmApiKey = process.env.CRM_API_KEY;
        if (!crmApiKey) {
          return res.status(500).json({ error: "CRM_API_KEY not configured" });
        }

        const { default: http } = await import("http");

        const crmPayload: any = {
          APIKey: crmApiKey,
          Resource: "Account",
          Operation: "Create Or Edit",
          Data: {
            Name: registration.firmName,
            "First Name": registration.firstName,
            "Last Name": registration.lastName,
            CompanyPhone: registration.phone || "",
            Email: registration.email,
            Address1: registration.businessAddress,
            Address2: registration.businessAddress2 || "",
            City: registration.city,
            State: registration.state,
            ZipCode: registration.zipCode,
            Country: "United States",
            Note: "Created via Wholesale Registration",
            "Account Type": registration.businessType || "",
            "Sample Set": registration.receivedSampleSet ? "Yes" : "No",
            Instagram: registration.instagramHandle || "",
            Website: registration.website || "",
            "Accepts Email Marketing": registration.acceptsEmailMarketing
              ? "Yes"
              : "No",
            "Accepts SMS Marketing": registration.acceptsSmsMarketing
              ? "Yes"
              : "No",
            EIN: registration.taxId || "",
            "UIA-ID": registration.id,
            Representative: "John Thompson",
            leadsourceid: "85927b21-38b2-49dd-8b15-c9b43e41925b",
            leadsources: "Partner",
            "Sales Representative": "John Thompson",
            Registration: "Registered but no documentation",
            "Lead Source Specifics": "UIA WHOLESALE APP",
            Tags: "UIA-FORM",
            "Shopify Reference": "its-under-it-all",
          },
        };

        // If updating existing account, include AccountId
        if (accountId) {
          crmPayload.AccountId = accountId;
          console.log("🔄 Updating existing CRM Account:", accountId);
        } else {
          console.log("🆕 Creating new CRM Account");
        }

        console.log("📤 CRM Account Sync Payload:");
        console.log(JSON.stringify(crmPayload, null, 2));

        const payloadString = JSON.stringify(crmPayload);

        const options = {
          hostname: "liveapi.claritysoftcrm.com",
          port: 80,
          path: "/api/v1",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payloadString),
            Accept: "*/*",
            "Accept-Encoding": "gzip, deflate",
            Connection: "keep-alive",
            "User-Agent": "curl/7.68.0",
          },
        };

        const crmData = await new Promise<any>((resolve, reject) => {
          const req = http.request(options, (crmRes: any) => {
            let data = "";
            crmRes.on("data", (chunk: any) => (data += chunk));
            crmRes.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch (error) {
                reject(new Error(`Failed to parse CRM response: ${data}`));
              }
            });
          });

          req.on("error", reject);
          req.write(payloadString);
          req.end();
        });

        console.log("📤 CRM Account Sync Response:");
        console.log(JSON.stringify(crmData, null, 2));

        const clarityAccountId = crmData?.Data?.AccountId || accountId;

        if (!clarityAccountId) {
          throw new Error("CRM Account sync failed - no AccountId returned");
        }

        console.log("✅ CRM Account synced with AccountID:", clarityAccountId);

        // Save clarityAccountId to DB
        try {
          const [updated] = await db
            .update(wholesaleRegistrations)
            .set({ clarityAccountId })
            .where(eq(wholesaleRegistrations.id, id))
            .returning();

          if (!updated) {
            console.error(
              "⚠️ Database update failed - registration not found:",
              id,
            );
          } else {
            console.log(
              "✅ Database updated with clarityAccountId:",
              clarityAccountId,
            );
          }
        } catch (dbError) {
          console.error("❌ Database update error:", dbError);
          console.log("⚠️ Continuing despite DB error - CRM sync succeeded");
        }

        res.json({
          success: true,
          clarityAccountId,
          isUpdate: !!accountId,
        });
      } catch (error) {
        console.error("❌ CRM account sync error:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "CRM sync failed",
        });
      }
    },
  );

  // Create Shopify Customer for approved registration
  app.post(
    "/api/wholesale-registration/:id/create-shopify-account",
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Fetch registration from DB
        const [registration] = await db
          .select()
          .from(wholesaleRegistrations)
          .where(eq(wholesaleRegistrations.id, id));

        if (!registration) {
          return res.status(404).json({ error: "Registration not found" });
        }

        if (registration.status !== "approved") {
          return res.status(400).json({
            error: "Registration must be approved before creating Shopify account",
          });
        }

        const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
        const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

        if (!shopDomain || !adminToken) {
          return res.status(500).json({
            error: "Shopify credentials not configured",
          });
        }

        let customerId: number;
        let customerExists = false;

        // First, check if customer with this email already exists
        const searchQuery = `
          query SearchCustomers($query: String!) {
            customers(first: 1, query: $query) {
              edges {
                node {
                  id
                  email
                }
              }
            }
          }
        `;

        const searchResponse = await fetch(
          `https://${shopDomain}/admin/api/2025-01/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": adminToken,
            },
            body: JSON.stringify({
              query: searchQuery,
              variables: { query: `email:${registration.email}` },
            }),
          },
        );

        const searchData = await searchResponse.json();
        const existingCustomer = searchData?.data?.customers?.edges?.[0]?.node;

        if (existingCustomer) {
          // Extract numeric ID from GID
          const gid = existingCustomer.id;
          customerId = parseInt(gid.split('/').pop() || '0');
          customerExists = true;
          console.log("✅ Found existing customer by email:", customerId);
        } else {
          // Search by phone if email search failed (phone may already exist)
          const phoneSearchQuery = `
            query SearchCustomersByPhone($query: String!) {
              customers(first: 1, query: $query) {
                edges {
                  node {
                    id
                    email
                    phone
                  }
                }
              }
            }
          `;

          const phoneSearchResponse = await fetch(
            `https://${shopDomain}/admin/api/2025-01/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": adminToken,
              },
              body: JSON.stringify({
                query: phoneSearchQuery,
                variables: { query: `phone:${registration.phone}` },
              }),
            },
          );

          const phoneSearchData = await phoneSearchResponse.json();
          const existingByPhone = phoneSearchData?.data?.customers?.edges?.[0]?.node;

          if (existingByPhone) {
            // Customer with this phone exists - update instead of create
            const gid = existingByPhone.id;
            customerId = parseInt(gid.split('/').pop() || '0');
            customerExists = true;
            console.log("✅ Found existing customer by phone (will update metafields):", customerId);
          } else {
            // No existing customer - safe to create
            const customerPayload = {
              customer: {
                email: registration.email,
                first_name: registration.firstName,
                last_name: registration.lastName,
                phone: registration.phone || null,
                tags: `wholesale, ${registration.businessType}`,
                note: `Wholesale account - ${registration.firmName}`,
                tax_exempt: registration.isTaxExempt,
                addresses: [{
                  address1: registration.businessAddress,
                  address2: registration.businessAddress2 || "",
                  city: registration.city,
                  province: registration.state,
                  zip: registration.zipCode,
                  country: "United States",
                  company: registration.firmName,
                }],
              },
            };

            const customerResponse = await fetch(
              `https://${shopDomain}/admin/api/2025-01/customers.json`,
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
              console.error("❌ Shopify customer creation failed:", errorText);
              return res.status(500).json({
                error: "Failed to create Shopify customer",
                details: errorText,
              });
            }

            const customerData = await customerResponse.json();
            customerId = customerData.customer.id;
            console.log("✅ Shopify customer created:", customerId);
          }
        }

        // Set all wholesale metafields (for both new and existing customers)
        const metafieldsMutation = `
          mutation SetCustomerMetafields($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                key
                namespace
                value
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const metafields = [
          {
            ownerId: `gid://shopify/Customer/${customerId}`,
            namespace: "custom",
            key: "wholesale_name",
            value: registration.firmName,
            type: "single_line_text_field",
          },
          {
            ownerId: `gid://shopify/Customer/${customerId}`,
            namespace: "custom",
            key: "uia_id",
            value: registration.id,
            type: "single_line_text_field",
          },
        ];

        if (registration.clarityAccountId) {
          metafields.push({
            ownerId: `gid://shopify/Customer/${customerId}`,
            namespace: "custom",
            key: "wholesale_clarity_id",
            value: registration.clarityAccountId,
            type: "single_line_text_field",
          });
          metafields.push({
            ownerId: `gid://shopify/Customer/${customerId}`,
            namespace: "custom",
            key: "clarity_account_name",
            value: registration.firmName,
            type: "single_line_text_field",
          });
        }

        const metafieldsResponse = await fetch(
          `https://${shopDomain}/admin/api/2025-01/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": adminToken,
            },
            body: JSON.stringify({
              query: metafieldsMutation,
              variables: { metafields },
            }),
          },
        );

        const metafieldsResult = await metafieldsResponse.json();
        console.log("✅ Customer metafields set:", metafieldsResult);

        // Update registration with Shopify customer ID
        await db
          .update(wholesaleRegistrations)
          .set({ shopifyCustomerId: customerId.toString() })
          .where(eq(wholesaleRegistrations.id, id));

        res.json({
          success: true,
          customerId,
          customerUrl: `https://${shopDomain}/admin/customers/${customerId}`,
          clarityAccountId: registration.clarityAccountId,
          customerExists,
          message: customerExists
            ? "Updated existing customer with wholesale metafields"
            : "Created new customer with wholesale metafields",
        });
      } catch (error) {
        console.error("❌ Error creating Shopify customer:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to create Shopify customer",
        });
      }
    },
  );

  // Admin Approval → Create CRM Account + Shopify Customer with wholesale_clarity_id
  app.post(
    "/api/admin/approve-registration/:id",
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Fetch registration from DB
        const [registration] = await db
          .select()
          .from(wholesaleRegistrations)
          .where(eq(wholesaleRegistrations.id, id));

        if (!registration) {
          return res.status(404).json({ error: "Registration not found" });
        }

        // CRM Account should already be created via /api/admin/sync-to-crm
        const clarityAccountId = registration.clarityAccountId;

        if (!clarityAccountId) {
          return res.status(400).json({
            error: "CRM account not synced yet. Please sync to CRM first.",
          });
        }

        // Create/Update Shopify Customer + Set wholesale_clarity_id metafield
        const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
        const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
        let customerId: string | undefined;

        if (shopDomain && adminToken) {
          // Check if customer exists
          const customerQuery = `
          query GetCustomerByEmail($email: String!) {
            customers(first: 1, query: $email) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `;

          const customerCheckResponse = await fetch(
            `https://${shopDomain}/admin/api/2025-01/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": adminToken,
              },
              body: JSON.stringify({
                query: customerQuery,
                variables: { email: `email:${registration.email}` },
              }),
            },
          );

          const customerCheckData = await customerCheckResponse.json();
          customerId =
            customerCheckData?.data?.customers?.edges?.[0]?.node?.id;

          // Create customer if doesn't exist
          if (!customerId) {
            const customerCreateMutation = `
            mutation CreateCustomer($input: CustomerInput!) {
              customerCreate(input: $input) {
                customer {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

            const customerInput = {
              email: registration.email,
              firstName: registration.firstName,
              lastName: registration.lastName,
              phone: registration.phone || null,
            };

            const customerCreateResponse = await fetch(
              `https://${shopDomain}/admin/api/2025-01/graphql.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Shopify-Access-Token": adminToken,
                },
                body: JSON.stringify({
                  query: customerCreateMutation,
                  variables: { input: customerInput },
                }),
              },
            );

            const customerCreateData = await customerCreateResponse.json();

            if (
              customerCreateData?.data?.customerCreate?.userErrors?.length > 0
            ) {
              throw new Error(
                customerCreateData.data.customerCreate.userErrors[0].message,
              );
            }

            customerId = customerCreateData?.data?.customerCreate?.customer?.id;
            console.log("✅ Customer created:", customerId);
          }

          // Set wholesale_clarity_id metafield
          const metafieldsMutation = `
          mutation SetCustomerMetafields($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                key
                namespace
                value
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

          const metafields = [
            {
              ownerId: customerId,
              namespace: "custom",
              key: "wholesale_clarity_id",
              value: clarityAccountId,
              type: "single_line_text_field",
            },
          ];

          const metafieldsResponse = await fetch(
            `https://${shopDomain}/admin/api/2025-01/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": adminToken,
              },
              body: JSON.stringify({
                query: metafieldsMutation,
                variables: { metafields },
              }),
            },
          );

          const metafieldsResult = await metafieldsResponse.json();

          if (metafieldsResult.data?.metafieldsSet?.userErrors?.length > 0) {
            console.error(
              "❌ Metafield write errors:",
              metafieldsResult.data.metafieldsSet.userErrors,
            );
          } else {
            console.log(
              "✅ wholesale_clarity_id metafield set:",
              clarityAccountId,
            );
          }
        }

        // Update registration status to approved
        await db
          .update(wholesaleRegistrations)
          .set({
            status: "approved",
            clarityAccountId: clarityAccountId,
          })
          .where(eq(wholesaleRegistrations.id, id));

        // Send welcome email to customer after CRM account creation
        try {
          const { sendNewCRMCustomerEmail } = await import("./services/emailService");
          await sendNewCRMCustomerEmail({
            to: registration.email,
            firstName: registration.firstName,
            lastName: registration.lastName,
            firmName: registration.firmName,
            email: registration.email,
            phone: registration.phone || undefined,
            businessType: registration.businessType,
            clarityAccountId: clarityAccountId,
            businessAddress: registration.businessAddress,
            businessAddress2: registration.businessAddress2 || undefined,
            city: registration.city,
            state: registration.state,
            zipCode: registration.zipCode,
            isTaxExempt: registration.isTaxExempt,
            taxId: registration.taxId || undefined,
          });
          console.log("✅ Welcome email sent to customer:", registration.email);
        } catch (emailError) {
          console.error("⚠️ Customer welcome email failed (non-blocking):", emailError);
          // Don't fail the approval—email is non-critical
        }

        // Send Gmail notification to admins
        try {
          const { sendNewWholesaleApplicationEmail } = await import("./services/emailService");
          await sendNewWholesaleApplicationEmail({
            to: ["sales@itsunderitall.com", "admin@itsunderitall.com"],
            registrationId: registration.id,
            firstName: registration.firstName,
            lastName: registration.lastName,
            firmName: registration.firmName,
            email: registration.email,
            phone: registration.phone || undefined,
            businessType: registration.businessType,
            businessAddress: registration.businessAddress,
            businessAddress2: registration.businessAddress2 || undefined,
            city: registration.city,
            state: registration.state,
            zipCode: registration.zipCode,
            applicationDate: format(new Date(registration.createdAt), 'MMMM d, yyyy'),
            applicationNumber: registration.id.substring(0, 8).toUpperCase(),
          });
          console.log("✅ Gmail notification sent to admins");
        } catch (emailError) {
          console.error("⚠️ Gmail notification failed (non-blocking):", emailError);
          // Don't fail the approval—email is non-critical
        }

        res.json({
          success: true,
          message:
            "Registration approved, CRM account created, customer linked, welcome email sent",
          clarityAccountId,
        });
      } catch (error) {
        // Only fail if it's NOT a phone duplicate error
        const errorMessage = error instanceof Error ? error.message : "Approval failed";
        if (errorMessage.toLowerCase().includes('phone') && errorMessage.toLowerCase().includes('already been taken')) {
          console.warn("⚠️ Phone duplicate warning (continuing approval):", errorMessage);
          res.json({
            success: true,
            message: "Registration approved, CRM account created (phone already exists in Shopify)",
            clarityAccountId: registration.clarityAccountId,
            warning: errorMessage,
          });
        } else {
          console.error("❌ Approval error:", error);
          res.status(500).json({
            error: errorMessage,
          });
        }
      }
    },
  );

  // Company Enrichment - AI-powered with Cloudflare geo + gpt-4o-search-preview strict schema
  app.post("/api/enrich-company", async (req, res) => {
    try {
      console.log("📦 Raw request body:", JSON.stringify(req.body, null, 2));

      const companyName = (
        req.body?.firmName ||
        req.body?.companyName ||
        ""
      ).trim();

      console.log("🔍 Company enrichment request for:", companyName);

      if (companyName.length < 3) {
        console.log("⏭️ Company name too short, skipping enrichment");
        return res.json({
          enriched: false,
          data: null,
        });
      }

      const openaiApiKey =
        process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        console.error("❌ OPENAI_API_KEY not configured");
        return res.json({
          enriched: false,
          data: {
            website: null,
            instagramHandle: null,
            businessAddress: null,
            businessAddress2: null,
            city: null,
            state: null,
            zipCode: null,
            phone: null,
          },
        });
      }

      // Extract Cloudflare geo headers
      const cfCountry = (req.headers["cf-ipcountry"] as string) || "US";
      const cfCity = (req.headers["cf-ipcity"] as string) || "";
      const cfState = (req.headers["cf-region"] as string) || "";
      const cfIp = (req.headers["cf-connecting-ip"] as string) || "";

      console.log("🌍 Cloudflare geo-context:", {
        ip: cfIp,
        city: cfCity,
        state: cfState,
        country: cfCountry,
      });

      // Build geo context for prompt (US-only prioritization)
      const geoContext =
        cfCountry === "US" && (cfCity || cfState)
          ? `Approx user location: ${[cfCity, cfState].filter(Boolean).join(", ")} (US). When disambiguating similar names, prefer entities near this area.`
          : `Approx user location unknown.`;
      console.log("📝 Geo context for prompt:", geoContext);

      // Strict system prompt for US-only enrichment
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
        "- In cases of conflicting data, select information from the most authoritative and recently updated source (prefer sources updated within the last 12 months). If no clarity is achieved, set that specific field to null.",
        "- **Return PARTIAL results**: If you find ANY valid data (even just website, phone, or address), return it. Set ONLY unknown/unfound fields to null. Do NOT require a complete profile.",
        "- If no US business exists with the given name or ZERO data can be found, return a JSON object with ALL fields set to null.",
        "",
        "Before answering:",
        "- Think step-by-step through each source you consult, how you verify US relevance, and how you resolve ambiguous or conflicting data.",
        '- Summarize your chain of reasoning in a "reasoning" field at the end of the object.',
        "",
        "After producing the JSON object, validate that all fields meet the schema and order constraints, and that no extra properties are present. If any error is detected, self-correct and reissue the output.",
        "",
        "The JSON response must:",
        "- Be strictly valid per the schema: every required field present, each value matching its regex/pattern constraints, absolutely no extra properties, and the exact field order as shown below.",
        '- Be output as a single, compact JSON object, with no comments or explanations outside of the "reasoning" field.',
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
        "  \"zipCode\": \"string|null (5 or 9 digit US zip: '12345' or '12345-6789')\",",
        '  "phone": "string|null (must match US phone pattern: (999) 999-9999)",',
        '  "reasoning": "string (1–3 sentence summary explaining the sources checked, what data was found, and why other fields are null)"',
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
        "**IMPORTANT**: Return partial data if ANY field can be found. Only set ALL fields to null if ZERO information exists.",
        "",
        'Ensure "reasoning" appears as the final field in the output object.',
        "",
        geoContext,
      ].join("\n");

      const userPrompt = [
        `Company to research: "${companyName}"`,
        "Please quickly find reliable results for the business name you are given.",
        "Return ONE US business profile as JSON that EXACTLY matches the provided JSON Schema.",
        "**IMPORTANT**: Return PARTIAL data if you find ANY information (website, phone, address, etc.). Don't require a complete profile.",
        "Search US sources ONLY. If ZERO data exists for a US match, set ALL fields to null.",
        "Prefer official sources (company site > state registries > verified platforms) over directories.",
        "If conflicting info, pick the most authoritative AND freshest source; otherwise null that specific field.",
        "If you encounter a non-US entity with the same/similar name, IGNORE it and keep searching for a US entity.",
        "Search the web for current, real data. If website is found on exact name match, retrieve Google Places or Maps data from search.",
        "Ensure address, phone, and zip are correct. Return ONLY the JSON.",
      ].join("\n");

      console.log(
        "🚀 Calling OpenAI with gpt-4o-search-preview for real-time web search...",
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
        return res.json({
          enriched: false,
          data: {
            website: null,
            instagramHandle: null,
            businessAddress: null,
            businessAddress2: null,
            city: null,
            state: null,
            zipCode: null,
            phone: null,
          },
        });
      }

      const openaiData = await openaiResponse.json();
      console.log(
        "📦 OpenAI raw response:",
        JSON.stringify(openaiData, null, 2),
      );

      const responseContent = openaiData.choices?.[0]?.message?.content || "{}";
      console.log("📝 OpenAI content:", responseContent);

      // Parse structured output
      const enriched = JSON.parse(responseContent);
      console.log("✅ Parsed enrichment data:", enriched);

      // Check if we have ANY enriched data (show modal only if data exists)
      const hasData =
        enriched.website ||
        enriched.instagramHandle ||
        enriched.businessAddress ||
        enriched.city ||
        enriched.state ||
        enriched.zipCode ||
        enriched.phone;

      if (!hasData) {
        console.log("ℹ️ No enrichment data found for this company");
        return res.json({
          enriched: false,
          data: null,
        });
      }

      // Return enriched data for modal confirmation
      console.log("✅ Enrichment data found, triggering modal");
      return res.json({
        enriched: true,
        data: {
          website: enriched.website || null,
          instagramHandle: enriched.instagramHandle || null,
          businessAddress: enriched.businessAddress || null,
          businessAddress2: enriched.businessAddress2 || null,
          city: enriched.city || null,
          state: enriched.state || null,
          zipCode: enriched.zipCode || null,
          phone: enriched.phone || null,
        },
      });
    } catch (error) {
      console.error("❌ Company enrichment error:", error);
      return res.json({
        enriched: false,
        data: null,
        error: error instanceof Error ? error.message : "Enrichment failed",
      });
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
        return res
          .status(500)
          .json({ error: "Shopify credentials not configured" });
      }

      // Validate lineItems (must be array)
      if (!Array.isArray(lineItems) || lineItems.length === 0) {
        return res.status(400).json({
          error: "Missing or invalid lineItems",
          details: "lineItems must be a non-empty array",
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
          lineItems: lineItems.map((item: any) => {
            // Support both variant-based and custom line items
            if (item.variantId) {
              return {
                variantId: item.variantId,
                quantity: item.quantity,
                customAttributes: item.customAttributes || [],
              };
            } else {
              // Custom line item with price override (no variant)
              return {
                title: item.title,
                quantity: item.quantity,
                originalUnitPrice: item.price,
                customAttributes: item.customAttributes || [],
              };
            }
          }),
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
        },
      );

      const shopifyData = await shopifyResponse.json();

      // Check for critical errors (excluding phone duplicate warnings)
      const userErrors = shopifyData.data?.customerCreate?.userErrors || [];
      const criticalErrors = userErrors.filter((err: any) => 
        !err.message?.toLowerCase().includes('phone') && 
        !err.message?.toLowerCase().includes('already been taken')
      );

      if (shopifyData.errors || criticalErrors.length > 0) {
        console.error("❌ Shopify customer creation failed:");
        console.error("User Errors:", JSON.stringify(userErrors, null, 2));
        console.error("Full Response:", JSON.stringify(shopifyData, null, 2));
        return res.status(500).json({
          error: "Failed to create Shopify customer",
          details: criticalErrors.length > 0 ? criticalErrors : shopifyData.errors,
        });
      }

      // Log phone duplicate as warning, not error
      if (userErrors.length > 0) {
        console.warn("⚠️ Shopify customer creation warnings (non-blocking):", JSON.stringify(userErrors, null, 2));
      }

      const draftOrder = shopifyData.data.draftOrderCreate.draftOrder;

      // Save to local database
      const [savedOrder] = await db
        .insert(draftOrders)
        .values({
          shopifyDraftOrderId: draftOrder.id,
          shopifyDraftOrderUrl: `https://${shopDomain}/admin/draft_orders/${draftOrder.id.split("/").pop()}`,
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
      // Fetch metaobject definition status
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      let metaobjectStatus: any = { configured: false };

      if (shopDomain && adminToken) {
        try {
          const query = `
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
              metaobjects(type: "$app:wholesale_account", first: 10) {
                nodes {
                  id
                  handle
                  displayName
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
            },
          );

          const data = await response.json();

          if (data.data?.metaobjectDefinitionByType) {
            metaobjectStatus = {
              configured: true,
              definition: data.data.metaobjectDefinitionByType,
              entryCount: data.data.metaobjects?.nodes?.length || 0,
              entries: data.data.metaobjects?.nodes || [],
            };
          }
        } catch (error) {
          metaobjectStatus.error =
            error instanceof Error ? error.message : "Unknown error";
        }
      }

      // Fetch recent data for debugging
      const [recentRegistrations, recentQuotes, recentWebhooks] =
        await Promise.all([
          db
            .select()
            .from(wholesaleRegistrations)
            .orderBy(desc(wholesaleRegistrations.createdAt))
            .limit(10),
          db
            .select()
            .from(calculatorQuotes)
            .orderBy(desc(calculatorQuotes.createdAt))
            .limit(10),
          db
            .select()
            .from(webhookLogs)
            .orderBy(desc(webhookLogs.timestamp))
            .limit(20),
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
    .metaobject-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
    }
    .metaobject-badge.configured {
      background: #10b981;
      color: #fff;
    }
    .metaobject-badge.not-configured {
      background: #ef4444;
      color: #fff;
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

    <!-- Metaobject Status (Top Priority) -->
    <div class="section" style="border: 2px solid ${metaobjectStatus.configured ? "#10b981" : "#ef4444"};">
      <h2>🔮 Metaobject Definition Status</h2>
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <span class="metaobject-badge ${metaobjectStatus.configured ? "configured" : "not-configured"}">
          ${metaobjectStatus.configured ? "✅ CONFIGURED" : "❌ NOT CONFIGURED"}
        </span>
        ${
          metaobjectStatus.configured
            ? `
          <span style="color: #9ca3af; font-size: 0.875rem;">
            wholesale_account metaobject definition deployed
          </span>
        `
            : `
          <span style="color: #ef4444; font-size: 0.875rem;">
            Run 'shopify app deploy' to sync shopify.app.toml
          </span>
        `
        }
      </div>
      ${
        metaobjectStatus.configured
          ? `
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${metaobjectStatus.definition?.fieldDefinitions?.length || 0}</div>
            <div class="stat-label">Field Definitions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${metaobjectStatus.entryCount || 0}</div>
            <div class="stat-label">Wholesale Accounts</div>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 0.5rem;">Definition ID:</p>
          <code style="background: #1a1a1a; padding: 0.5rem; border-radius: 6px; color: #10b981; font-size: 0.875rem; display: block; overflow-x: auto;">${metaobjectStatus.definition?.id || "N/A"}</code>
        </div>
        <div style="margin-top: 1rem;">
          <p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 0.5rem;">Type:</p>
          <code style="background: #1a1a1a; padding: 0.5rem; border-radius: 6px; color: #10b981; font-size: 0.875rem; display: block;">${metaobjectStatus.definition?.type || "N/A"}</code>
        </div>
        ${
          metaobjectStatus.entries.length > 0
            ? `
          <details style="margin-top: 1rem;">
            <summary style="cursor: pointer; color: #F2633A; font-weight: 600; margin-bottom: 0.5rem;">📋 Recent Entries (${metaobjectStatus.entries.length})</summary>
            <table style="width: 100%; margin-top: 0.5rem;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 0.5rem; background: rgba(242, 99, 58, 0.1); color: #F2633A;">Display Name</th>
                  <th style="text-align: left; padding: 0.5rem; background: rgba(242, 99, 58, 0.1); color: #F2633A;">Handle</th>
                  <th style="text-align: left; padding: 0.5rem; background: rgba(242, 99, 58, 0.1); color: #F2633A;">ID</th>
                </tr>
              </thead>
              <tbody>
                ${metaobjectStatus.entries
                  .map(
                    (entry: any) => `
                  <tr style="border-bottom: 1px solid rgba(242, 99, 58, 0.1);">
                    <td style="padding: 0.5rem;">${entry.displayName}</td>
                    <td style="padding: 0.5rem;"><code style="font-size: 0.75rem; color: #10b981;">${entry.handle}</code></td>
                    <td style="padding: 0.5rem; color: #9ca3af; font-size: 0.75rem;">${entry.id}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </details>
        `
            : ""
        }
      `
          : `
        <div style="margin-top: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px;">
          <p style="color: #ef4444; font-weight: 600;">❌ Metaobject definition not found in Shopify</p>
          <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.5rem;">
            ${metaobjectStatus.error ? `Error: ${metaobjectStatus.error}` : "Expected type: $app:wholesale_account"}
          </p>
          <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.5rem;">
            Run <code style="background: #1a1a1a; padding: 0.25rem 0.5rem; border-radius: 4px; color: #F2633A;">shopify app deploy</code> to sync your shopify.app.toml configuration.
          </p>
        </div>
      `
      }
    </div>

    <!-- Stats Overview (Now Below Metaobject) -->
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
          <div class="stat-value">${recentWebhooks.filter((w: any) => w.source === "shopify").length}</div>
          <div class="stat-label">Shopify Events</div>
        </div>
      </div>
    </div>

    <!-- Wholesale Registrations -->
    <div class="section">
      <h2>👥 Recent Wholesale Registrations</h2>
      ${
        recentRegistrations.length === 0
          ? '<p style="color: #9ca3af;">No registrations found</p>'
          : `
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
            ${recentRegistrations
              .map(
                (reg: any) => `
              <tr>
                <td><strong>${reg.firmName || "N/A"}</strong></td>
                <td>${reg.firstName} ${reg.lastName}</td>
                <td>${reg.email}</td>
                <td><span class="status ${reg.status}">${reg.status}</span></td>
                <td class="timestamp">${new Date(reg.createdAt).toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `
      }
    </div>

    <!-- Calculator Quotes -->
    <div class="section">
      <h2>📐 Recent Calculator Quotes</h2>
      ${
        recentQuotes.length === 0
          ? '<p style="color: #9ca3af;">No quotes found</p>'
          : `
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
            ${recentQuotes
              .map(
                (quote: any) => `
              <tr>
                <td>${quote.rugWidth}" × ${quote.rugLength}"</td>
                <td>${quote.productName}</td>
                <td><strong style="color: #10b981;">$${quote.totalPrice}</strong></td>
                <td>${quote.installLocation || "Not specified"}</td>
                <td class="timestamp">${new Date(quote.createdAt).toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `
      }
    </div>

    <!-- Webhook Events -->
    <div class="section">
      <h2>🔔 Recent Webhook Events</h2>
      ${
        recentWebhooks.length === 0
          ? '<p style="color: #9ca3af;">No webhooks logged</p>'
          : `
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
            ${recentWebhooks
              .map(
                (hook: any) => `
              <tr>
                <td><strong>${hook.type}</strong></td>
                <td><span class="status webhook-${hook.source}">${hook.source}</span></td>
                <td>${hook.shopDomain || "N/A"}</td>
                <td class="timestamp">${new Date(hook.timestamp).toLocaleString()}</td>
                <td>
                  <details>
                    <summary style="cursor: pointer; color: #F2633A;">View JSON</summary>
                    <div class="json-viewer">${JSON.stringify(hook.payload, null, 2)}</div>
                  </details>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `
      }
    </div>

    <!-- Environment Check -->
    <div class="section">
      <h2>⚙️ Environment Configuration</h2>
      <table>
        <tbody>
          <tr>
            <td><strong>SHOPIFY_SHOP_DOMAIN</strong></td>
            <td>${process.env.SHOPIFY_SHOP_DOMAIN ? "✅ Configured" : "❌ Missing"}</td>
          </tr>
          <tr>
            <td><strong>SHOPIFY_ADMIN_ACCESS_TOKEN</strong></td>
            <td>${process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? "✅ Configured" : "❌ Missing"}</td>
          </tr>
          <tr>
            <td><strong>CRM_BASE_URL</strong></td>
            <td>${process.env.CRM_BASE_URL || "❌ Missing"}</td>
          </tr>
          <tr>
            <td><strong>CRM_API_KEY</strong></td>
            <td>${process.env.CRM_API_KEY ? "✅ Configured" : "❌ Missing"}</td>
          </tr>
          <tr>
            <td><strong>SHOPIFY_WEBHOOK_SECRET</strong></td>
            <td>${process.env.SHOPIFY_WEBHOOK_SECRET ? "✅ Configured" : "⚠️ Missing (dev mode)"}</td>
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
        <pre>${error instanceof Error ? error.message : "Unknown error"}</pre>
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
          adminToken: !!adminToken,
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
        },
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
        },
      );

      const objData = await objResponse.json();

      res.json({
        success: true,
        definition: defData.data?.metaobjectDefinitionByType,
        metaobjects: objData.data?.metaobjects?.nodes || [],
        errors: {
          definition: defData.errors,
          metaobjects: objData.errors,
        },
      });
    } catch (error) {
      console.error("❌ Debug metaobject error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Admin API - Test Shopify Connection
  app.post("/api/admin/test-shopify", async (req, res) => {
    try {
      const shopifyConfig = getShopifyConfig();
      if (!shopifyConfig) {
        return res.json({
          success: false,
          message: "Shopify credentials not configured",
        });
      }

      const { shop, accessToken } = shopifyConfig;

      // Test with a simple shop query
      const query = `
        query {
          shop {
            name
            email
            myshopifyDomain
          }
        }
      `;

      const response = await fetch(
        `https://${shop}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({ query }),
        },
      );

      const data = await response.json();

      if (data.errors) {
        return res.json({
          success: false,
          message: `Shopify API error: ${data.errors[0]?.message || "Unknown error"}`,
        });
      }

      return res.json({
        success: true,
        message: `Connected to ${data.data.shop.name}`,
        shop: data.data.shop,
      });
    } catch (error: any) {
      console.error("❌ Shopify test error:", error);
      return res.json({
        success: false,
        message: error.message || "Failed to connect to Shopify",
      });
    }
  });

  // Admin API - Test CRM Connection
  app.post("/api/admin/test-crm", async (req, res) => {
    try {
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;

      if (!crmBaseUrl || !crmApiKey) {
        return res.json({
          success: false,
          message: "CRM credentials not configured",
        });
      }

      // Test with a simple API call (adjust endpoint based on Clarity CRM docs)
      const response = await fetch(`${crmBaseUrl}/api/ping`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${crmApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.json({
          success: false,
          message: `CRM API returned ${response.status}: ${response.statusText}`,
        });
      }

      const data = await response.json();

      return res.json({
        success: true,
        message: "Connected to Clarity CRM",
        data,
      });
    } catch (error: any) {
      console.error("❌ CRM test error:", error);
      return res.json({
        success: false,
        message: error.message || "Failed to connect to CRM",
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
          // Check for metaobject definition with full details
          const query = `
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
              metaobjects(type: "$app:wholesale_account", first: 5) {
                nodes {
                  id
                  handle
                  displayName
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
            },
          );

          const data = await response.json();

          if (data.data?.metaobjectDefinitionByType) {
            shopifyHealth.metaobjectDefinition = true;
            shopifyHealth.metaobjectId =
              data.data.metaobjectDefinitionByType.id;
            shopifyHealth.metaobjectName =
              data.data.metaobjectDefinitionByType.name;
            shopifyHealth.metaobjectType =
              data.data.metaobjectDefinitionByType.type;
            shopifyHealth.fieldCount =
              data.data.metaobjectDefinitionByType.fieldDefinitions?.length ||
              0;
            shopifyHealth.entryCount =
              data.data.metaobjects?.nodes?.length || 0;
            shopifyHealth.recentEntries = data.data.metaobjects?.nodes || [];
          } else {
            shopifyHealth.metaobjectDefinition = false;
          }
        } catch (error) {
          shopifyHealth.error =
            error instanceof Error ? error.message : "Unknown error";
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
        error: error instanceof Error ? error.message : "Health check failed",
      });
    }
  });

  // Admin dashboard
  app.get("/admin", (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'public', 'index.html'));
  });

  // Shopify Admin customer modal
  app.get("/shopify-admin-customer-modal", (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'public', 'index.html'));
  });

  // Catch-all route for React Router (must be LAST, after all API routes)
  // This ensures unmatched routes fall through to the client-side router
  app.get("*", (req, res, next) => {
    // Only serve React app for non-API routes
    if (!req.path.startsWith("/api")) {
      // Let Vite/serveStatic middleware handle this
      return next();
    }
    // If it's an API route that wasn't matched, 404
    res.status(404).json({ error: "API endpoint not found" });
  });

  return createServer(app);
}