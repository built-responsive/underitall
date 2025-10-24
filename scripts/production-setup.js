#!/usr/bin/env node

/**
 * Production Database Setup Script
 * This script ensures all tables are created in production when deploying
 * It only creates tables if they don't exist (safe for re-runs)
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureProductionSchema() {
  console.log('🚀 Ensuring production database schema...\n');
  
  const schema = `
-- Admin Users
CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Wholesale Registrations
CREATE TABLE IF NOT EXISTS "wholesale_registrations" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "firm_name" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "title" TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT NOT NULL,
  "website" TEXT,
  "business_address" TEXT NOT NULL,
  "business_address_2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "zip_code" TEXT NOT NULL,
  "instagram_handle" TEXT,
  "certification_url" TEXT,
  "business_type" TEXT NOT NULL,
  "years_in_business" INTEGER,
  "is_tax_exempt" BOOLEAN DEFAULT false,
  "tax_id" TEXT,
  "tax_id_proof_url" TEXT,
  "how_did_you_hear" TEXT,
  "received_sample_set" BOOLEAN DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "approved_by" VARCHAR REFERENCES "admin_users"("id"),
  "approved_at" TIMESTAMP,
  "rejection_reason" TEXT,
  "admin_notes" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Calculator Quotes
CREATE TABLE IF NOT EXISTS "calculator_quotes" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "width" DECIMAL(10, 2) NOT NULL,
  "length" DECIMAL(10, 2) NOT NULL,
  "shape" TEXT NOT NULL,
  "thickness" TEXT NOT NULL,
  "area" DECIMAL(10, 2) NOT NULL,
  "price_per_sq_ft" DECIMAL(10, 2) NOT NULL,
  "total_price" DECIMAL(10, 2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "project_name" TEXT,
  "install_location" TEXT,
  "po_number" TEXT,
  "client_name" TEXT,
  "notes" TEXT,
  "wholesale_registration_id" VARCHAR REFERENCES "wholesale_registrations"("id"),
  "shopify_draft_order_id" TEXT,
  "shopify_draft_order_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Chat Conversations
CREATE TABLE IF NOT EXISTS "chat_conversations" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "wholesale_registration_id" VARCHAR REFERENCES "wholesale_registrations"("id"),
  "session_id" TEXT NOT NULL,
  "title" TEXT,
  "is_active" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" VARCHAR NOT NULL REFERENCES "chat_conversations"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "product_data" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Draft Orders
CREATE TABLE IF NOT EXISTS "draft_orders" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopify_draft_order_id" TEXT NOT NULL UNIQUE,
  "shopify_draft_order_url" TEXT NOT NULL,
  "invoice_url" TEXT,
  "total_price" DECIMAL(10, 2) NOT NULL,
  "line_items" JSONB NOT NULL,
  "calculator_quote_id" VARCHAR REFERENCES "calculator_quotes"("id"),
  "wholesale_registration_id" VARCHAR REFERENCES "wholesale_registrations"("id"),
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Webhook Logs
CREATE TABLE IF NOT EXISTS "webhook_logs" (
  "id" SERIAL PRIMARY KEY,
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "payload" JSONB,
  "shop_domain" TEXT,
  "topic" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Legacy Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "webhook_logs_timestamp_idx" ON "webhook_logs" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "webhook_logs_type_idx" ON "webhook_logs" ("type");
`;

  try {
    await pool.query(schema);
    console.log('✅ Production schema verified/created successfully');
    
    // Check if admin user exists
    const adminCheck = await pool.query(
      'SELECT COUNT(*) FROM admin_users'
    );
    
    if (adminCheck.rows[0].count === '0') {
      console.log('📝 No admin users found. Please create one after deployment.');
    } else {
      console.log('✅ Admin users exist');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error ensuring production schema:', error.message);
    return false;
  }
}

async function runProductionSetup() {
  try {
    await ensureProductionSchema();
    console.log('\n✨ Production database ready!');
  } catch (error) {
    console.error('❌ Production setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
runProductionSetup();