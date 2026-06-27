# Enrich existing titles from TMDb

## Why not `npm run enrich:tmdb` directly

`scripts/enrich-current-titles.mjs` requires `SUPABASE_SERVICE_ROLE_KEY`, which isn't exposed on Lovable Cloud. The sandbox shell also can't run bulk `UPDATE`s via `psql` (select/insert only). To preserve the same behavior — TMDb-sourced enrichment of *only existing rows*, keeping all taste/intensity fields — I'll run the same logic through a one-shot admin server function that uses the internal service-role client.

The script file itself stays in the repo unchanged; this just gives it a runnable path inside Lovable Cloud.

## Steps

1. Request `TMDB_API_READ_ACCESS_TOKEN` via the secure secret form (v4 read token preferred; v3 `TMDB_API_KEY` also accepted if that's what you have).
2. Add an admin-gated server function `enrichTitlesFromTmdb` at `src/lib/admin-enrich.functions.ts`:
   - `.middleware([requireSupabaseAuth])`, then `has_role(userId, 'admin')` check.
   - Inside the handler, dynamic-import `supabaseAdmin`.
   - Port the script's logic: resolve TMDb id (reuse `external_id` when `external_source = 'tmdb'`, otherwise `/search/{movie|tv}` by title + year), fetch `/{type}/{id}?append_to_response=credits`, then `UPDATE media_titles` with poster_url, description, release_year, genres, cast_members (top 6), directors, rating, `external_source='tmdb'`, `external_id='{type}-{id}'`. Custom taste/intensity columns are not touched.
   - Return `{ updated: number, unmatched: string[] }`.
3. Make sure the current account has the `admin` role (insert into `user_roles` via migration if needed — I'll check first and only add if missing).
4. Invoke the function once from the running app (or via `invoke-server-function`), capture the result, and report:
   - Number of rows updated.
   - Any titles TMDb couldn't match.
5. Leave the function in place but admin-gated (safe — not a public endpoint). If you'd rather I delete it after the run, say so.

## Guarantees

- No new titles inserted; no rows deleted. Catalog size unchanged.
- Only the columns listed above are written. `complexity_level`, intensity fields, taste metadata, etc. are untouched.
- TMDb token is stored as a server secret; never shipped to the browser.
- No edits to `scripts/enrich-current-titles.mjs`, `client.ts`, `client.server.ts`, or other unrelated files.

## Technical notes

- Function lives under `src/lib/` (not `src/server/`) so it's reachable by `useServerFn`, but `supabaseAdmin` is loaded inside the handler so it doesn't leak into the client bundle.
- TMDb calls are sequential with a small delay to stay polite under their rate limit; ~50 titles will complete in well under a minute.
- If TMDb returns no match for a title, that row is left untouched and its title is added to the `unmatched` list returned to you.

OK to proceed? Once you approve I'll prompt for the TMDb token, then implement and run.
