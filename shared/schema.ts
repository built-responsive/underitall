import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin Users (for admin dashboard authentication)
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Wholesale Registrations
export const wholesaleRegistrations = pgTable("wholesale_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Business Information
  firmName: text("firm_name").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title"),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  website: text("website"),
  businessAddress: text("business_address").notNull(),
  businessAddress2: text("business_address2"), // Secondary address line
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),

  // Credentials
  instagramHandle: text("instagram_handle"),
  certificationUrl: text("certification_url"), // URL to uploaded credential file
  businessType: text("business_type").notNull(), // "interior_designer", "architect", "contractor", etc.
  yearsInBusiness: integer("years_in_business"),

  // Tax Exemption
  isTaxExempt: boolean("is_tax_exempt").default(false),
  taxId: text("tax_id"), // EIN or VAT ID
  taxIdProofUrl: text("tax_id_proof_url"), // URL to uploaded tax ID document

  // Marketing & Samples
  howDidYouHear: text("how_did_you_hear"),
  receivedSampleSet: boolean("received_sample_set").default(false),
  marketingOptIn: boolean("marketing_opt_in").default(false),
  termsAccepted: boolean("terms_accepted").default(false),
  smsConsent: boolean("sms_consent").default(false),
  acceptsEmailMarketing: boolean("accepts_email_marketing").default(false),
  acceptsSmsMarketing: boolean("accepts_sms_marketing").default(false),

  // CRM Integration
  clarityAccountId: text("clarity_account_id"), // CRM Account ID (e.g., "AC000930")
  shopifyCustomerId: text("shopify_customer_id"), // Shopify Customer ID (numeric, stored as text)
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => adminUsers.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wholesaleRegistrationsRelations = relations(wholesaleRegistrations, ({ one }) => ({
  approver: one(adminUsers, {
    fields: [wholesaleRegistrations.approvedBy],
    references: [adminUsers.id],
  }),
}));

export const insertWholesaleRegistrationSchema = createInsertSchema(wholesaleRegistrations, {
  email: z.string().email(),
  phone: z.string().min(10),
  website: z.string().url().optional().or(z.literal("")),
  instagramHandle: z.string().optional().or(z.literal("")),
  businessAddress2: z.string().optional().or(z.literal("")),
  yearsInBusiness: z.number().min(0),
  taxId: z.string().optional().or(z.literal("")),
  taxIdProofUrl: z.string().optional().or(z.literal("")),
  howDidYouHear: z.string().optional().or(z.literal("")),
  adminNotes: z.string().optional().or(z.literal("")),
  rejectionReason: z.string().optional().or(z.literal("")),
});

export type InsertWholesaleRegistration = z.infer<typeof insertWholesaleRegistrationSchema>;
export type WholesaleRegistration = typeof wholesaleRegistrations.$inferSelect;

// Calculator Quotes (for saved quotes and analytics)
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: text("type").notNull(), // e.g., "customers/update", "metaobjects/create"
  source: text("source").notNull(), // e.g., "shopify", "clarity"
  payload: jsonb("payload"), // Full webhook payload
  shopDomain: text("shop_domain"),
  topic: text("topic"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const calculatorQuotes = pgTable("calculator_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Dimensions
  width: decimal("width", { precision: 10, scale: 2 }).notNull(),
  length: decimal("length", { precision: 10, scale: 2 }).notNull(),
  shape: text("shape").notNull(), // "rectangle", "round", "square", "freeform"
  thickness: text("thickness").notNull(), // "thin" (⅛"), "thick" (¼")

  // Pricing Details
  area: decimal("area", { precision: 10, scale: 2 }).notNull(),
  pricePerSqFt: decimal("price_per_sq_ft", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),

  // Project Details (optional)
  projectName: text("project_name"),
  installLocation: text("install_location"),
  poNumber: text("po_number"),
  clientName: text("client_name"),
  notes: text("notes"),

  // User Association (if logged in wholesale customer)
  wholesaleRegistrationId: varchar("wholesale_registration_id").references(() => wholesaleRegistrations.id),

  // Shopify Draft Order (if created)
  shopifyDraftOrderId: text("shopify_draft_order_id"),
  shopifyDraftOrderUrl: text("shopify_draft_order_url"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calculatorQuotesRelations = relations(calculatorQuotes, ({ one }) => ({
  wholesaleRegistration: one(wholesaleRegistrations, {
    fields: [calculatorQuotes.wholesaleRegistrationId],
    references: [wholesaleRegistrations.id],
  }),
}));

export const insertCalculatorQuoteSchema = createInsertSchema(calculatorQuotes).omit({
  id: true,
  createdAt: true,
});

export type InsertCalculatorQuote = z.infer<typeof insertCalculatorQuoteSchema>;
export type CalculatorQuote = typeof calculatorQuotes.$inferSelect;

// Chat Conversations
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // User identification (can be anonymous or logged-in wholesale customer)
  wholesaleRegistrationId: varchar("wholesale_registration_id").references(() => wholesaleRegistrations.id),
  sessionId: text("session_id").notNull(), // For anonymous users, track by session

  // Conversation metadata
  title: text("title"), // Auto-generated from first message
  isActive: boolean("is_active").default(true).notNull(),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  wholesaleRegistration: one(wholesaleRegistrations, {
    fields: [chatConversations.wholesaleRegistrationId],
    references: [wholesaleRegistrations.id],
  }),
  messages: many(chatMessages),
}));

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),

  // Message content
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),

  // Product recommendations (if AI suggests products)
  productData: jsonb("product_data"), // Shopify product data

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Draft Orders Tracking (for analytics and history)
export const draftOrders = pgTable("draft_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Shopify data
  shopifyDraftOrderId: text("shopify_draft_order_id").notNull().unique(),
  shopifyDraftOrderUrl: text("shopify_draft_order_url").notNull(),
  invoiceUrl: text("invoice_url"),

  // Order details
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  lineItems: jsonb("line_items").notNull(), // Store complete line item data

  // Associations
  calculatorQuoteId: varchar("calculator_quote_id").references(() => calculatorQuotes.id),
  wholesaleRegistrationId: varchar("wholesale_registration_id").references(() => wholesaleRegistrations.id),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const draftOrdersRelations = relations(draftOrders, ({ one }) => ({
  calculatorQuote: one(calculatorQuotes, {
    fields: [draftOrders.calculatorQuoteId],
    references: [calculatorQuotes.id],
  }),
  wholesaleRegistration: one(wholesaleRegistrations, {
    fields: [draftOrders.wholesaleRegistrationId],
    references: [wholesaleRegistrations.id],
  }),
}));

export const insertDraftOrderSchema = createInsertSchema(draftOrders).omit({
  id: true,
  createdAt: true,
});

export type InsertDraftOrder = z.infer<typeof insertDraftOrderSchema>;
export type DraftOrder = typeof draftOrders.$inferSelect;

// Backward compatibility for existing users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;