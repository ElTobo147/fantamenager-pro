/*
# Create data_sources table — user-manageable sync URLs

1. New Tables
- `data_sources`: stores the source URLs that the "Aggiorna dati" button reads from.
  - `id` (uuid, primary key)
  - `source_key` (text, unique) — short identifier: formazioni, infortunati, stats, allenatori, esonerati, classifica
  - `label` (text) — human-readable label shown in the UI
  - `url` (text) — the URL to fetch
  - `parser_type` (text) — which parser to use: probabili_formazioni, infortunati, stats, coaches, esonerati, standings
  - `enabled` (boolean, default true)
  - `created_at` (timestamptz)

2. Seed data
- Inserts the current hardcoded URLs plus the new Sky esonerati page.

3. Security
- Enable RLS on data_sources.
- Grant SELECT, INSERT, UPDATE, DELETE to authenticated (app requires sign-in).
- Owner-scoped is not needed here: data sources are shared app configuration visible to all authenticated users.
- 4 CRUD policies with USING (true) + WITH CHECK (true) because all authenticated users share this config.
*/

CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text UNIQUE NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  parser_type text NOT NULL DEFAULT 'stats',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON data_sources TO authenticated;

DROP POLICY IF EXISTS "select_data_sources" ON data_sources;
CREATE POLICY "select_data_sources" ON data_sources FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_data_sources" ON data_sources;
CREATE POLICY "insert_data_sources" ON data_sources FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_data_sources" ON data_sources;
CREATE POLICY "update_data_sources" ON data_sources FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_data_sources" ON data_sources;
CREATE POLICY "delete_data_sources" ON data_sources FOR DELETE
  TO authenticated USING (true);

INSERT INTO data_sources (source_key, label, url, parser_type, enabled) VALUES
  ('formazioni',  'Probabili Formazioni',  'https://www.fantacalcio.it/probabili-formazioni-serie-a', 'probabili_formazioni', true),
  ('infortunati', 'Infortunati',           'https://www.fantacalcio.it/infortunati-serie-a',          'infortunati',          true),
  ('stats',       'Statistiche giocatori', 'https://www.fantacalcio.it/statistiche-serie-a',          'stats',                true),
  ('allenatori',  'Allenatori (panchine)', 'https://sport.sky.it/calciomercato/allenatori-serie-a-2026-2027-situazione-panchine-squadre', 'coaches', true),
  ('esonerati',   'Allenatori esonerati',  'https://sport.sky.it/calcio/serie-a/serie-a-2026-2027-allenatori-esonerati', 'esonerati', true),
  ('classifica',  'Classifica',            'https://www.whoscored.com/regions/108/tournaments/5/seasons/11126/stages/25518/show/italy-serie-a-2026-2027', 'standings', true)
ON CONFLICT (source_key) DO UPDATE SET
  label = EXCLUDED.label,
  url = EXCLUDED.url,
  parser_type = EXCLUDED.parser_type;