export type RatingValue = "loved" | "liked" | "ok" | "hated" | "not_seen";
export type WatchStatus = "want_to_watch" | "watching" | "watched" | "removed";
export type AvailabilityType = "subscription" | "rent" | "buy" | "free" | "unavailable";

export interface MediaTitle {
  id: string;
  title: string;
  type: "movie" | "tv";
  poster_url: string | null;
  description: string | null;
  release_year: number | null;
  genres: string[];
  sub_genres: string[];
  cast_members: string[];
  directors: string[];
  rating: number | null;
  complexity_level: number | null;
  smart_level: number | null;
  tone: string | null;
  pacing: string | null;
  themes: string[];
  world_building_level: number | null;
  mystery_level: number | null;
  emotional_depth_level: number | null;
  gore_level: number | null;
  gruesome_visuals_level: number | null;
  suspense_level: number | null;
  horror_level: number | null;
  twisted_plot_level: number | null;
  violence_level: number | null;
  content_warnings: string[];
}

export interface UserRating {
  id: string;
  user_id: string;
  media_title_id: string;
  rating_value: RatingValue;
  source_mode: string;
  rated_at: string;
  created_at: string;
}

export interface StreamingProvider {
  provider_name: string;
  provider_logo_url: string | null;
  availability_type: AvailabilityType;
  region: string;
  watch_url: string | null;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  media_title_id: string;
  status: WatchStatus;
  added_at: string;
  watched_at: string | null;
  removed_at: string | null;
}

export interface UserSettings {
  preferred_type: "movie" | "tv" | "both";
  hide_horror: boolean;
  hide_gore: boolean;
  hide_graphic_violence: boolean;
  hide_gruesome_visuals: boolean;
  hide_excessive_slaughter: boolean;
  hide_pointless_suspense: boolean;
  prefer_complex_plots: boolean;
  prefer_twisted_plots: boolean;
  prefer_newer_releases: boolean;
  include_older_classics: boolean;
  minimum_rating: number;
  preferred_languages: string[];
  preferred_streaming_providers: string[];
  region: string;
  learning_threshold: number;
}

export interface TasteProfile {
  favourite_genres: Record<string, number>;
  disliked_genres: Record<string, number>;
  favourite_cast: Record<string, number>;
  disliked_cast: Record<string, number>;
  favourite_themes: Record<string, number>;
  disliked_themes: Record<string, number>;
  preferred_complexity: number;
  preferred_smart_level: number;
  preferred_mystery: number;
  preferred_world_building: number;
  preferred_emotional_depth: number;
  preferred_twisted_plot: number;
  gore_tolerance: number;
  gruesome_tolerance: number;
  horror_tolerance: number;
  suspense_tolerance: number;
  preferred_type: "movie" | "tv" | "both";
}
