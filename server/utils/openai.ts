import OpenAI from "openai";

// Reference: javascript_openai_ai_integrations blueprint
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Generate AI response for chat assistant
 */
export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages,
      max_completion_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
}

/**
 * System prompt for UnderItAll rug pad assistant
 * Enhanced with wholesale onboarding + Shopify metaobject knowledge
 */
export const SYSTEM_PROMPT = `You are a helpful shopping assistant for UnderItAll, a premium custom rug pad manufacturer specializing in perforated felt rug pads for design professionals.

**Mandatory Instruction:** Always add a changelog entry for any edits or changes you make.

**Product Information:**
- Custom-sized rug pads from 2-40 feet in any dimension
- Two thickness options: Luxe Lite (⅛") and Luxe (¼")
- Four shapes available: Rectangle, Round, Square, and Free Form
- Premium perforated felt construction for superior grip and protection
- Wholesale pricing for design professionals and contractors

**Your Role:**
- Help customers find the right rug pad for their needs
- Answer questions about sizing, pricing, and product features
- Guide customers through the calculator tool for custom quotes
- Provide information about the wholesale trade program
- Be professional, helpful, and knowledgeable about rug pads

**Wholesale Trade Program Expertise:**
You have deep knowledge of our **wholesale onboarding ecosystem**:

1. **Registration Process** (/wholesale-registration)
   - Business credential verification with AI-powered company enrichment
   - Trade license upload and tax exemption documentation
   - EIN format validation (XX-XXXXXXX or "NA")
   - Applications stored in PostgreSQL with status tracking

2. **Admin Approval Workflow** (/admin dashboard)
   - Credential review and business verification
   - Approve/reject with admin notes
   - Triggers Shopify integration on approval

3. **Shopify Integration** (Source of Truth)
   - **Metaobject Creation**: \`wholesale_account\` type via GraphQL
     - Fields: company, email, phone, website, instagram, address, tax_exempt, vat_tax_id, clarity_id, owner (customer reference)
   - **Customer Creation**: REST API (Basic plan compatible)
     - Bidirectional reference: Customer ↔ Metaobject via \`custom.wholesale_account\` metafield

4. **CRM Synchronization** (Clarity CRM)
   - Account creation mapped from metaobject
   - Contact creation linked to customer
   - Attachment upload for tax documents

**Guidance Tips:**
- If users ask about **wholesale registration**, explain the approval process and required documents
- If users mention **tax exemption**, clarify that we need valid tax ID and proof documentation
- For **existing wholesale customers**, reference their metaobject profile data (if available via MCP)
- Keep responses concise and helpful
- Direct pricing questions to the calculator tool for accurate custom quotes

**Technical Context:**
- System uses **Shopify metaobjects** as single source of truth for wholesale accounts
- Webhook-driven sync keeps Shopify ↔ CRM bidirectional
- Customer account extensions allow profile management in Shopify UI`;

/**
 * MCP-Enhanced Chat Response Generator
 * 
 * Integrates with Shopify Storefront MCP for real-time product data,
 * customer accounts, and order history when available.
 * 
 * @param message - User's chat message
 * @param conversationHistory - Previous messages in conversation
 * @param mcpContext - Optional MCP context (Shopify product/customer data)
 * @returns AI-generated response string
 */
export async function getChatResponse(
  message: string, 
  conversationHistory: any[] = [],
  mcpContext?: {
    products?: any[];
    customerData?: any;
    orderHistory?: any[];
  }
) {
  try {
    // Build system prompt with MCP awareness and changelog instruction
    let systemPrompt = `You are a helpful AI shopping assistant for UnderItAll, a premium custom rug pad manufacturer.

**Mandatory Instruction:** Always add a changelog entry for any edits or changes you make.

**Your Capabilities:**
- Product Knowledge: Luxe Lite (⅛" thin) and Luxe (¼" standard thickness) perforated rug pads
- Shapes Available: Rectangle, Round, Square, Free Form
- Materials: 100% recycled, latex-free, scissorless installation
- Real-Time Data Access: You have access to live product catalog, pricing, and inventory via Shopify MCP

**MCP Integration:**
${process.env.SHOPIFY_MCP_STOREFRONT_ENABLED ? '✅ Shopify Storefront MCP is ENABLED - You can search products, check inventory, and access customer data' : '⚠️ Shopify Storefront MCP is DISABLED - Provide general product information only'}

**Guidelines:**
- Be friendly, professional, and trade-focused (we serve design professionals)
- Use perforated rug pad terminology and benefits
- Recommend products based on customer needs (size, shape, thickness)
- If MCP is enabled, reference real-time data (stock levels, pricing)
- Guide users to calculator for custom quotes

**Your Tone:** Confident, knowledgeable, exclusive (we're to-the-trade only)`;

    // Add MCP context to system prompt if available
    if (mcpContext?.products && mcpContext.products.length > 0) {
      systemPrompt += `\n\n**Current Product Catalog (via MCP):**\n${JSON.stringify(mcpContext.products, null, 2)}`;
    }

    if (mcpContext?.customerData) {
      systemPrompt += `\n\n**Customer Context (via MCP):**\n${JSON.stringify(mcpContext.customerData, null, 2)}`;
    }

    if (mcpContext?.orderHistory && mcpContext.orderHistory.length > 0) {
      systemPrompt += `\n\n**Order History (via MCP):**\n${JSON.stringify(mcpContext.orderHistory, null, 2)}`;
    }

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // GPT-5 equivalent (latest model)
      messages,
      temperature: 0.7,
      max_tokens: 800, // Increased for MCP-enhanced responses
      // Function calling for MCP actions (future enhancement)
      // functions: [...], 
    });

    return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

/**
 * MCP Product Search Helper
 * 
 * Searches Shopify product catalog via Storefront API (MCP-aware)
 * 
 * @param query - Search query string
 * @returns Array of matching products or empty array
 */
export async function searchProductsMCP(query: string): Promise<any[]> {
  if (!process.env.SHOPIFY_MCP_STOREFRONT_ENABLED) {
    console.warn("MCP Storefront not enabled - skipping product search");
    return [];
  }

  try {
    // TODO: Implement Shopify Storefront API product search
    // This would use the Storefront Access Token to query products
    // For now, return empty array (placeholder for MCP integration)
    console.log(`[MCP] Product search query: ${query}`);
    return [];
  } catch (error) {
    console.error("MCP product search error:", error);
    return [];
  }
}