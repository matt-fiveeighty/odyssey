-- ============================================================================
-- Scraper Data Tables
--
-- These tables store data pulled by the automated state scrapers.
-- Run this after supabase-migration.sql to add the scraper-specific tables.
-- ============================================================================

-- Deadlines: application open/close, draw results, leftover dates
CREATE TABLE IF NOT EXISTS scraped_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  deadline_type TEXT NOT NULL, -- 'application_open', 'application_close', 'draw_results', 'leftover'
  date TEXT NOT NULL, -- ISO date string
  year INT NOT NULL,
  notes TEXT,
  source_url TEXT,
  source_pulled_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state_id, species_id, deadline_type, year)
);

-- Fees: license fees, application fees, point fees, tag fees
CREATE TABLE IF NOT EXISTS scraped_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL,
  fee_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  residency TEXT NOT NULL DEFAULT 'both', -- 'resident', 'nonresident', 'both'
  species_id TEXT,
  frequency TEXT NOT NULL DEFAULT 'annual', -- 'annual', 'per_species', 'one_time'
  notes TEXT,
  source_url TEXT,
  source_pulled_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state_id, fee_name, residency)
);

-- Seasons: season dates by species, weapon type, unit
CREATE TABLE IF NOT EXISTS scraped_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  unit_code TEXT,
  season_type TEXT NOT NULL, -- 'archery', 'muzzleloader', 'rifle', 'general', etc.
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  year INT NOT NULL,
  notes TEXT,
  source_url TEXT,
  source_pulled_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state_id, species_id, season_type, year)
);

-- Regulations: rule changes, announcements, emergency closures
CREATE TABLE IF NOT EXISTS scraped_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  effective_date TEXT,
  source_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'announcement', -- 'rule_change', 'announcement', 'emergency_closure', 'leftover_tags'
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state_id, title)
);

-- Leftover tags: available tags after the draw
CREATE TABLE IF NOT EXISTS scraped_leftover_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  unit_code TEXT NOT NULL,
  tags_available INT NOT NULL DEFAULT 0,
  season_type TEXT,
  source_url TEXT,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state_id, species_id, unit_code)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scraped_deadlines_state ON scraped_deadlines(state_id, year);
CREATE INDEX IF NOT EXISTS idx_scraped_fees_state ON scraped_fees(state_id);
CREATE INDEX IF NOT EXISTS idx_scraped_seasons_state ON scraped_seasons(state_id, year);
CREATE INDEX IF NOT EXISTS idx_scraped_regulations_state ON scraped_regulations(state_id);
CREATE INDEX IF NOT EXISTS idx_scraped_leftover_tags_state ON scraped_leftover_tags(state_id);
