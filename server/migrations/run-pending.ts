
import { db } from "../db";
import { sql } from "drizzle-orm";

async function runPendingMigrations() {
  console.log("🔧 Running pending migrations...");

  try {
    // Add shopify_customer_id to wholesale_registrations
    await db.execute(sql`
      ALTER TABLE wholesale_registrations 
      ADD COLUMN IF NOT EXISTS shopify_customer_id TEXT;
    `);
    console.log("✅ Added shopify_customer_id to wholesale_registrations");

    // Add index for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_wholesale_registrations_shopify_customer_id 
      ON wholesale_registrations(shopify_customer_id);
    `);
    console.log("✅ Index created on shopify_customer_id");

    console.log("🎉 Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runPendingMigrations();
