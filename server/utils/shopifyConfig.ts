
/**
 * Shopify Admin API Configuration Utility
 * Centralizes Shopify credentials and GraphQL client setup
 */

interface ShopifyConfig {
  shop: string;
  accessToken: string;
  apiVersion: string;
}

/**
 * Get Shopify configuration from environment variables
 * @returns ShopifyConfig object or null if credentials are missing
 */
export function getShopifyConfig(): ShopifyConfig | null {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2025-01";

  if (!shop || !accessToken) {
    console.error("❌ Missing Shopify credentials:", {
      shop: !!shop,
      accessToken: !!accessToken,
    });
    return null;
  }

  return {
    shop,
    accessToken,
    apiVersion,
  };
}

/**
 * Execute a Shopify Admin GraphQL query
 * @param query - GraphQL query string
 * @param variables - Optional variables for the query
 * @returns Parsed JSON response
 */
export async function executeShopifyGraphQL(
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  const config = getShopifyConfig();
  if (!config) {
    throw new Error("Shopify credentials not configured");
  }

  const { shop, accessToken, apiVersion } = config;
  const url = `https://${shop}/admin/api/${apiVersion}/graphql.json`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error("❌ GraphQL errors:", data.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data;
  } catch (error) {
    console.error("❌ Shopify GraphQL execution failed:", error);
    throw error;
  }
}

/**
 * Check if wholesale_account metaobject definition exists
 * @returns Boolean indicating if the definition exists
 */
export async function checkMetaobjectDefinition(): Promise<boolean> {
  try {
    const query = `
      query {
        metaobjectDefinitionByType(type: "$app:wholesale_account") {
          id
          name
          type
        }
      }
    `;

    const result = await executeShopifyGraphQL(query);
    return !!result.data?.metaobjectDefinitionByType;
  } catch (error) {
    console.error("❌ Error checking metaobject definition:", error);
    return false;
  }
}
