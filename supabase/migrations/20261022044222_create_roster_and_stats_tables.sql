/*
# Create roster, player_stats, team_tiers, coaches tables

1. New Tables
- `roster_entries`: persists the user's fanta-rosa across reloads (single-tenant, no auth).
  - `id` (uuid PK), `nome` (text), `squadra` (text), `ruolo` (text: P/D/C/A), `qt` (int), `eta` (int), `bonus` (float), `percentuale_titolarita` (float), `created_at` (timestamptz).
- `player_stats`: per-player seasonal xG/xA/goals/assists fetched from external sources.
  - `id` (uuid PK), `nome` (text), `squadra` (text), `gol` (int), `assist` (int), `xg` (float), `xa` (float), `updated_at` (timestamptz).
- `team_tiers`: tier-list of Serie A teams for opponent strength modifiers.
  - `id` (uuid PK), `squadra` (text unique), `tier` (text: S/A/B/C/D), `updated_at` (timestamptz).
- `coaches`: coach info per team with style modifiers.
  - `id` (uuid PK), `squadra` (text unique), `allenatore` (text), `stile` (text: offensivo/difensivo), `updated_at` (timestamptz).
- `data_sync_log`: tracks when external data was last fetched.
  - `id` (uuid PK), `source` (text), `status` (text), `fetched_at` (timestamptz).

2. Security
- Enable RLS on all tables.
- Single-tenant no-auth app: allow anon+authenticated full CRUD on all tables (data is intentionally shared).
*/

CREATE TABLE IF NOT EXISTS roster_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  squadra text NOT NULL,
  ruolo text NOT NULL,
  qt int NOT NULL DEFAULT 0,
  eta int NOT NULL DEFAULT 0,
  bonus float NOT NULL DEFAULT 0,
  percentuale_titolarita float NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roster_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_roster" ON roster_entries;
CREATE POLICY "anon_select_roster" ON roster_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_roster" ON roster_entries;
CREATE POLICY "anon_insert_roster" ON roster_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_roster" ON roster_entries;
CREATE POLICY "anon_update_roster" ON roster_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_roster" ON roster_entries;
CREATE POLICY "anon_delete_roster" ON roster_entries FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  squadra text NOT NULL,
  gol int NOT NULL DEFAULT 0,
  assist int NOT NULL DEFAULT 0,
  xg float NOT NULL DEFAULT 0,
  xa float NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (nome, squadra)
);

ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_player_stats" ON player_stats;
CREATE POLICY "anon_select_player_stats" ON player_stats FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_player_stats" ON player_stats;
CREATE POLICY "anon_insert_player_stats" ON player_stats FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_player_stats" ON player_stats;
CREATE POLICY "anon_update_player_stats" ON player_stats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_player_stats" ON player_stats;
CREATE POLICY "anon_delete_player_stats" ON player_stats FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS team_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squadra text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'C',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_team_tiers" ON team_tiers;
CREATE POLICY "anon_select_team_tiers" ON team_tiers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_team_tiers" ON team_tiers;
CREATE POLICY "anon_insert_team_tiers" ON team_tiers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_team_tiers" ON team_tiers;
CREATE POLICY "anon_update_team_tiers" ON team_tiers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_team_tiers" ON team_tiers;
CREATE POLICY "anon_delete_team_tiers" ON team_tiers FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squadra text UNIQUE NOT NULL,
  allenatore text NOT NULL DEFAULT '',
  stile text NOT NULL DEFAULT 'bilanciato',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_coaches" ON coaches;
CREATE POLICY "anon_select_coaches" ON coaches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_coaches" ON coaches;
CREATE POLICY "anon_insert_coaches" ON coaches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_coaches" ON coaches;
CREATE POLICY "anon_update_coaches" ON coaches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_coaches" ON coaches;
CREATE POLICY "anon_delete_coaches" ON coaches FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS data_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  status text NOT NULL,
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE data_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sync_log" ON data_sync_log;
CREATE POLICY "anon_select_sync_log" ON data_sync_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sync_log" ON data_sync_log;
CREATE POLICY "anon_insert_sync_log" ON data_sync_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sync_log" ON data_sync_log;
CREATE POLICY "anon_delete_sync_log" ON data_sync_log FOR DELETE TO anon, authenticated USING (true);
