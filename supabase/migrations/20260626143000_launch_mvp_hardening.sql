-- Launch MVP hardening: query indexes, public catalog integrity, and first-run repair helpers.

CREATE INDEX IF NOT EXISTS media_titles_type_idx ON public.media_titles(type);
CREATE INDEX IF NOT EXISTS media_titles_rating_idx ON public.media_titles(rating);
CREATE INDEX IF NOT EXISTS media_titles_release_year_idx ON public.media_titles(release_year);
CREATE INDEX IF NOT EXISTS media_titles_genres_gin_idx ON public.media_titles USING gin(genres);
CREATE INDEX IF NOT EXISTS media_titles_themes_gin_idx ON public.media_titles USING gin(themes);

CREATE INDEX IF NOT EXISTS streaming_availability_title_region_idx
  ON public.streaming_availability(media_title_id, region);
CREATE INDEX IF NOT EXISTS streaming_availability_provider_region_idx
  ON public.streaming_availability(provider_name, region);

CREATE INDEX IF NOT EXISTS user_ratings_user_rated_at_idx
  ON public.user_ratings(user_id, rated_at DESC);
CREATE INDEX IF NOT EXISTS watchlist_user_status_added_idx
  ON public.watchlist(user_id, status, added_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_titles_external_source_id_key'
  ) THEN
    ALTER TABLE public.media_titles
      ADD CONSTRAINT media_titles_external_source_id_key
      UNIQUE (external_source, external_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_titles_rating_range'
  ) THEN
    ALTER TABLE public.media_titles
      ADD CONSTRAINT media_titles_rating_range
      CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_minimum_rating_range'
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_minimum_rating_range
      CHECK (minimum_rating >= 0 AND minimum_rating <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_learning_threshold_range'
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_learning_threshold_range
      CHECK (learning_threshold >= 5 AND learning_threshold <= 150);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NULL OR target_user_id <> (select auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.user_settings (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_profiles (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_user_bootstrap(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap(uuid) TO authenticated;
