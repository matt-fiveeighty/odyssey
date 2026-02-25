-- =============================================================================
-- Data Airlock Migration
-- Phase 3: Wire scrapers through staging → evaluation → promotion pipeline
-- Run AFTER supabase-scraper-tables.sql and supabase-migration-cloud-persist.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add status + scrape_batch_id columns to all scraped tables
-- ---------------------------------------------------------------------------

ALTER TABLE scraped_deadlines
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'staging',
  ADD COLUMN IF NOT EXISTS scrape_batch_id TEXT;

ALTER TABLE scraped_fees
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'staging',
  ADD COLUMN IF NOT EXISTS scrape_batch_id TEXT;

ALTER TABLE scraped_seasons
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'staging',
  ADD COLUMN IF NOT EXISTS scrape_batch_id TEXT;

ALTER TABLE scraped_regulations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'staging',
  ADD COLUMN IF NOT EXISTS scrape_batch_id TEXT;

ALTER TABLE scraped_leftover_tags
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'staging',
  ADD COLUMN IF NOT EXISTS scrape_batch_id TEXT;

-- Backward compat: mark all existing rows as approved
UPDATE scraped_deadlines SET status = 'approved' WHERE status = 'staging';
UPDATE scraped_fees SET status = 'approved' WHERE status = 'staging';
UPDATE scraped_seasons SET status = 'approved' WHERE status = 'staging';
UPDATE scraped_regulations SET status = 'approved' WHERE status = 'staging';
UPDATE scraped_leftover_tags SET status = 'approved' WHERE status = 'staging';

-- Indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_scraped_deadlines_status ON scraped_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_scraped_fees_status ON scraped_fees(status);
CREATE INDEX IF NOT EXISTS idx_scraped_seasons_status ON scraped_seasons(status);
CREATE INDEX IF NOT EXISTS idx_scraped_regulations_status ON scraped_regulations(status);
CREATE INDEX IF NOT EXISTS idx_scraped_leftover_status ON scraped_leftover_tags(status);

CREATE INDEX IF NOT EXISTS idx_scraped_deadlines_batch ON scraped_deadlines(scrape_batch_id);
CREATE INDEX IF NOT EXISTS idx_scraped_fees_batch ON scraped_fees(scrape_batch_id);
CREATE INDEX IF NOT EXISTS idx_scraped_seasons_batch ON scraped_seasons(scrape_batch_id);
CREATE INDEX IF NOT EXISTS idx_scraped_regulations_batch ON scraped_regulations(scrape_batch_id);
CREATE INDEX IF NOT EXISTS idx_scraped_leftover_batch ON scraped_leftover_tags(scrape_batch_id);

-- ---------------------------------------------------------------------------
-- 2. Airlock Queue — tracks evaluation verdicts per scrape batch
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS airlock_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id      TEXT NOT NULL,
  scrape_batch_id TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'auto_approved' | 'quarantined' | 'approved' | 'rejected'

  verdict_json  JSONB,            -- Serialized AirlockVerdict
  diffs_json    JSONB,            -- Array of DiffEntry objects
  block_count   INT DEFAULT 0,
  warn_count    INT DEFAULT 0,
  pass_count    INT DEFAULT 0,
  summary       TEXT,

  evaluated_at  TIMESTAMPTZ,
  resolved_at   TIMESTAMPTZ,      -- When admin approved/rejected
  resolved_by   TEXT,              -- 'system' or user email
  resolution_notes TEXT,

  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airlock_queue_status ON airlock_queue(status);
CREATE INDEX IF NOT EXISTS idx_airlock_queue_state ON airlock_queue(state_id);
CREATE INDEX IF NOT EXISTS idx_airlock_queue_batch ON airlock_queue(scrape_batch_id);

-- ---------------------------------------------------------------------------
-- 3. Airlock Audit Log — permanent record of all promotions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS airlock_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id      UUID REFERENCES airlock_queue(id),
  state_id      TEXT NOT NULL,
  action        TEXT NOT NULL,     -- 'auto_promote' | 'manual_approve' | 'reject'
  diffs_promoted JSONB,            -- Which specific diffs were promoted
  promoted_at   TIMESTAMPTZ DEFAULT now(),
  promoted_by   TEXT NOT NULL      -- 'system' or admin email
);

CREATE INDEX IF NOT EXISTS idx_airlock_audit_queue ON airlock_audit_log(queue_id);
CREATE INDEX IF NOT EXISTS idx_airlock_audit_state ON airlock_audit_log(state_id);
