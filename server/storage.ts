// Reference: javascript_database blueprint
import {
  adminUsers,
  wholesaleRegistrations,
  calculatorQuotes,
  chatConversations,
  chatMessages,
  draftOrders,
  type AdminUser,
  type InsertAdminUser,
  type WholesaleRegistration,
  type InsertWholesaleRegistration,
  type CalculatorQuote,
  type InsertCalculatorQuote,
  type ChatConversation,
  type InsertChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type DraftOrder,
  type InsertDraftOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Admin Users
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;

  // Wholesale Registrations
  getWholesaleRegistration(id: string): Promise<WholesaleRegistration | undefined>;
  getWholesaleRegistrationByEmail(email: string): Promise<WholesaleRegistration | undefined>;
  createWholesaleRegistration(registration: InsertWholesaleRegistration): Promise<WholesaleRegistration>;
  updateWholesaleRegistration(id: string, updates: Partial<WholesaleRegistration>): Promise<WholesaleRegistration | undefined>;
  getAllWholesaleRegistrations(): Promise<WholesaleRegistration[]>;
  getWholesaleRegistrationsByStatus(status: string): Promise<WholesaleRegistration[]>;

  // Calculator Quotes
  createCalculatorQuote(quote: InsertCalculatorQuote): Promise<CalculatorQuote>;
  getCalculatorQuote(id: string): Promise<CalculatorQuote | undefined>;
  getCalculatorQuotesByWholesaleId(wholesaleId: string): Promise<CalculatorQuote[]>;
  getAllCalculatorQuotes(): Promise<CalculatorQuote[]>;
  updateCalculatorQuote(id: string, updates: Partial<CalculatorQuote>): Promise<CalculatorQuote | undefined>;

  // Chat Conversations
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  getChatConversation(id: string): Promise<ChatConversation | undefined>;
  getChatConversationsBySession(sessionId: string): Promise<ChatConversation[]>;
  getChatConversationsByWholesaleId(wholesaleId: string): Promise<ChatConversation[]>;
  updateChatConversation(id: string, updates: Partial<ChatConversation>): Promise<ChatConversation | undefined>;

  // Chat Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByConversation(conversationId: string): Promise<ChatMessage[]>;

  // Draft Orders
  createDraftOrder(order: InsertDraftOrder): Promise<DraftOrder>;
  getDraftOrder(id: string): Promise<DraftOrder | undefined>;
  getDraftOrderByShopifyId(shopifyId: string): Promise<DraftOrder | undefined>;
  getAllDraftOrders(): Promise<DraftOrder[]>;
  getDraftOrdersByWholesaleId(wholesaleId: string): Promise<DraftOrder[]>;
}

