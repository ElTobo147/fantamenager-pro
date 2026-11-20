/*
# Add media voto (MV) to player statistics

1. Modified Tables
- `player_stats`
- Adds `mv` (float, not null, default 0): the official media voto shown on
  Fantacalcio.it's statistics page, between the PV and FM columns.
- Existing gol, assist, fm and pv values are left untouched.

2. Data behavior
- Existing rows receive 0 until the next "Aggiorna dati" synchronization,
  which will write the real MV from Fantacalcio.it.

3. Security
- No RLS or grant changes: this migration only adds a column to the existing
  protected table, whose policies already cover all roles.
*/

ALTER TABLE player_stats
  ADD COLUMN IF NOT EXISTS mv float NOT NULL DEFAULT 0;
