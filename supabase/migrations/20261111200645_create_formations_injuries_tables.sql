/*
# Store scraped probable formations and injuries per matchday

1. New Tables
- `team_formations`: one row per team per matchday with probable lineup scraped from
  fantacalcio.it/probabili-formazioni-serie-a.
  - `id` (uuid PK), `matchday` (int), `squadra` (text), `titolari` (jsonb array of names),
    `panchina` (jsonb array of names), `updated_at` (timestamptz).
- `team_injuries`: one row per team per matchday with injured players scraped from
  fantacalcio.it/infortunati-serie-a.
  - `id` (uuid PK), `matchday` (int), `squadra` (text), `players` (jsonb array of
    { nome, nota } objects), `updated_at` (timestamptz).

2. Security
- Enable RLS on both tables.
- Single-tenant no-auth app: anon+authenticated get SELECT so the app can read scraped
  data; writes come only from the fetch-stats edge function via service role, so only
  service_role gets write grants.
- Unique key (matchday, squadra) lets the scraper upsert in place.
*/

CREATE TABLE IF NOT EXISTS team_formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchday int NOT NULL,
  squadra text NOT NULL,
  titolari jsonb NOT NULL DEFAULT '[]'::jsonb,
  panchina jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (matchday, squadra)
);

CREATE TABLE IF NOT EXISTS team_injuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchday int NOT NULL,
  squadra text NOT NULL,
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (matchday, squadra)
);

ALTER TABLE team_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_injuries ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON team_formations TO anon, authenticated;
GRANT SELECT ON team_injuries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON team_formations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON team_injuries TO service_role;

DROP POLICY IF EXISTS "anon_select_team_formations" ON team_formations;
CREATE POLICY "anon_select_team_formations" ON team_formations FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_team_injuries" ON team_injuries;
CREATE POLICY "anon_select_team_injuries" ON team_injuries FOR SELECT
TO anon, authenticated USING (true);
