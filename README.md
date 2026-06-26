# NextUp Watch

NextUp is a TanStack Start + Supabase MVP for building a personal movie and TV taste profile. Users swipe through a curated catalog, unlock personalized recommendations, and track a watchlist.

## Requirements

- Bun, because this repo is locked with `bun.lock`
- Supabase project credentials
- Git without rebasing or force-pushing published Lovable branches

## Environment

Create `.env` with the public Supabase values:

```bash
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Only server-only admin code should ever use `SUPABASE_SERVICE_ROLE_KEY`. Do not expose service-role keys with `VITE_`.

## Local Setup

```bash
bun install
bun run dev
```

Useful checks:

```bash
bun run lint
bun run build
```

## Database Setup

Apply migrations in order, then seed the curated MVP catalog:

```bash
supabase db push
supabase db execute --file supabase/seed.sql
```

If the Supabase CLI is not available, run the SQL in `supabase/seed.sql` through the Supabase dashboard SQL editor after migrations have been applied.

The seed is idempotent. It upserts 20 launch titles and rebuilds their GB streaming availability rows.

## Enrich Existing Titles

This repo also includes a one-shot TMDb backfill for the titles already in the app. It refreshes poster art and public title details without expanding the catalog.

Set these env vars before running it:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
TMDB_API_KEY=... # or TMDB_API_READ_ACCESS_TOKEN=...
```

Then run:

```bash
npm run enrich:tmdb
```

The script preserves the app's custom taste/intensity fields and only updates title metadata, artwork, and existing TMDb identifiers.

## Launch MVP Acceptance

- New users can sign up or confirm by email, then reach `/swipe`.
- Missing first-run `user_settings` and `user_profiles` rows self-repair.
- Learning mode advances through a stable, diverse queue.
- Recommendation mode respects content type, rating, intensity, region, and preferred provider filters.
- Watchlist add/update/remove and post-watch rating flows work.
- Profile confidence and taste summaries update after ratings.

## Lovable/GitHub Workflow

This project is connected to Lovable. Avoid force pushes, rebases, squashes, or amended commits on published branches. Keep pushed commits buildable so Lovable can sync a usable project state.
