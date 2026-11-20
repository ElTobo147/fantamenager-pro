/*
# Add media voto to player statistics

1. Modified Tables
- `player_stats`
- Adds `mv` (float, not null, default 0), the official media voto (MV) read from Fantacalcio.it.
- Existing goal, assist, fantamedia and appearances values remain unchanged.

2. Data behavior
- Existing rows receive 0 until the next statistics synchronization.
- The fetch-stats edge function will populate MV from the Fantacalcio.it statistics page.

3. Security
- No RLS or grant changes are needed because this migration only adds a column to the existing protected table.
*/

ALTER TABLE player_stats
  ADD COLUMN IF NOT EXISTS mv float NOT NULL DEFAULT 0;
