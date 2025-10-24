
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addMarketingFields() {
  console.log('🔧 Adding marketing consent fields to wholesale_registrations...\n');
  
  try {
    await pool.query(`
      ALTER TABLE wholesale_registrations 
      ADD COLUMN IF NOT EXISTS accepts_email_marketing BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS accepts_sms_marketing BOOLEAN DEFAULT false;
    `);
    
    console.log('✅ Marketing fields added successfully!');
    
    // Verify the columns exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wholesale_registrations' 
      AND column_name IN ('accepts_email_marketing', 'accepts_sms_marketing');
    `);
    
    console.log(`\n✓ Verified ${result.rows.length} columns:`, result.rows.map(r => r.column_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addMarketingFields();
