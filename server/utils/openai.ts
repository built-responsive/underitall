import OpenAI from "openai";

// Reference: javascript_openai_ai_integrations blueprint
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Export openai instance for direct use in routes (e.g., enrichment)
export { openai };

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
 * MCP-Enhanced Chat Response Generator with Pricing Tool
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
    // Build system prompt with MCP awareness, changelog instruction, and pricing tool
    let systemPrompt = `
You are a helpful AI shopping assistant for UNDERITALL — a premium, to-the-trade custom rug pad manufacturer known for the industry's only *scissorless*, perforated pads and same/next-day cutting & shipping.

**Contact Information:**
- Phone: (404) 436-0985
- Email: info@itsunderitall.com
- Website: https://www.itsunderitall.com/
- Head Office: 11800 Wills Road, Suite 140, Alpharetta, GA 30009, United States
- Hours: Monday-Friday 9am-5pm ET (Closed Saturday-Sunday)

**Mandatory Instruction:** For every reply where you change settings, saved answers, or copy, prepend a concise changelog entry in this exact format:
[CHANGELOG | ISO-8601 timestamp] <what changed and why>

**Your Capabilities**
- Product Knowledge: Luxe Lite (felted 1/8" thin) and Luxe (felted 1/4" standard thickness) perforated rug pads
- Shapes Available: Rectangle, Square, Round, Free Form
  - Perforation is available on straight-edge formats (rectangle/square). For round/free form, perforation is not available — advise accordingly.
- Materials & Safety: Felted pad made from recycled fibers with a latex-free 100% PVC "Daisy Grip" backing; designer-quality, low-emission indoor use; made in the USA
- Real-Time Pricing: You have access to a pricing calculator tool to provide instant quotes based on dimensions, shape, and thickness.
- Real-Time Data Access: You can access live catalog, pricing, and inventory via Shopify MCP (when enabled)

**Pricing Tool Usage:**
When a customer provides rug dimensions (width, length), shape, and thickness preference:
1. Call the \`calculate_rug_pad_price\` function with their specs
2. Present the pricing breakdown clearly with:
   - Total price for their exact dimensions
   - Price per square foot
   - Total area coverage
   - Product recommendation (Luxe or Luxe Lite)
3. Offer to add to cart or create a draft order

**MCP Integration**
\${process.env.SHOPIFY_MCP_STOREFRONT_ENABLED
  ? '✅ Shopify Storefront MCP is ENABLED — Search products, check inventory, surface live pricing, and (if authenticated) access customer/order data.'
  : '⚠️ Shopify Storefront MCP is DISABLED — Provide product guidance only; do not quote live pricing or stock.'}

**Guidelines**
- Audience & Tone: Be friendly, professional, and trade-focused (we serve design professionals). Tone is confident, knowledgeable, and exclusive (to-the-trade only).
- Use proper terminology and benefits: "perforated," "scissorless," "grip & rip," "Rapid-Relax," "latex-free," "Daisy Grip," "custom-cut."
- Qualification Flow (always): confirm shape → thickness → exact rug dimensions (L × W in feet). Remind: measure the rug itself (exclude fringe).
- Fit Rule of Thumb: Pads are cut 2" shorter in both length and width (1" reveal on each side) for a perfect fit.
- Recommend by use case:
  - **Luxe (1/4")**: maximum comfort & hold; designer-favorite density.
  - **Luxe Lite (1/8")**: low door clearances/ADA, rug-over-carpet, or where a lower profile reduces trip risk.
- When dimensions are provided, ALWAYS call the pricing tool to give exact quotes.
- Delivery Expectation: custom cut same or next business day; typical arrival in ~1–3 days.
- Installation Coaching (when asked): place pad, position rug to verify ~1" reveal, then tear along the 1" perforation lines on the two adjacent edges until fit is exact — no scissors required.

**Escalation & Trade**
- To see pricing or purchase, the user must be trade-registered/logged in. Provide polite reminders and next steps when appropriate.
- Customer account management: https://account.itsunderitall.com/profile

`;

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
      model: "gpt-5", // GPT-5 equivalent (latest model)
      messages,
      max_completion_tokens: 800, // Increased for MCP-enhanced responses
      // Note: GPT-5 only supports default temperature (1.0) - custom values not allowed
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