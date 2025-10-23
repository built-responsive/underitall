
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to calculator_quotes table...');
    
    await sql`
      ALTER TABLE calculator_quotes 
      ADD COLUMN IF NOT EXISTS project_name text,
      ADD COLUMN IF NOT EXISTS install_location text,
      ADD COLUMN IF NOT EXISTS po_number text,
      ADD COLUMN IF NOT EXISTS client_name text,
      ADD COLUMN IF NOT EXISTS notes text
    `;
    
    console.log('✓ Successfully added all missing columns');
    process.exit(0);
  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  }
}

addMissingColumns();
