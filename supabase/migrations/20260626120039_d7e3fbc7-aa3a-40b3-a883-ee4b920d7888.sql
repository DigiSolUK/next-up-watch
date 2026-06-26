
-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- media catalog (public)
CREATE TABLE public.media_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('movie','tv')),
  poster_url text,
  description text,
  release_year int,
  genres text[] NOT NULL DEFAULT '{}',
  sub_genres text[] NOT NULL DEFAULT '{}',
  cast_members text[] NOT NULL DEFAULT '{}',
  directors text[] NOT NULL DEFAULT '{}',
  rating numeric,
  external_id text,
  external_source text,
  complexity_level int DEFAULT 3,
  smart_level int DEFAULT 3,
  tone text,
  pacing text,
  themes text[] NOT NULL DEFAULT '{}',
  world_building_level int DEFAULT 3,
  mystery_level int DEFAULT 3,
  emotional_depth_level int DEFAULT 3,
  gore_level int DEFAULT 1,
  gruesome_visuals_level int DEFAULT 1,
  suspense_level int DEFAULT 3,
  horror_level int DEFAULT 1,
  twisted_plot_level int DEFAULT 1,
  violence_level int DEFAULT 1,
  content_warnings text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media_titles TO anon, authenticated;
GRANT ALL ON public.media_titles TO service_role;
ALTER TABLE public.media_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media catalog public read" ON public.media_titles FOR SELECT TO anon, authenticated USING (true);

-- user ratings
CREATE TABLE public.user_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_title_id uuid NOT NULL REFERENCES public.media_titles(id) ON DELETE CASCADE,
  rating_value text NOT NULL CHECK (rating_value IN ('loved','liked','ok','hated','not_seen')),
  source_mode text NOT NULL DEFAULT 'learning' CHECK (source_mode IN ('learning','recommendation','watchlist_followup','retaste')),
  rating_context jsonb,
  rating_confidence numeric NOT NULL DEFAULT 1.0,
  rated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_title_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ratings TO authenticated;
GRANT ALL ON public.user_ratings TO service_role;
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ratings all" ON public.user_ratings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX user_ratings_user_idx ON public.user_ratings(user_id);

-- watchlist
CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_title_id uuid NOT NULL REFERENCES public.media_titles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'want_to_watch' CHECK (status IN ('want_to_watch','watching','watched','removed')),
  added_at timestamptz NOT NULL DEFAULT now(),
  watched_at timestamptz,
  removed_at timestamptz,
  UNIQUE (user_id, media_title_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watchlist all" ON public.watchlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user taste profile
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_summary text,
  recommendation_ready boolean NOT NULL DEFAULT false,
  ratings_count int NOT NULL DEFAULT 0,
  confidence_score numeric NOT NULL DEFAULT 0,
  recommendation_readiness_score numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own taste profile all" ON public.user_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recommendation events log
CREATE TABLE public.recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_title_id uuid NOT NULL REFERENCES public.media_titles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_events TO authenticated;
GRANT ALL ON public.recommendation_events TO service_role;
ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events all" ON public.recommendation_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX rec_events_user_idx ON public.recommendation_events(user_id, created_at DESC);

-- streaming availability (public)
CREATE TABLE public.streaming_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_title_id uuid NOT NULL REFERENCES public.media_titles(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  provider_logo_url text,
  availability_type text NOT NULL DEFAULT 'subscription' CHECK (availability_type IN ('subscription','rent','buy','free','unavailable')),
  region text NOT NULL DEFAULT 'GB',
  watch_url text,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.streaming_availability TO anon, authenticated;
GRANT ALL ON public.streaming_availability TO service_role;
ALTER TABLE public.streaming_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming public read" ON public.streaming_availability FOR SELECT TO anon, authenticated USING (true);

-- user settings
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_type text NOT NULL DEFAULT 'both' CHECK (preferred_type IN ('movie','tv','both')),
  hide_horror boolean NOT NULL DEFAULT false,
  hide_gore boolean NOT NULL DEFAULT false,
  hide_graphic_violence boolean NOT NULL DEFAULT false,
  hide_gruesome_visuals boolean NOT NULL DEFAULT false,
  hide_excessive_slaughter boolean NOT NULL DEFAULT false,
  hide_pointless_suspense boolean NOT NULL DEFAULT false,
  prefer_complex_plots boolean NOT NULL DEFAULT false,
  prefer_twisted_plots boolean NOT NULL DEFAULT false,
  prefer_newer_releases boolean NOT NULL DEFAULT false,
  include_older_classics boolean NOT NULL DEFAULT true,
  minimum_rating numeric NOT NULL DEFAULT 0,
  preferred_languages text[] NOT NULL DEFAULT '{en}',
  preferred_streaming_providers text[] NOT NULL DEFAULT '{}',
  region text NOT NULL DEFAULT 'GB',
  learning_threshold int NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings all" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- auto-create profile/settings/taste on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (new.id, new.email)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_profiles (user_id) VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER touch_media_titles BEFORE UPDATE ON public.media_titles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_user_settings BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_streaming BEFORE UPDATE ON public.streaming_availability FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
