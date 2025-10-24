
# Database Migration Scripts

Scripts for managing database schema across different Replit instances.

## migrate-database.js

Recreates the complete database schema on a new Repl.

**Usage:**
```bash
npm run db:recreate
```

**What it does:**
1. Creates all tables from the core schema
2. Creates indexes for performance
3. Verifies all tables were created successfully

**Prerequisites:**
- PostgreSQL database provisioned in Replit
- `DATABASE_URL` environment variable set (automatic on Replit)

**Output:**
- ✅ Success messages for each table/migration
- ⚠️ Warnings for already-existing objects (safe to ignore)
- ❌ Errors if migration fails

## create-admin-user.js

Interactive script to create admin users for the dashboard.

**Usage:**
```bash
npm run db:create-admin
```

**Prompts:**
- Username
- Email
- Password (will be hashed with bcrypt)

**Example:**
```
🔐 Admin User Creation

Username: admin
Email: admin@underitall.com
Password: ********

✅ Admin user created successfully!
   ID: 123e4567-e89b-12d3-a456-426614174000
   Username: admin
   Email: admin@underitall.com
```

## Migration Process for New Repl

Follow these steps to set up the database on a new Repl:

1. **Provision Database**
   - Open Database tab in Replit
   - Click "Create a database"
   - Wait for `DATABASE_URL` to appear in Secrets

2. **Run Migration**
   ```bash
   npm run db:recreate
   ```

3. **Create Admin User**
   ```bash
   npm run db:create-admin
   ```

4. **Verify Installation**
   - Check that all 8 tables were created
   - Try logging into `/admin` with your credentials

5. **Configure Secrets**
   - Set `SHOPIFY_ADMIN_ACCESS_TOKEN`
   - Set `SHOPIFY_SHOP_DOMAIN`
   - Set `CRM_API_KEY`
   - Set `CRM_BASE_URL`

## Tables Created

- `admin_users` - Admin authentication
- `wholesale_registrations` - Business applications
- `calculator_quotes` - Saved price quotes
- `chat_conversations` - Chat sessions
- `chat_messages` - Chat history
- `draft_orders` - Shopify order tracking
- `webhook_logs` - Webhook activity
- `users` - Legacy auth (backward compatibility)

## Troubleshooting

**Error: DATABASE_URL not set**
- Solution: Provision a PostgreSQL database in Replit first

**Error: already exists**
- Solution: Safe to ignore - objects already present

**Migration fails partway**
- Solution: Check error message, fix issue, re-run script (it's idempotent)

**No admin_users table**
- Solution: Re-run `npm run db:recreate`
