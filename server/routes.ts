
import type { Express, Request, Response } from "express";
import { createServer } from "http";
import webhookRoutes from "./webhooks";
import { db } from "./db";
import { wholesaleRegistrations, calculatorQuotes, webhookLogs, draftOrders } from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { getShopifyConfig, executeShopifyGraphQL } from "./utils/shopifyConfig";

export function registerRoutes(app: Express) {
  // Customer Account Extension API - Fetch Wholesale Account Data
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
        return res.status(500).json({ error: "Shopify credentials not configured" });
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
            variables: { customerId }
          }),
        }
      );

      const customerData = await customerResponse.json();
      const customer = customerData?.data?.customer;
      const clarityAccountId = customer?.metafield?.value;

      if (!clarityAccountId) {
        return res.json({ 
          hasWholesaleAccount: false,
          message: "No wholesale account found"
        });
      }

      // Fetch wholesale data from our DB
      const [registration] = await db
        .select()
        .from(wholesaleRegistrations)
        .where(eq(wholesaleRegistrations.clarityAccountId, clarityAccountId));

      if (!registration) {
        return res.json({ 
          hasWholesaleAccount: false,
          message: "Wholesale account not found in database"
        });
      }

      // Return full wholesale account data
      res.json({
        hasWholesaleAccount: true,
        clarityAccountId,
        account: {
          company: registration.firmName,
          email: registration.email,
          phone: registration.phone,
          website: registration.website,
          instagram: registration.instagramHandle,
          address: registration.businessAddress,
          address2: registration.businessAddress2,
          city: registration.city,
          state: registration.state,
          zip: registration.zipCode,
          taxExempt: registration.isTaxExempt,
          taxId: registration.taxId,
          accountType: registration.businessType,
          sampleSetReceived: registration.receivedSampleSet,
          source: registration.howDidYouHear,
          status: registration.status
        }
      });
    } catch (error) {
      console.error("❌ Error fetching wholesale account:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch wholesale account" 
      });
    }
  });

  // Customer Account Extension API - Update Wholesale Account Data
  app.patch("/api/customer/wholesale-account", async (req, res) => {
    try {
      // TODO: Add session token authentication here
      const { customerId, clarityAccountId, updates } = req.body;

      if (!customerId || !clarityAccountId) {
        return res.status(400).json({ error: "Missing customerId or clarityAccountId" });
      }

      // Update in our database
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
          taxId: updates.taxId,
        })
        .where(eq(wholesaleRegistrations.clarityAccountId, clarityAccountId));

      // Optionally sync to CRM
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;

      if (crmBaseUrl && crmApiKey) {
        const crmPayload = {
          APIKey: crmApiKey,
          Resource: "Account",
          Operation: "Create Or Edit",
          Data: {
            AccountId: clarityAccountId,
            AccountName: updates.company,
            Phone: updates.phone || "",
            Website: updates.website || "",
            Address1: updates.address,
            Address2: updates.address2 || "",
            City: updates.city,
            State: updates.state,
            ZipCode: updates.zip,
          }
        };

        await fetch(`${crmBaseUrl}/api/v1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(crmPayload),
        });
      }

      res.json({ success: true, message: "Wholesale account updated" });
    } catch (error) {
      console.error("❌ Error updating wholesale account:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to update wholesale account" 
      });
    }
  });

  // CRM Account Lookup - Query by AccountNumber
  app.post("/api/crm/account", async (req, res) => {
    try {
      const { accountNumber } = req.body;

      if (!accountNumber) {
        return res.status(400).json({ error: "Missing accountNumber" });
      }

      const crmBaseUrl = process.env.CRM_BASE_URL || "http://liveapi.claritysoftcrm.com";
      const crmApiKey = process.env.CRM_API_KEY;

      if (!crmApiKey) {
        return res.status(500).json({ error: "CRM_API_KEY not configured" });
      }

      console.log(`📥 CRM Account Lookup Request: ${accountNumber}`);

      const crmPayload = {
        APIKey: crmApiKey,
        Resource: "Account",
        Operation: "Get",
        SQLFilter: `AccountNumber = '${accountNumber}'`,
        Fields: "*" // Request all fields (prevents selective field return)
      };

      const crmResponse = await fetch(`${crmBaseUrl}/api/v1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crmPayload),
      });

      if (!crmResponse.ok) {
        throw new Error(`CRM API returned ${crmResponse.status}: ${crmResponse.statusText}`);
      }

      const crmData = await crmResponse.json();

      console.log("📤 CRM Account Response:");
      console.log(JSON.stringify(crmData, null, 2));

      // Verify full payload (log field count)
      if (crmData.Data && crmData.Data.length > 0) {
        const fieldCount = Object.keys(crmData.Data[0]).length;
        console.log(`✅ Account found with ${fieldCount} fields`);
      }

      res.json(crmData);
    } catch (error) {
      console.error("❌ CRM account lookup error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "CRM lookup failed" 
      });
    }
  });

  // Shopify GraphQL endpoint for client-side queries (settings, admin, etc.)
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
        error: error instanceof Error ? error.message : "GraphQL query failed" 
      });
    }
  });

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
        registration: updated
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

  // Wholesale registration submission
  app.post("/api/wholesale-registration", async (req: Request, res: Response) => {
    try {
      const formData = req.body;
      console.log("📝 Wholesale registration received:", formData);

      // Save to database (pending approval)
      const [registration] = await db
        .insert(wholesaleRegistrations)
        .values({
          ...formData,
          status: 'pending',
          submittedAt: new Date(),
        })
        .returning();

      console.log("✅ Registration saved to database (pending):", registration.id);

      res.json({
        success: true,
        registrationId: registration.id,
        message: "Registration submitted. Awaiting admin approval."
      });
    } catch (error) {
      console.error("❌ Registration error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Registration failed",
      });
    }
  });

  // Admin Approval → Create CRM Account + Shopify Customer with wholesale_clarity_id
  app.post("/api/admin/approve-registration/:id", async (req: Request, res: Response) => {
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

      // Step 1: Create Clarity CRM Account
      const crmBaseUrl = process.env.CRM_BASE_URL;
      const crmApiKey = process.env.CRM_API_KEY;

      let clarityAccountId = null;

      if (crmBaseUrl && crmApiKey) {
        const crmPayload = {
          APIKey: crmApiKey,
          Resource: "Account",
          Operation: "Create Or Edit",
          Data: {
            AccountName: registration.firmName,
            Phone: registration.phone || "",
            Website: registration.website || "",
            Address1: registration.businessAddress,
            Address2: registration.businessAddress2 || "",
            City: registration.city,
            State: registration.state,
            ZipCode: registration.zipCode,
            CustomFields: {
              InstagramHandle: registration.instagramHandle || "",
              AccountType: registration.businessType,
              TaxExempt: registration.isTaxExempt ? "Yes" : "No",
              TaxID: registration.taxId || "",
              SampleSetReceived: registration.receivedSampleSet ? "Yes" : "No",
              Source: registration.howDidYouHear || ""
            }
          }
        };

        const crmResponse = await fetch(`${crmBaseUrl}/api/v1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(crmPayload),
        });

        const crmData = await crmResponse.json();
        clarityAccountId = crmData?.Data?.AccountId;

        if (!clarityAccountId) {
          throw new Error("CRM Account creation failed - no AccountId returned");
        }

        console.log("✅ CRM Account created:", clarityAccountId);
      } else {
        throw new Error("CRM credentials not configured");
      }

      // Step 2: Create/Update Shopify Customer + Set wholesale_clarity_id metafield
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (shopDomain && adminToken && clarityAccountId) {
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
          }
        );

        const customerCheckData = await customerCheckResponse.json();
        let customerId = customerCheckData?.data?.customers?.edges?.[0]?.node?.id;

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
            }
          );

          const customerCreateData = await customerCreateResponse.json();

          if (customerCreateData?.data?.customerCreate?.userErrors?.length > 0) {
            throw new Error(customerCreateData.data.customerCreate.userErrors[0].message);
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
            type: "single_line_text_field" 
          }
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
          }
        );

        const metafieldsResult = await metafieldsResponse.json();

        if (metafieldsResult.data?.metafieldsSet?.userErrors?.length > 0) {
          console.error("❌ Metafield write errors:", metafieldsResult.data.metafieldsSet.userErrors);
        } else {
          console.log("✅ wholesale_clarity_id metafield set:", clarityAccountId);
        }
      }

      // Update registration status to approved
      await db
        .update(wholesaleRegistrations)
        .set({ 
          status: 'approved',
          clarityAccountId: clarityAccountId 
        })
        .where(eq(wholesaleRegistrations.id, id));

      res.json({
        success: true,
        message: "Registration approved, CRM account created, customer linked",
        clarityAccountId
      });
    } catch (error) {
      console.error("❌ Approval error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Approval failed",
      });
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
        }
      );

      const shopifyData = await shopifyResponse.json();

      if (shopifyData.errors || shopifyData.data?.draftOrderCreate?.userErrors?.length > 0) {
        const userErrors = shopifyData.data?.draftOrderCreate?.userErrors || [];
        console.error("❌ Shopify draft order creation failed:");
        console.error("User Errors:", JSON.stringify(userErrors, null, 2));
        console.error("Full Response:", JSON.stringify(shopifyData, null, 2));
        return res.status(500).json({
          error: "Failed to create Shopify draft order",
          details: userErrors.length > 0 ? userErrors : shopifyData.errors,
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
            }
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
          metaobjectStatus.error = error instanceof Error ? error.message : "Unknown error";
        }
      }

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
    <div class="section" style="border: 2px solid ${metaobjectStatus.configured ? '#10b981' : '#ef4444'};">
      <h2>🔮 Metaobject Definition Status</h2>
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <span class="metaobject-badge ${metaobjectStatus.configured ? 'configured' : 'not-configured'}">
          ${metaobjectStatus.configured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}
        </span>
        ${metaobjectStatus.configured ? `
          <span style="color: #9ca3af; font-size: 0.875rem;">
            wholesale_account metaobject definition deployed
          </span>
        ` : `
          <span style="color: #ef4444; font-size: 0.875rem;">
            Run 'shopify app deploy' to sync shopify.app.toml
          </span>
        `}
      </div>
      ${metaobjectStatus.configured ? `
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
          <code style="background: #1a1a1a; padding: 0.5rem; border-radius: 6px; color: #10b981; font-size: 0.875rem; display: block; overflow-x: auto;">${metaobjectStatus.definition?.id || 'N/A'}</code>
        </div>
        <div style="margin-top: 1rem;">
          <p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 0.5rem;">Type:</p>
          <code style="background: #1a1a1a; padding: 0.5rem; border-radius: 6px; color: #10b981; font-size: 0.875rem; display: block;">${metaobjectStatus.definition?.type || 'N/A'}</code>
        </div>
        ${metaobjectStatus.entries.length > 0 ? `
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
                ${metaobjectStatus.entries.map((entry: any) => `
                  <tr style="border-bottom: 1px solid rgba(242, 99, 58, 0.1);">
                    <td style="padding: 0.5rem;">${entry.displayName}</td>
                    <td style="padding: 0.5rem;"><code style="font-size: 0.75rem; color: #10b981;">${entry.handle}</code></td>
                    <td style="padding: 0.5rem; color: #9ca3af; font-size: 0.75rem;">${entry.id}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </details>
        ` : ''}
      ` : `
        <div style="margin-top: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px;">
          <p style="color: #ef4444; font-weight: 600;">❌ Metaobject definition not found in Shopify</p>
          <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.5rem;">
            ${metaobjectStatus.error ? `Error: ${metaobjectStatus.error}` : 'Expected type: $app:wholesale_account'}
          </p>
          <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.5rem;">
            Run <code style="background: #1a1a1a; padding: 0.25rem 0.5rem; border-radius: 4px; color: #F2633A;">shopify app deploy</code> to sync your shopify.app.toml configuration.
          </p>
        </div>
      `}
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

  // Admin API - Test Shopify Connection
  app.post("/api/admin/test-shopify", async (req, res) => {
    try {
      const shopifyConfig = getShopifyConfig();
      if (!shopifyConfig) {
        return res.json({
          success: false,
          message: "Shopify credentials not configured"
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
        }
      );

      const data = await response.json();

      if (data.errors) {
        return res.json({
          success: false,
          message: `Shopify API error: ${data.errors[0]?.message || 'Unknown error'}`
        });
      }

      return res.json({
        success: true,
        message: `Connected to ${data.data.shop.name}`,
        shop: data.data.shop
      });
    } catch (error: any) {
      console.error("❌ Shopify test error:", error);
      return res.json({
        success: false,
        message: error.message || "Failed to connect to Shopify"
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
          message: "CRM credentials not configured"
        });
      }

      // Test with a simple API call (adjust endpoint based on Clarity CRM docs)
      const response = await fetch(`${crmBaseUrl}/api/ping`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${crmApiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        return res.json({
          success: false,
          message: `CRM API returned ${response.status}: ${response.statusText}`
        });
      }

      const data = await response.json();

      return res.json({
        success: true,
        message: "Connected to Clarity CRM",
        data
      });
    } catch (error: any) {
      console.error("❌ CRM test error:", error);
      return res.json({
        success: false,
        message: error.message || "Failed to connect to CRM"
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
            }
          );

          const data = await response.json();

          if (data.data?.metaobjectDefinitionByType) {
            shopifyHealth.metaobjectDefinition = true;
            shopifyHealth.metaobjectId = data.data.metaobjectDefinitionByType.id;
            shopifyHealth.metaobjectName = data.data.metaobjectDefinitionByType.name;
            shopifyHealth.metaobjectType = data.data.metaobjectDefinitionByType.type;
            shopifyHealth.fieldCount = data.data.metaobjectDefinitionByType.fieldDefinitions?.length || 0;
            shopifyHealth.entryCount = data.data.metaobjects?.nodes?.length || 0;
            shopifyHealth.recentEntries = data.data.metaobjects?.nodes || [];
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