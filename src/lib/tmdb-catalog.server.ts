import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { UserSettings } from "@/lib/types";
import type { Database } from "@/integrations/supabase/types";

type MediaType = "movie" | "tv";
type MediaInsert = Database["public"]["Tables"]["media_titles"]["Insert"];
type StreamingInsert = Database["public"]["Tables"]["streaming_availability"]["Insert"];

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w780";
const PROVIDER_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w92";
const IMPORT_LIMIT = 24;
const DISCOVERY_PAGES = 8;
const CANDIDATE_TARGET = IMPORT_LIMIT * 4;

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbPerson {
  name: string;
  job?: string;
}

interface TmdbDiscoveryItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  vote_average?: number;
}

interface TmdbDiscoverResponse {
  results?: TmdbDiscoveryItem[];
}

interface TmdbDetails extends TmdbDiscoveryItem {
  release_date?: string;
  first_air_date?: string;
  genres?: TmdbGenre[];
  credits?: {
    cast?: TmdbPerson[];
    crew?: TmdbPerson[];
  };
}

interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

interface TmdbWatchProviderResponse {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: TmdbWatchProvider[];
      free?: TmdbWatchProvider[];
      ads?: TmdbWatchProvider[];
      rent?: TmdbWatchProvider[];
      buy?: TmdbWatchProvider[];
    }
  >;
}

interface TmdbProviderListResponse {
  results?: TmdbWatchProvider[];
}

