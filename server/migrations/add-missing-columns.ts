
import { db } from "../db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🔧 Starting migration: Adding missing columns...");

  try {
    // Add missing columns to wholesale_registrations
    await db.execute(sql`
      ALTER TABLE wholesale_registrations 
      ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
      ADD COLUMN IF NOT EXISTS website TEXT,
      ADD COLUMN IF NOT EXISTS business_address_2 TEXT,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS certification_url TEXT,
      ADD COLUMN IF NOT EXISTS tax_id_proof_url TEXT,
      ADD COLUMN IF NOT EXISTS how_did_you_hear TEXT,
      ADD COLUMN IF NOT EXISTS received_sample_set BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);
    console.log("✅ wholesale_registrations columns added");

    // Add missing columns to calculator_quotes
    await db.execute(sql`
      ALTER TABLE calculator_quotes
      ADD COLUMN IF NOT EXISTS install_location TEXT,
      ADD COLUMN IF NOT EXISTS po_number TEXT,
      ADD COLUMN IF NOT EXISTS client_name TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1
    `);
    console.log("✅ calculator_quotes columns added");

    // Add missing columns to draft_orders (if any)
    await db.execute(sql`
      ALTER TABLE draft_orders
      ADD COLUMN IF NOT EXISTS invoice_url TEXT,
      ADD COLUMN IF NOT EXISTS wholesale_registration_id VARCHAR REFERENCES wholesale_registrations(id)
    `);
    console.log("✅ draft_orders columns added");

    console.log("🎉 Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
