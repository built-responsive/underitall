
/**
 * Admin User Creation Script
 * 
 * Creates an admin user in the database for accessing the admin dashboard.
 * 
 * Usage:
 *   node scripts/create-admin-user.js
 */

import { Pool } from '@neondatabase/serverless';
import readline from 'readline';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdminUser() {
  console.log('🔐 Admin User Creation\n');
  
  try {
    const username = await question('Username: ');
    const email = await question('Email: ');
    const password = await question('Password: ');
    
    if (!username || !email || !password) {
      console.error('\n❌ All fields are required');
      process.exit(1);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await pool.query(
      `INSERT INTO admin_users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, hashedPassword]
    );
    
    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Username: ${result.rows[0].username}`);
    console.log(`   Email: ${result.rows[0].email}\n`);
    
  } catch (error) {
    if (error.code === '23505') {
      console.error('\n❌ Error: Username or email already exists');
    } else {
      console.error('\n❌ Error creating admin user:', error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

createAdminUser();
