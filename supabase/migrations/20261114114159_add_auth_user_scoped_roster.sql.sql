/*
# Add authentication: user-scoped roster, lock all tables to authenticated

## Overview
The app transitions from a no-auth single-tenant schema to an authenticated
schema. Users must sign in to access any data. Only sign-in is available in
the UI (no sign-up); accounts are created manually by the operator.

## Changes

### 1. roster_entries — add user_id column, scope to owner
- Adds `user_id uuid` (nullable — existing 25 rows have no owner yet;
  they will be invisible under RLS until manually reassigned or deleted).
- New inserts get DEFAULT auth.uid() so the column is populated automatically.
- Drops all existing anon/authenticated policies.
- Creates owner-scoped policies: auth.uid() = user_id for SELECT/INSERT/UPDATE/DELETE.
- INSERT policy uses WITH CHECK (auth.uid() = user_id) which is satisfied
  by the DEFAULT auth.uid() even when the client omits user_id.
- Revokes anon; grants CRUD to authenticated only.

### 2. Shared data tables — lock to authenticated, remove anon
coaches, data_sync_log, player_stats, standings, team_formations,
team_injuries, team_tiers: policies changed from `TO anon, authenticated`
to `TO authenticated` only. anon grants revoked. authenticated keeps SELECT.

### 3. Security notes
- Edge function uses service_role key (bypasses RLS) for writes to sync tables.
- roster_entries is private per user: each signed-in user sees only their own roster.
- All shared data tables require authentication to read.
- The 25 pre-existing roster rows have user_id = NULL and will be invisible
  to all users under the new RLS. The operator can reassign them manually
  with: UPDATE roster_entries SET user_id = '<uuid>' WHERE user_id IS NULL;
*/

-- 1. roster_entries: add user_id column (nullable for existing rows)
ALTER TABLE roster_entries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE roster_entries
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Revoke anon, grant authenticated
REVOKE SELECT, INSERT, UPDATE, DELETE ON roster_entries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON roster_entries TO authenticated;

-- Replace policies with owner-scoped ones
DROP POLICY IF EXISTS "anon_select_roster" ON roster_entries;
DROP POLICY IF EXISTS "anon_insert_roster" ON roster_entries;
DROP POLICY IF EXISTS "anon_update_roster" ON roster_entries;
DROP POLICY IF EXISTS "anon_delete_roster" ON roster_entries;

CREATE POLICY "select_own_roster"
ON roster_entries FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "insert_own_roster"
ON roster_entries FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_roster"
ON roster_entries FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_roster"
ON roster_entries FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 2. Shared tables: remove anon, keep authenticated
REVOKE SELECT, INSERT, UPDATE, DELETE ON coaches FROM anon;
GRANT SELECT ON coaches TO authenticated;
DROP POLICY IF EXISTS "anon_select_coaches" ON coaches;
CREATE POLICY "authenticated_select_coaches"
ON coaches FOR SELECT TO authenticated USING (true);

REVOKE SELECT, INSERT, UPDATE, DELETE ON data_sync_log FROM anon;
GRANT SELECT ON data_sync_log TO authenticated;
DROP POLICY IF EXISTS "anon_select_sync_log" ON data_sync_log;
CREATE POLICY "authenticated_select_sync_log"
ON data_sync_log FOR SELECT TO authenticated USING (true);

REVOKE SELECT, INSERT, UPDATE, DELETE ON player_stats FROM anon;
GRANT SELECT ON player_stats TO authenticated;
DROP POLICY IF EXISTS "anon_select_player_stats" ON player_stats;
CREATE POLICY "authenticated_select_player_stats"
ON player_stats FOR SELECT TO authenticated USING (true);

REVOKE SELECT, INSERT, UPDATE, DELETE ON standings FROM anon;
GRANT SELECT ON standings TO authenticated;
DROP POLICY IF EXISTS "select_standings" ON standings;
CREATE POLICY "authenticated_select_standings"
ON standings FOR SELECT TO authenticated USING (true);

REVOKE SELECT, INSERT, UPDATE, DELETE ON team_formations FROM anon;
GRANT SELECT ON team_formations TO authenticated;
DROP POLICY IF EXISTS "anon_select_team_formations" ON team_formations;
CREATE POLICY "authenticated_select_team_formations"
ON team_formations FOR SELECT TO authenticated USING (true);

REVOKE SELECT, INSERT, UPDATE, DELETE ON team_injuries FROM anon;
GRANT SELECT ON team_injuries TO authenticated;
DROP POLICY IF EXISTS "anon_select_team_injuries" ON team_injuries;
CREATE POLICY "authenticated_select_team_injuries"
ON team_injuries FOR SELECT TO authenticated USING (true);

REVOKE SELECT, INSERT, UPDATE, DELETE ON team_tiers FROM anon;
GRANT SELECT ON team_tiers TO authenticated;
DROP POLICY IF EXISTS "anon_select_team_tiers" ON team_tiers;
CREATE POLICY "authenticated_select_team_tiers"
ON team_tiers FOR SELECT TO authenticated USING (true);