export class DatabaseStorage implements IStorage {
  // Admin Users
  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return user || undefined;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return user || undefined;
  }

  async createAdminUser(insertUser: InsertAdminUser): Promise<AdminUser> {
    const [user] = await db.insert(adminUsers).values(insertUser).returning();
    return user;
  }

  // Wholesale Registrations
  async getWholesaleRegistration(id: string): Promise<WholesaleRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(wholesaleRegistrations)
      .where(eq(wholesaleRegistrations.id, id));
    return registration || undefined;
  }

  async getWholesaleRegistrationByEmail(email: string): Promise<WholesaleRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(wholesaleRegistrations)
      .where(eq(wholesaleRegistrations.email, email));
    return registration || undefined;
  }

  async createWholesaleRegistration(
    registration: InsertWholesaleRegistration
  ): Promise<WholesaleRegistration> {
    const [created] = await db
      .insert(wholesaleRegistrations)
      .values(registration)
      .returning();
    return created;
  }

  async updateWholesaleRegistration(
    id: string,
    updates: Partial<WholesaleRegistration>
  ): Promise<WholesaleRegistration | undefined> {
    const [updated] = await db
      .update(wholesaleRegistrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(wholesaleRegistrations.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllWholesaleRegistrations(): Promise<WholesaleRegistration[]> {
    return await db
      .select()
      .from(wholesaleRegistrations)
      .orderBy(desc(wholesaleRegistrations.createdAt));
  }

  async getWholesaleRegistrationsByStatus(status: string): Promise<WholesaleRegistration[]> {
    return await db
      .select()
      .from(wholesaleRegistrations)
      .where(eq(wholesaleRegistrations.status, status))
      .orderBy(desc(wholesaleRegistrations.createdAt));
  }

  // Calculator Quotes
  async createCalculatorQuote(quote: InsertCalculatorQuote): Promise<CalculatorQuote> {
    const [created] = await db.insert(calculatorQuotes).values(quote).returning();
    return created;
  }

  async getCalculatorQuote(id: string): Promise<CalculatorQuote | undefined> {
    const [quote] = await db
      .select()
      .from(calculatorQuotes)
      .where(eq(calculatorQuotes.id, id));
    return quote || undefined;
  }

  async getCalculatorQuotesByWholesaleId(wholesaleId: string): Promise<CalculatorQuote[]> {
    return await db
      .select()
      .from(calculatorQuotes)
      .where(eq(calculatorQuotes.wholesaleRegistrationId, wholesaleId))
      .orderBy(desc(calculatorQuotes.createdAt));
  }

  async getAllCalculatorQuotes(): Promise<CalculatorQuote[]> {
    return await db
      .select()
      .from(calculatorQuotes)
      .orderBy(desc(calculatorQuotes.createdAt));
  }

  async updateCalculatorQuote(
    id: string,
    updates: Partial<CalculatorQuote>
  ): Promise<CalculatorQuote | undefined> {
    const [updated] = await db
      .update(calculatorQuotes)
      .set(updates)
      .where(eq(calculatorQuotes.id, id))
      .returning();
    return updated || undefined;
  }

  // Chat Conversations
  async createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const [created] = await db
      .insert(chatConversations)
      .values(conversation)
      .returning();
    return created;
  }

  async getChatConversation(id: string): Promise<ChatConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, id));
    return conversation || undefined;
  }

  async getChatConversationsBySession(sessionId: string): Promise<ChatConversation[]> {
    return await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId))
      .orderBy(desc(chatConversations.updatedAt));
  }

  async getChatConversationsByWholesaleId(wholesaleId: string): Promise<ChatConversation[]> {
    return await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.wholesaleRegistrationId, wholesaleId))
      .orderBy(desc(chatConversations.updatedAt));
  }

  async updateChatConversation(
    id: string,
    updates: Partial<ChatConversation>
  ): Promise<ChatConversation | undefined> {
    const [updated] = await db
      .update(chatConversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatConversations.id, id))
      .returning();
    return updated || undefined;
  }

  // Chat Messages
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    return created;
  }

  async getChatMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  // Draft Orders
  async createDraftOrder(order: InsertDraftOrder): Promise<DraftOrder> {
    const [created] = await db.insert(draftOrders).values(order).returning();
    return created;
  }

  async getDraftOrder(id: string): Promise<DraftOrder | undefined> {
    const [order] = await db.select().from(draftOrders).where(eq(draftOrders.id, id));
    return order || undefined;
  }

  async getDraftOrderByShopifyId(shopifyId: string): Promise<DraftOrder | undefined> {
    const [order] = await db
      .select()
      .from(draftOrders)
      .where(eq(draftOrders.shopifyDraftOrderId, shopifyId));
    return order || undefined;
  }

  async getAllDraftOrders(): Promise<DraftOrder[]> {
    return await db
      .select()
      .from(draftOrders)
      .orderBy(desc(draftOrders.createdAt));
  }

  async getDraftOrdersByWholesaleId(wholesaleId: string): Promise<DraftOrder[]> {
    return await db
      .select()
      .from(draftOrders)
      .where(eq(draftOrders.wholesaleRegistrationId, wholesaleId))
      .orderBy(desc(draftOrders.createdAt));
  }
}

export const storage = new DatabaseStorage();
