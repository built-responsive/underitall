#!/usr/bin/env node

/**
 * Database Readiness Check
 * Ensures the database has all required tables and is ready for use
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDatabase() {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`🔍 Checking ${isProduction ? 'production' : 'development'} database...\n`);
  
  const requiredTables = [
    'admin_users',
    'wholesale_registrations',
    'calculator_quotes',
    'chat_conversations',
    'chat_messages',
    'draft_orders',
    'webhook_logs',
    'users'
  ];
  
  let allTablesExist = true;
  
  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Check each table
    for (const table of requiredTables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        console.log(`  ✅ Table exists: ${table}`);
      } else {
        console.log(`  ❌ Table missing: ${table}`);
        allTablesExist = false;
      }
    }
    
    if (!allTablesExist) {
      console.log('\n⚠️  Some tables are missing. Running setup...');
      
      // Run the appropriate setup script
      if (isProduction) {
        const { runProductionSetup } = await import('./production-setup.js');
        await runProductionSetup();
      } else {
        const { runSetup } = await import('./setup-database.js');
        await runSetup();
      }
    } else {
      console.log('\n✅ All database tables are present and ready!');
    }
    
    // Check for admin users
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admin_users');
    const adminCount = parseInt(adminCheck.rows[0].count);
    
    if (adminCount === 0) {
      console.log('\n⚠️  No admin users found.');
      if (!isProduction) {
        console.log('  Run: npm run db:create-admin');
      } else {
        console.log('  Create an admin user after deployment.');
      }
    } else {
      console.log(`\n✅ Found ${adminCount} admin user(s)`);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkDatabase();