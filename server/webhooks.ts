
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

  // If no webhook secret is configured, allow all webhooks (dev mode)
  if (!webhookSecret) {
    console.warn("⚠️ SHOPIFY_WEBHOOK_SECRET not configured - allowing unsigned webhooks (development mode)");
    return true;
  }

  // If no HMAC header but secret is configured, reject
  if (!hmacHeader) {
    console.warn("⚠️ Missing X-Shopify-Hmac-Sha256 header");
    return false;
  }

  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac("sha256", webhookSecret)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(hmacHeader),
    Buffer.from(hash)
  );
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

// Metaobject update webhook - Sync to Clarity CRM
router.post("/metaobjects/update", async (req: Request, res: Response) => {
  try {
    if (!verifyShopifyWebhook(req)) {
      console.warn("⚠️ Invalid webhook signature");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const metaobject = req.body;
    const topic = req.get("X-Shopify-Topic") || "metaobjects/update";

    console.log(`📥 Metaobject updated webhook: ${metaobject.id}`);

    // Log to database
    await db.insert(webhookLogs).values({
      timestamp: new Date(),
      type: "metaobjects/update",
      source: "shopify",
      payload: metaobject,
    });

    // Only sync wholesale_account metaobjects
    if (metaobject.type === 'wholesale_account') {
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (crmBaseUrl && crmApiKey && shopDomain && adminToken) {
        try {
          const fields = metaobject.fields || {};
          const clarityId = fields.clarity_id;

          const accountData = {
            Name: fields.company || "",
            CompanyPhone: fields.phone || "",
            Email: fields.email || "",
            Address1: fields.address || "",
            Address2: fields.address2 || "",
            City: fields.city || "",
            State: fields.state || "",
            ZipCode: fields.zip || "",
            Website: fields.website || "",
            Instagram: fields.instagram ? `https://www.instagram.com/${fields.instagram}` : "",
            "Account Type": fields.account_type || "",
            "Sample Set": fields.sample_set === 'true' ? "Yes" : "No",
            Registration: fields.tax_exempt === 'true' ? "Registered with documentation" : "No documentation",
            Note: `Shopify Metaobject ID: ${metaobject.id}`,
            Description: fields.message || "",
          };

          const accountPayload = {
            APIKey: crmApiKey,
            Resource: "Account",
            Operation: "Create Or Edit",
            Data: accountData
          };

          const crmResponse = await fetch(`${crmBaseUrl}/api/v1`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(accountPayload),
          });

          const crmData = await crmResponse.json();
          
          if (crmData.Status === "Success") {
            const newClarityId = crmData.Data?.AccountId;
            console.log("✅ CRM account synced:", newClarityId);

            // Update metaobject with clarity_id if it's new
            if (newClarityId && !clarityId) {
              const updateMutation = `
                mutation UpdateMetaobject($id: ID!, $fields: [MetaobjectFieldInput!]!) {
                  metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
                    metaobject { id }
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
                    query: updateMutation,
                    variables: {
                      id: metaobject.id,
                      fields: [{ key: "clarity_id", value: newClarityId }]
                    },
                  }),
                }
              );

              console.log("✅ Metaobject updated with clarity_id");
            }
          }
        } catch (error) {
          console.error("❌ Error syncing metaobject to CRM:", error);
          // Don't fail the webhook - log and continue
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error processing metaobject/update webhook:", error);
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
