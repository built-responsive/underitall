
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

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS "webhook_logs_timestamp_idx" ON "webhook_logs" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "webhook_logs_type_idx" ON "webhook_logs" ("type");