function requireTmdbAuth() {
  const apiKey = process.env.TMDB_API_KEY;
  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!apiKey && !accessToken) {
    throw new Error("Missing TMDB_API_KEY or TMDB_API_READ_ACCESS_TOKEN.");
  }
  return { apiKey, accessToken };
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const { apiKey, accessToken } = requireTmdbAuth();
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  if (apiKey) url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!response.ok) {
    throw new Error(`TMDb request failed for ${path}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function yearFrom(dateString: string | undefined) {
  if (!dateString) return null;
  const year = Number(dateString.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function imageUrl(path: string | null | undefined, base = IMAGE_BASE_URL) {
  return path ? `${base}${path}` : null;
}

function uniqueNames(items: TmdbPerson[] | undefined, predicate?: (item: TmdbPerson) => boolean, limit = 6) {
  const names = new Set<string>();
  for (const item of items ?? []) {
    if (predicate && !predicate(item)) continue;
    if (item.name) names.add(item.name);
    if (names.size >= limit) break;
  }
  return [...names];
}

function normalizeProviderName(name: string) {
  if (/netflix/i.test(name)) return "Netflix";
  if (/amazon prime|prime video/i.test(name)) return "Prime Video";
  if (/apple tv/i.test(name)) return "Apple TV";
  return name;
}

function deriveTasteFields(genres: string[]) {
  const lower = new Set(genres.map((genre) => genre.toLowerCase()));
  const has = (...values: string[]) => values.some((value) => lower.has(value));
  const horror = has("horror");
  const thriller = has("thriller", "mystery", "crime");
  const cerebral = has("science fiction", "sci-fi", "mystery", "drama");
  const world = has("science fiction", "sci-fi", "fantasy", "adventure");
  const action = has("action", "crime", "war", "western");
  const comedy = has("comedy", "family");

  return {
    complexity_level: cerebral ? 4 : comedy ? 2 : 3,
    smart_level: cerebral ? 4 : comedy ? 2 : 3,
    tone: horror || thriller ? "tense" : comedy ? "easy" : has("drama") ? "emotional" : "balanced",
    pacing: action || thriller ? "propulsive" : comedy ? "easy" : "measured",
    themes: [
      ...(world ? ["world-building"] : []),
      ...(thriller ? ["mystery", "consequence"] : []),
      ...(has("drama") ? ["relationships", "identity"] : []),
      ...(action ? ["conflict", "survival"] : []),
      ...(comedy ? ["friendship", "comfort"] : []),
    ],
    world_building_level: world ? 4 : 1,
    mystery_level: thriller ? 4 : 1,
    emotional_depth_level: has("drama", "romance") ? 4 : 2,
    gore_level: horror ? 3 : action ? 2 : 1,
    gruesome_visuals_level: horror ? 3 : 1,
    suspense_level: thriller || horror ? 4 : 2,
    horror_level: horror ? 4 : 1,
    twisted_plot_level: thriller ? 3 : 1,
    violence_level: action || thriller ? 3 : 1,
    content_warnings: [
      ...(horror ? ["horror", "threat"] : []),
      ...(action ? ["violence"] : []),
      ...(thriller ? ["suspense"] : []),
    ],
  };
}

async function getProviderIds(type: MediaType, region: string, preferredProviders: string[]) {
  if (!preferredProviders.length) return [];
  const response = await tmdbFetch<TmdbProviderListResponse>(`/watch/providers/${type}`, {
    language: "en-GB",
    watch_region: region,
  });
  const wanted = new Set(preferredProviders);
  return (response.results ?? [])
    .filter((provider) => wanted.has(normalizeProviderName(provider.provider_name)))
    .map((provider) => provider.provider_id);
}

async function discoverCandidates(type: MediaType, settings: UserSettings | null, existingExternalIds: Set<string>) {
  const region = settings?.region ?? "GB";
  const providerIds = await getProviderIds(type, region, settings?.preferred_streaming_providers ?? []);
  const strictMinimumRating = Math.max(6.5, Number(settings?.minimum_rating ?? 0));
  const broadMinimumRating = Math.max(5.8, Number(settings?.minimum_rating ?? 0));
  const candidates: Array<{ type: MediaType; id: number }> = [];
  const candidateKeys = new Set<string>();

  const addCandidate = (item: TmdbDiscoveryItem) => {
    const key = `${type}-${item.id}`;
    if (!item.poster_path || !item.overview) return;
    if (existingExternalIds.has(key) || candidateKeys.has(key)) return;
    candidateKeys.add(key);
    candidates.push({ type, id: item.id });
  };

  const discover = async (options: { providerFiltered: boolean; minimumRating: number; sortBy: string; voteCount: number }) => {
    for (let page = 1; page <= DISCOVERY_PAGES && candidates.length < CANDIDATE_TARGET; page++) {
      const response = await tmdbFetch<TmdbDiscoverResponse>(`/discover/${type}`, {
        include_adult: false,
        include_video: false,
        language: "en-GB",
        page,
        region,
        sort_by: options.sortBy,
        "vote_average.gte": options.minimumRating,
        "vote_count.gte": options.voteCount,
        watch_region: region,
        with_watch_monetization_types: "flatrate|free|rent|buy",
        with_watch_providers: options.providerFiltered && providerIds.length ? providerIds.join("|") : undefined,
      });

      for (const item of response.results ?? []) addCandidate(item);
    }
  };

  const discoveryPasses = [
    { providerFiltered: true, minimumRating: strictMinimumRating, sortBy: "popularity.desc", voteCount: type === "movie" ? 300 : 150 },
    { providerFiltered: true, minimumRating: strictMinimumRating, sortBy: "vote_count.desc", voteCount: type === "movie" ? 250 : 120 },
    { providerFiltered: true, minimumRating: broadMinimumRating, sortBy: "popularity.desc", voteCount: type === "movie" ? 120 : 60 },
    { providerFiltered: false, minimumRating: strictMinimumRating, sortBy: "popularity.desc", voteCount: type === "movie" ? 300 : 150 },
    { providerFiltered: false, minimumRating: broadMinimumRating, sortBy: "vote_count.desc", voteCount: type === "movie" ? 120 : 60 },
  ];

  for (const pass of discoveryPasses) {
    await discover(pass);
    if (candidates.length >= CANDIDATE_TARGET) break;
  }

  return candidates;
}

async function fetchDetails(type: MediaType, id: number) {
  return tmdbFetch<TmdbDetails>(`/${type}/${id}`, {
    language: "en-GB",
    append_to_response: "credits",
  });
}

async function fetchWatchProviders(type: MediaType, id: number) {
  return tmdbFetch<TmdbWatchProviderResponse>(`/${type}/${id}/watch/providers`);
}

function mapDetailsToMediaRow(type: MediaType, id: number, details: TmdbDetails): MediaInsert {
  const genres = (details.genres ?? []).map((genre) => genre.name);
  const taste = deriveTasteFields(genres);
  const title = type === "tv" ? (details.name ?? "Untitled TV Series") : (details.title ?? "Untitled Movie");
  const releaseYear = yearFrom(details.release_date ?? details.first_air_date);
  const directors = uniqueNames(
    details.credits?.crew,
    (member) => ["Director", "Series Director", "Episode Director"].includes(member.job ?? ""),
    4,
  );

  return {
    title,
    type,
    poster_url: imageUrl(details.poster_path),
    description: details.overview ?? null,
    release_year: releaseYear,
    genres,
    sub_genres: [],
    cast_members: uniqueNames(details.credits?.cast, undefined, 6),
    directors,
    rating: typeof details.vote_average === "number" ? Number(details.vote_average.toFixed(1)) : null,
    external_source: "tmdb",
    external_id: `${type}-${id}`,
    ...taste,
  };
}

function mapWatchProviders(mediaTitleId: string, response: TmdbWatchProviderResponse, region: string): StreamingInsert[] {
  const regionData = response.results?.[region];
  if (!regionData) return [];

  const rows: StreamingInsert[] = [];
  const seen = new Set<string>();
  const groups = [
    { key: "flatrate", type: "subscription" },
    { key: "free", type: "free" },
    { key: "ads", type: "free" },
    { key: "rent", type: "rent" },
    { key: "buy", type: "buy" },
  ] as const;

  for (const group of groups) {
    const providers = regionData[group.key] ?? [];
    for (const provider of providers) {
      const providerName = normalizeProviderName(provider.provider_name);
      const dedupeKey = `${providerName}:${group.type}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        media_title_id: mediaTitleId,
        provider_name: providerName,
        provider_logo_url: imageUrl(provider.logo_path, PROVIDER_IMAGE_BASE_URL),
        availability_type: group.type,
        region,
        watch_url: regionData.link ?? null,
      });
      if (rows.length >= 8) return rows;
    }
  }

  return rows;
}

