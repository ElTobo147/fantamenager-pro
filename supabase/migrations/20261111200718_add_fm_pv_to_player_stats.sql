/*
# Add fantamedia and matches-played columns to player_stats

1. Modified Tables
- `player_stats`: adds `fm` (float, fantamedia from fantacalcio.it/statistiche-serie-a)
  and `pv` (int, partite a voto / matches with a rating). Both default to 0.
  Existing gol/assist columns stay authoritative for goals and assists; xg/xa remain
  for estimated expected-goals values computed elsewhere.

2. Security
- No policy changes: table already has RLS with anon+authenticated SELECT/INSERT/
  UPDATE/DELETE for this single-tenant no-auth app, and service_role writes via the
  edge function still work with the new columns.
*/

ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS fm float NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS pv int NOT NULL DEFAULT 0;
