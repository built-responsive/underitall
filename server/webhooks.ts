
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "./db";
import { webhookLogs } from "@shared/schema";
import { desc } from "drizzle-orm";

const router = Router();

// Shopify webhook verification
function verifyShopifyWebhook(req: Request): boolean {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Always allow webhooks in development mode (Shopify CLI dev uses different secrets)
  if (isDevelopment) {
    console.warn("⚠️ Development mode - skipping HMAC verification");
    return true;
  }

  // If no webhook secret is configured in production, allow all webhooks (unsafe!)
  if (!webhookSecret) {
    console.warn("⚠️ SHOPIFY_WEBHOOK_SECRET not configured - allowing unsigned webhooks (PRODUCTION UNSAFE!)");
    return true;
  }

  // If no HMAC header but secret is configured, reject
  if (!hmacHeader) {
    console.warn("⚠️ Missing X-Shopify-Hmac-Sha256 header");
    return false;
  }

  // Use raw body (captured during JSON parsing) for signature verification
  const body = (req as any).rawBody;
  if (!body) {
    console.warn("⚠️ Raw body not available for HMAC verification");
    return false;
  }

  const hash = crypto
    .createHmac("sha256", webhookSecret)
    .update(body, "utf8")
    .digest("base64");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(hmacHeader),
    Buffer.from(hash)
  );

  if (!isValid) {
    console.warn("⚠️ HMAC verification failed");
    console.warn("Expected:", hash);
    console.warn("Received:", hmacHeader);
  }

  return isValid;
}

// Customer creation webhook
router.post("/customers/create", async (req: Request, res: Response) => {
  try {
    // Verify webhook authenticity
    if (!verifyShopifyWebhook(req)) {
      console.warn("⚠️ Invalid webhook signature");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const customer = req.body;
    const topic = req.get("X-Shopify-Topic") || "customers/create";

    console.log(`📥 Customer created webhook: ${customer.email}`);

    // Log to database
    await db.insert(webhookLogs).values({
      timestamp: new Date(),
      type: "customers/create",
      source: "shopify",
      payload: customer,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error processing customer/create webhook:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Customer update webhook - Sync to Clarity CRM
router.post("/customers/update", async (req: Request, res: Response) => {
  try {
    if (!verifyShopifyWebhook(req)) {
      console.warn("⚠️ Invalid webhook signature");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const customer = req.body;
    const topic = req.get("X-Shopify-Topic") || "customers/update";

    console.log(`📥 Customer updated webhook: ${customer.email}`);

    // Log to database
    await db.insert(webhookLogs).values({
      timestamp: new Date(),
      type: "customers/update",
      source: "shopify",
      payload: customer,
    });

    // Sync to Clarity CRM
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    const crmBaseUrl = process.env.CRM_BASE_URL;
    const crmApiKey = process.env.CRM_API_KEY;

    if (shopDomain && adminToken && crmBaseUrl && crmApiKey) {
      try {
        // Fetch customer's wholesale_account metafield
        const customerId = customer.admin_graphql_api_id;
        
        const metafieldQuery = `
          query getCustomerMetafield($customerId: ID!) {
            customer(id: $customerId) {
              metafield(namespace: "custom", key: "wholesale_account") {
                value
              }
            }
          }
        `;

        const metafieldResponse = await fetch(
          `https://${shopDomain}/admin/api/2025-01/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": adminToken,
            },
            body: JSON.stringify({
              query: metafieldQuery,
              variables: { customerId }
            }),
          }
        );

        const metafieldData = await metafieldResponse.json();
        const metaobjectId = metafieldData?.data?.customer?.metafield?.value;

        if (metaobjectId) {
          // Fetch metaobject to get clarity_id
          const metaobjectQuery = `
            query getMetaobject($id: ID!) {
              metaobject(id: $id) {
                fields {
                  key
                  value
                }
              }
            }
          `;

          const metaobjectResponse = await fetch(
            `https://${shopDomain}/admin/api/2025-01/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": adminToken,
              },
              body: JSON.stringify({
                query: metaobjectQuery,
                variables: { id: metaobjectId }
              }),
            }
          );

          const metaobjectData = await metaobjectResponse.json();
          const fields = metaobjectData?.data?.metaobject?.fields || [];
          const clarityIdField = fields.find((f: any) => f.key === 'clarity_id');
          const clarityAccountId = clarityIdField?.value;

          if (clarityAccountId) {
            // Update CRM Contact
            const contactPayload = {
              APIKey: crmApiKey,
              Resource: "Contact",
              Operation: "Create Or Edit",
              Data: {
                AccountId: clarityAccountId,
                FirstName: customer.first_name || "",
                LastName: customer.last_name || "",
                Email: customer.email,
                Phone: customer.phone || "",
                Address1: customer.default_address?.address1 || "",
                Address2: customer.default_address?.address2 || "",
                City: customer.default_address?.city || "",
                State: customer.default_address?.province_code || "",
                ZipCode: customer.default_address?.zip || "",
              }
            };

            const crmResponse = await fetch(`${crmBaseUrl}/api/v1`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(contactPayload),
            });

            const crmData = await crmResponse.json();
            console.log("✅ CRM contact updated:", crmData);
          }
        }
      } catch (error) {
        console.error("❌ Error syncing customer to CRM:", error);
        // Don't fail the webhook - log and continue
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error processing customer/update webhook:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});



// Generic webhook handler for any Shopify webhook
router.post("/shopify", async (req: Request, res: Response) => {
  try {
    if (!verifyShopifyWebhook(req)) {
      console.warn("⚠️ Invalid webhook signature");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const topic = req.get("X-Shopify-Topic") || "unknown";
    const shopDomain = req.get("X-Shopify-Shop-Domain");

    console.log(`📥 Generic webhook received: ${topic} from ${shopDomain}`);

    // Log to database
    await db.insert(webhookLogs).values({
      timestamp: new Date(),
      type: topic,
      source: "shopify",
      payload: req.body,
      shopDomain: shopDomain,
      topic: topic,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error processing generic webhook:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Get webhook logs (admin endpoint)
router.get("/logs", async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;

    // Query database for webhook logs (most recent first)
    const logs = await db
      .select()
      .from(webhookLogs)
      .orderBy(desc(webhookLogs.timestamp))
      .limit(Number(limit));

    // Force no-cache for fresh webhook data
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.json({
      total: logs.length,
      logs: logs,
    });
  } catch (error) {
    console.error("❌ Error reading webhook logs:", error);
    res.status(500).json({ error: "Failed to read logs" });
  }
});

// CRM Account Create Webhook
router.post("/clarity/account_create", async (req: Request, res: Response) => {
  try {
    console.log("🏢 Clarity CRM account create webhook received");

    // Log to database
    await db.insert(webhookLogs).values({
      timestamp: new Date(),
      type: "clarity/account_create",
      source: "crm",
      payload: req.body,
    });

    console.log("✅ Webhook logged to database");

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ CRM account create webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// CRM Contact Create Webhook
router.post("/clarity/contact_create", async (req: Request, res: Response) => {
  try {
    console.log("👤 Clarity CRM contact create webhook received");

    // Log to database
    await db.insert(webhookLogs).values({
      timestamp: new Date(),
      type: "clarity/contact_create",
      source: "crm",
      payload: req.body,
    });

    console.log("✅ Webhook logged to database");

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ CRM contact create webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