export async function importMoreTmdbCatalog(settings: UserSettings | null) {
  const region = settings?.region ?? "GB";
  const preferredType = settings?.preferred_type ?? "both";
  const mediaTypes: MediaType[] = preferredType === "both" ? ["movie", "tv"] : [preferredType];

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("media_titles")
    .select("external_id")
    .eq("external_source", "tmdb");

  if (existingError) throw existingError;

  const existingExternalIds = new Set(
    (existing ?? []).map((row) => row.external_id).filter((id): id is string => Boolean(id)),
  );
  const candidates: Array<{ type: MediaType; id: number }> = [];

  for (const type of mediaTypes) {
    candidates.push(...await discoverCandidates(type, settings, existingExternalIds));
  }

  let added = 0;
  let scanned = 0;

  for (const candidate of candidates) {
    if (added >= IMPORT_LIMIT) break;
    scanned++;

    const details = await fetchDetails(candidate.type, candidate.id);
    const row = mapDetailsToMediaRow(candidate.type, candidate.id, details);
    const { data: inserted, error } = await supabaseAdmin
      .from("media_titles")
      .insert(row)
      .select("id")
      .single();

    if (error) throw error;
    if (!inserted?.id) continue;

    const watchProviders = await fetchWatchProviders(candidate.type, candidate.id);
    const providerRows = mapWatchProviders(inserted.id, watchProviders, region);
    await supabaseAdmin.from("streaming_availability").delete().eq("media_title_id", inserted.id).eq("region", region);
    if (providerRows.length) {
      const { error: providerError } = await supabaseAdmin.from("streaming_availability").insert(providerRows);
      if (providerError) throw providerError;
    }

    existingExternalIds.add(`${candidate.type}-${candidate.id}`);
    added++;
  }

  return { added, scanned };
}
