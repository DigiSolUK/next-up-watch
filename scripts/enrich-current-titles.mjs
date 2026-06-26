import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_READ_ACCESS_TOKEN = process.env.TMDB_API_READ_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

if (!TMDB_API_KEY && !TMDB_API_READ_ACCESS_TOKEN) {
  throw new Error("Missing TMDB_API_KEY or TMDB_API_READ_ACCESS_TOKEN.");
}

const tmdbBaseUrl = "https://api.themoviedb.org/3";
const imageBaseUrl = "https://image.tmdb.org/t/p/w780";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function tmdbFetch(path, params = {}) {
  const url = new URL(`${tmdbBaseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  if (TMDB_API_KEY) url.searchParams.set("api_key", TMDB_API_KEY);

  const headers = TMDB_API_READ_ACCESS_TOKEN
    ? { Authorization: `Bearer ${TMDB_API_READ_ACCESS_TOKEN}` }
    : {};

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`TMDb request failed for ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function yearFrom(dateString) {
  if (!dateString) return null;
  const year = Number(String(dateString).slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function normalizeType(type) {
  return type === "tv" ? "tv" : "movie";
}

function pickCrewNames(crew, roles) {
  const roleSet = new Set(roles);
  return [...new Set((crew ?? []).filter((member) => roleSet.has(member.job)).map((member) => member.name))];
}

function pickCastNames(cast) {
  return [...new Set((cast ?? []).slice(0, 6).map((member) => member.name))];
}

function posterUrlFromPath(path) {
  return path ? `${imageBaseUrl}${path}` : null;
}

async function resolveTmdbId(row) {
  const parsed = String(row.external_id ?? "").match(/^(movie|tv)-(\d+)$/);
  if (row.external_source === "tmdb" && parsed) {
    return { type: normalizeType(parsed[1]), id: Number(parsed[2]) };
  }

  const searchPath = row.type === "tv" ? "/search/tv" : "/search/movie";
  const results = await tmdbFetch(searchPath, {
    query: row.title,
    include_adult: false,
    language: "en-US",
    year: row.release_year ?? undefined,
    first_air_date_year: row.release_year ?? undefined,
  });

  const top = (results.results ?? [])[0];
  if (!top) return null;
  return { type: row.type === "tv" ? "tv" : "movie", id: top.id };
}

async function fetchTmdbDetails(type, id) {
  return tmdbFetch(`/${type}/${id}`, {
    language: "en-US",
    append_to_response: "credits",
  });
}

async function enrichRow(row) {
  const resolved = await resolveTmdbId(row);
  if (!resolved) {
    console.warn(`Skipping ${row.title}: no TMDb match found.`);
    return false;
  }

  const details = await fetchTmdbDetails(resolved.type, resolved.id);
  const title = resolved.type === "tv" ? (details.name ?? row.title) : (details.title ?? row.title);
  const overview = details.overview ?? row.description ?? null;
  const releaseYear = yearFrom(details.release_date ?? details.first_air_date) ?? row.release_year ?? null;
  const genres = (details.genres ?? []).map((genre) => genre.name);
  const castMembers = pickCastNames(details.credits?.cast);
  const directors =
    resolved.type === "tv"
      ? pickCrewNames(details.credits?.crew, ["Director", "Series Director", "Episode Director"])
      : pickCrewNames(details.credits?.crew, ["Director"]);
  const rating = typeof details.vote_average === "number" ? Number(details.vote_average.toFixed(1)) : row.rating;
  const posterUrl = posterUrlFromPath(details.poster_path ?? null);

  const { error } = await supabase
    .from("media_titles")
    .update({
      title,
      poster_url: posterUrl ?? row.poster_url,
      description: overview,
      release_year: releaseYear,
      genres: genres.length ? genres : row.genres,
      cast_members: castMembers.length ? castMembers : row.cast_members,
      directors: directors.length ? directors : row.directors,
      rating: rating ?? row.rating,
      external_source: "tmdb",
      external_id: `${resolved.type}-${resolved.id}`,
    })
    .eq("id", row.id);

  if (error) throw error;

  console.log(`Enriched ${title} (${resolved.type}-${resolved.id})`);
  return true;
}

async function main() {
  const { data, error } = await supabase
    .from("media_titles")
    .select("*")
    .order("title", { ascending: true });

  if (error) throw error;

  let updated = 0;
  for (const row of data ?? []) {
    // Preserve the app's custom taste fields; only backfill public-facing title details and artwork.
    if (await enrichRow(row)) updated++;
  }

  console.log(`Finished. Updated ${updated} titles.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
