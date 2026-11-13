/*
# Create standings table (Serie A classification from WhoScored)

1. New Tables
- `standings`
- `id` (uuid, primary key)
- `posizione` (int, position in the table)
- `squadra` (text, unique team name)
- `gare` (int, matches played)
- `vittorie` (int, wins)
- `pareggi` (int, draws)
- `sconfitte` (int, losses)
- `gol_fatti` (int, goals for)
- `gol_subiti` (int, goals against)
- `punti` (int, points)
- `updated_at` (timestamp)

2. Security
- Enable RLS on `standings`.
- Public read-only app data: SELECT granted to anon + authenticated (no sign-in in this app).
- Writes happen only from the fetch-stats edge function via service_role, which bypasses RLS;
  no INSERT/UPDATE/DELETE grants to anon/authenticated.
*/

CREATE TABLE IF NOT EXISTS standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posizione int NOT NULL DEFAULT 0,
  squadra text UNIQUE NOT NULL,
  gare int NOT NULL DEFAULT 0,
  vittorie int NOT NULL DEFAULT 0,
  pareggi int NOT NULL DEFAULT 0,
  sconfitte int NOT NULL DEFAULT 0,
  gol_fatti int NOT NULL DEFAULT 0,
  gol_subiti int NOT NULL DEFAULT 0,
  punti int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON standings TO anon, authenticated;
GRANT ALL ON standings TO service_role;

DROP POLICY IF EXISTS "select_standings" ON standings;

CREATE POLICY "select_standings" ON standings
FOR SELECT
TO anon, authenticated
USING (true);
