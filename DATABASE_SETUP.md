# Database Setup Guide

## Development Database ✅ 
Your development database is now fully configured and visible in the Replit Database panel.

### Current Status
- **Database Type**: PostgreSQL (Replit-managed)
- **Tables Created**: 8 tables with full schema
- **Admin User**: Created (username: admin, password: admin123)
- **Location**: Visible in Replit's Database panel (🗄️ icon in sidebar)

## Production Database Setup 🚀

When you republish your application, Replit will:

### Automatic Process
1. **Create Production Database** - Replit automatically provisions a production PostgreSQL database
2. **Run Build Command** - Executes `npm run build && npm run db:production-setup`
3. **Create Tables** - The production-setup script creates all necessary tables
4. **Apply Schema** - Your development database schema is applied to production

### Important Notes

#### Schema Migration
- ✅ **Automatic**: Changes to your development database structure are automatically applied when republishing
- ✅ **Safe**: Tables are created with `IF NOT EXISTS` - won't duplicate or error
- ⚠️ **Data**: Only schema is migrated, not data (you'll need to create a production admin user)

#### After Republishing
1. Your production database will have all tables created
2. You'll need to create at least one admin user for production
3. Production data is separate from development data

### Manual Commands

```bash
# Development database setup
npm run db:setup           # Create all tables in development
npm run db:create-admin     # Create admin user

# Production database setup (runs automatically on republish)
npm run db:production-setup # Ensures all tables exist in production

# Check database status
node scripts/ensure-database-ready.js
```

### Database Structure

All 8 tables will be created in both development and production:
- `admin_users` - Admin authentication
- `wholesale_registrations` - Trade program applications
- `calculator_quotes` - Pricing calculations
- `chat_conversations` - Chat sessions
- `chat_messages` - Individual messages
- `draft_orders` - Shopify draft orders
- `webhook_logs` - Webhook activity tracking
- `users` - Legacy user table

### Deployment Configuration

Your deployment is configured with:
- **Target**: Autoscale (stateless deployment)
- **Build**: Compiles code AND sets up database
- **Start**: Runs production server

## Troubleshooting

### If tables are missing after republish:
1. Check the deployment logs for any errors
2. You can manually run: `npm run db:production-setup` in the Shell

### To verify database status:
```bash
node scripts/ensure-database-ready.js
```

This will check all tables and report any issues.

## Security Notes
- Development and production databases are separate
- Each environment has its own data
- Admin users must be created separately for each environment
- Database credentials are managed automatically by Replit