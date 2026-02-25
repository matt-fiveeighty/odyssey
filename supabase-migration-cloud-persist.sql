-- ============================================================================
-- Phase 1: Cloud Persistence — Extend assessments + Create fiduciary_alerts
-- Run this against your Supabase instance to enable full data sync.
-- ============================================================================

-- ── Extend assessments table for multi-plan management ─────────────────────
-- Adds name, label, is_active to support SavedPlan concept from Zustand store.
-- Existing rows will get default values.

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'My Strategy';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index for quick active plan lookup
CREATE INDEX IF NOT EXISTS idx_assessments_user_active ON assessments(user_id, is_active);


-- ── Create fiduciary_alerts table ──────────────────────────────────────────
-- Stores persistent fiduciary alerts from cascading prune, budget overflow,
-- draw outcomes, etc. Survives across devices and sessions.

CREATE TABLE IF NOT EXISTS fiduciary_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,          -- Client-generated unique ID (e.g. "alert-1234567890")
  severity TEXT NOT NULL,          -- 'critical' | 'warning' | 'info'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT,
  state_id TEXT,
  species_id TEXT,
  event_type TEXT NOT NULL,        -- 'draw_outcome' | 'budget_change' | 'profile_change' | etc.
  schedule_conflicts JSONB DEFAULT '[]',  -- Embedded schedule conflicts for this alert
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, alert_id)
);

-- RLS: Users can only access their own alerts
ALTER TABLE fiduciary_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own alerts"
  ON fiduciary_alerts FOR ALL
  USING (auth.uid() = user_id);

-- Index for quick user alert lookup
CREATE INDEX IF NOT EXISTS idx_fiduciary_alerts_user ON fiduciary_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fiduciary_alerts_undismissed ON fiduciary_alerts(user_id) WHERE NOT dismissed;


-- ── Ensure user_goals has all needed columns ───────────────────────────────
-- The user_goals table already exists but verify the milestones JSONB column.
-- This is a no-op if columns already exist.

ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS species_id TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS weapon_type TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS season_preference TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS hunt_style TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS trophy_description TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS dream_tier TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS target_year SMALLINT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS projected_draw_year SMALLINT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS unit_id TEXT;


-- ── Ensure savings_goals has contributions JSONB ───────────────────────────
-- The Zustand SavingsGoal type has a contributions array and goalId that
-- the DB table may not have yet.

ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS goal_id TEXT;
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS contributions JSONB DEFAULT '[]';


-- ============================================================================
-- Verification: Run these queries to confirm the migration worked
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'assessments' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'fiduciary_alerts' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_goals' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'savings_goals' ORDER BY ordinal_position;
