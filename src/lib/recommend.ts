import type { MediaTitle, RatingValue, TasteProfile, UserRating, UserSettings } from "./types";

const RATING_WEIGHT: Record<RatingValue, number> = {
  loved: 2,
  liked: 1,
  ok: 0,
  hated: -2,
  not_seen: 0,
};

// Recency weighting: a rating's influence decays over ~180 days
function recencyWeight(ratedAt: string): number {
  const ageMs = Date.now() - new Date(ratedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0.35, Math.exp(-ageDays / 365));
}

function bump(map: Record<string, number>, key: string, by: number) {
  map[key] = (map[key] ?? 0) + by;
}

function reconcilePreferenceMaps(
  positive: Record<string, number>,
  negative: Record<string, number>,
  options: { negativeDominance?: number; minimumPositiveNet?: number; minimumNegativeNet?: number } = {},
) {
  const negativeDominance = options.negativeDominance ?? 2.25;
  const minimumPositiveNet = options.minimumPositiveNet ?? 0.5;
  const minimumNegativeNet = options.minimumNegativeNet ?? 1.25;
  const positiveOnly: Record<string, number> = {};
  const negativeOnly: Record<string, number> = {};
  const keys = new Set([...Object.keys(positive), ...Object.keys(negative)]);

  for (const key of keys) {
    const positiveScore = positive[key] ?? 0;
    const negativeScore = negative[key] ?? 0;
    const net = positiveScore - negativeScore;

    if (net >= minimumPositiveNet) {
      positiveOnly[key] = net;
    } else if (
      -net >= minimumNegativeNet
      && negativeScore >= Math.max(minimumNegativeNet, positiveScore * negativeDominance)
    ) {
      negativeOnly[key] = -net;
    }
  }

  return [positiveOnly, negativeOnly] as const;
}

function avg(values: number[]): number {
  if (!values.length) return 3;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stableTitleOrder(titles: MediaTitle[], seed: string): MediaTitle[] {
  return [...titles].sort((a, b) => stableHash(`${seed}:${a.id}`) - stableHash(`${seed}:${b.id}`));
}

export function buildTasteProfile(
  ratings: (UserRating & { media: MediaTitle | null })[],
  fallbackType: "movie" | "tv" | "both" = "both",
): TasteProfile {
  const tp: TasteProfile = {
    favourite_genres: {},
    disliked_genres: {},
    favourite_cast: {},
    disliked_cast: {},
    favourite_themes: {},
    disliked_themes: {},
    preferred_complexity: 3,
    preferred_smart_level: 3,
    preferred_mystery: 3,
    preferred_world_building: 3,
    preferred_emotional_depth: 3,
    preferred_twisted_plot: 3,
    gore_tolerance: 2,
    gruesome_tolerance: 2,
    horror_tolerance: 2,
    suspense_tolerance: 3,
    preferred_type: fallbackType,
  };

  const lovedLiked = ratings.filter((r) => r.media && (r.rating_value === "loved" || r.rating_value === "liked"));
  const hated = ratings.filter((r) => r.media && r.rating_value === "hated");

  for (const r of ratings) {
    if (!r.media || r.rating_value === "not_seen") continue;
    const w = RATING_WEIGHT[r.rating_value] * recencyWeight(r.rated_at);
    if (w === 0) continue;
    for (const g of r.media.genres) bump(w > 0 ? tp.favourite_genres : tp.disliked_genres, g, Math.abs(w));
    for (const t of r.media.themes) bump(w > 0 ? tp.favourite_themes : tp.disliked_themes, t, Math.abs(w));
    for (const c of r.media.cast_members) bump(w > 0 ? tp.favourite_cast : tp.disliked_cast, c, Math.abs(w));
  }

  [tp.favourite_genres, tp.disliked_genres] = reconcilePreferenceMaps(tp.favourite_genres, tp.disliked_genres);
  [tp.favourite_themes, tp.disliked_themes] = reconcilePreferenceMaps(tp.favourite_themes, tp.disliked_themes, {
    negativeDominance: 2.25,
  });
  [tp.favourite_cast, tp.disliked_cast] = reconcilePreferenceMaps(tp.favourite_cast, tp.disliked_cast);

  if (lovedLiked.length) {
    tp.preferred_complexity = avg(lovedLiked.map((r) => r.media!.complexity_level ?? 3));
    tp.preferred_smart_level = avg(lovedLiked.map((r) => r.media!.smart_level ?? 3));
    tp.preferred_mystery = avg(lovedLiked.map((r) => r.media!.mystery_level ?? 3));
    tp.preferred_world_building = avg(lovedLiked.map((r) => r.media!.world_building_level ?? 3));
    tp.preferred_emotional_depth = avg(lovedLiked.map((r) => r.media!.emotional_depth_level ?? 3));
    tp.preferred_twisted_plot = avg(lovedLiked.map((r) => r.media!.twisted_plot_level ?? 3));
    tp.gore_tolerance = avg(lovedLiked.map((r) => r.media!.gore_level ?? 1));
    tp.gruesome_tolerance = avg(lovedLiked.map((r) => r.media!.gruesome_visuals_level ?? 1));
    tp.horror_tolerance = avg(lovedLiked.map((r) => r.media!.horror_level ?? 1));
    tp.suspense_tolerance = avg(lovedLiked.map((r) => r.media!.suspense_level ?? 3));
  }

  // Strong negative pull from hated content
  for (const r of hated) {
    if (!r.media) continue;
    tp.gore_tolerance = Math.min(tp.gore_tolerance, (r.media.gore_level ?? 1) - 0.5);
    tp.gruesome_tolerance = Math.min(tp.gruesome_tolerance, (r.media.gruesome_visuals_level ?? 1) - 0.5);
    tp.horror_tolerance = Math.min(tp.horror_tolerance, (r.media.horror_level ?? 1) - 0.5);
  }

  // Type preference
  const movieScore = lovedLiked.filter((r) => r.media!.type === "movie").length;
  const tvScore = lovedLiked.filter((r) => r.media!.type === "tv").length;
  if (movieScore > tvScore * 1.5) tp.preferred_type = "movie";
  else if (tvScore > movieScore * 1.5) tp.preferred_type = "tv";

  return tp;
}

export function summariseProfile(tp: TasteProfile, ratingsCount: number): string {
  if (ratingsCount < 5) return "We're just getting to know your taste. Rate a few more titles to see your profile.";
  const topGenres = Object.entries(tp.favourite_genres).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
  const topThemes = Object.entries(tp.favourite_themes).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
  const dislikedGenres = Object.entries(tp.disliked_genres).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]);
  const parts: string[] = [];
  if (topGenres.length) parts.push(`gravitate toward ${topGenres.join(", ").toLowerCase()}`);
  if (topThemes.length) parts.push(`enjoy themes like ${topThemes.slice(0, 2).join(", ").toLowerCase()}`);
  if (tp.preferred_complexity >= 4) parts.push("prefer complex, layered stories");
  else if (tp.preferred_complexity <= 2.2) parts.push("prefer easy-watch, lighter stories");
  if (tp.preferred_mystery >= 4) parts.push("love mystery-driven plots");
  if (tp.preferred_world_building >= 4) parts.push("appreciate strong world-building");
  if (tp.gore_tolerance < 2) parts.push("avoid gore-heavy content");
  if (dislikedGenres.length) parts.push(`tend to skip ${dislikedGenres.join(" and ").toLowerCase()}`);
  return `You ${parts.join(", ")}.`;
}

export interface ScoredTitle {
  title: MediaTitle;
  score: number;
  reason: string;
  reasonTags: string[];
}

function uniqueSignals(signals: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const signal of signals) {
    const clean = signal.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }

  return out;
}

export function scoreCandidates(
  candidates: MediaTitle[],
  tp: TasteProfile,
  settings: UserSettings,
  ratedIds: Set<string>,
  skippedIds: Set<string>,
  streamableIds?: Set<string>,
): ScoredTitle[] {
  return candidates
    .filter((m) => !ratedIds.has(m.id) && !skippedIds.has(m.id))
    .filter((m) => {
      if (streamableIds && !streamableIds.has(m.id)) return false;
      if (settings.preferred_type !== "both" && m.type !== settings.preferred_type) return false;
      if (settings.hide_horror && (m.horror_level ?? 0) >= 4) return false;
      if (settings.hide_gore && (m.gore_level ?? 0) >= 4) return false;
      if (settings.hide_gruesome_visuals && (m.gruesome_visuals_level ?? 0) >= 4) return false;
      if (settings.hide_graphic_violence && (m.violence_level ?? 0) >= 4) return false;
      if (settings.hide_excessive_slaughter && m.content_warnings.some((w) => /slaughter|gore/i.test(w))) return false;
      if (settings.hide_pointless_suspense && (m.suspense_level ?? 0) >= 4 && (m.smart_level ?? 3) <= 2) return false;
      if (settings.minimum_rating && (m.rating ?? 0) < settings.minimum_rating) return false;
      return true;
    })
    .map((m) => {
      let score = 0;

      // Genre match
      let genreHit = 0;
      for (const g of m.genres) {
        const fav = tp.favourite_genres[g] ?? 0;
        const dis = tp.disliked_genres[g] ?? 0;
        score += fav * 0.8 - dis * 1.2;
        if (fav > 1.5) genreHit++;
      }

      // Theme match (deeper signal)
      let themeHit = 0;
      const matchedThemes: string[] = [];
      for (const t of m.themes) {
        const fav = tp.favourite_themes[t] ?? 0;
        const dis = tp.disliked_themes[t] ?? 0;
        score += fav * 1.3 - dis * 1.5;
        if (fav > 1) { themeHit++; matchedThemes.push(t); }
      }

      // Cast
      for (const c of m.cast_members) {
        score += (tp.favourite_cast[c] ?? 0) * 0.6 - (tp.disliked_cast[c] ?? 0) * 0.8;
      }

      // Smart-level / complexity match (penalise mismatch)
      score -= Math.abs((m.complexity_level ?? 3) - tp.preferred_complexity) * 0.6;
      score -= Math.abs((m.mystery_level ?? 3) - tp.preferred_mystery) * 0.5;
      score -= Math.abs((m.world_building_level ?? 3) - tp.preferred_world_building) * 0.4;
      score -= Math.abs((m.emotional_depth_level ?? 3) - tp.preferred_emotional_depth) * 0.3;
      score -= Math.abs((m.twisted_plot_level ?? 3) - tp.preferred_twisted_plot) * 0.3;

      // Content intensity penalties
      if ((m.gore_level ?? 1) > tp.gore_tolerance + 1) score -= ((m.gore_level ?? 1) - tp.gore_tolerance) * 2;
      if ((m.gruesome_visuals_level ?? 1) > tp.gruesome_tolerance + 1) score -= ((m.gruesome_visuals_level ?? 1) - tp.gruesome_tolerance) * 1.5;
      if ((m.horror_level ?? 1) > tp.horror_tolerance + 1) score -= ((m.horror_level ?? 1) - tp.horror_tolerance) * 1.5;

      // Recency preference
      const year = m.release_year ?? 2000;
      if (settings.prefer_newer_releases && year >= 2018) score += 1;
      if (!settings.include_older_classics && year < 1990) score -= 1;
      if (settings.prefer_complex_plots && (m.complexity_level ?? 0) >= 4) score += 1.4;
      if (settings.prefer_twisted_plots && (m.twisted_plot_level ?? 0) >= 4) score += 1.2;

      // External rating tiebreaker
      score += ((m.rating ?? 6) - 6) * 0.3;

      // Build recommendation signals
      const lovedExamples = Object.entries(tp.favourite_themes).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
      const reasonSignals: string[] = [];
      if (themeHit >= 2 && matchedThemes.length) {
        reasonSignals.push(...matchedThemes.slice(0, 3));
      } else if (genreHit >= 1) {
        const topG = m.genres.find((g) => (tp.favourite_genres[g] ?? 0) > 1.5);
        if (topG) reasonSignals.push(topG);
      }
      if ((m.mystery_level ?? 0) >= 4 && tp.preferred_mystery >= 3.5) reasonSignals.push("Mystery");
      if ((m.world_building_level ?? 0) >= 4 && tp.preferred_world_building >= 3.5) reasonSignals.push("World-building");
      if ((m.complexity_level ?? 0) >= 4 && tp.preferred_complexity >= 3.5) reasonSignals.push("Complex plot");
      if (settings.prefer_twisted_plots && (m.twisted_plot_level ?? 0) >= 4) reasonSignals.push("Twisty plot");
      if (settings.prefer_complex_plots && (m.complexity_level ?? 0) >= 4) reasonSignals.push("Dense story");
      if ((m.gore_level ?? 1) <= 2 && tp.gore_tolerance < 2.5) reasonSignals.push("Low gore");
      if (!reasonSignals.length && lovedExamples.length) reasonSignals.push(...lovedExamples);
      const reasonTags = uniqueSignals(reasonSignals).slice(0, 3);
      const reasonText = reasonTags.length ? "Recommended based on" : "Suggested as a new direction";

      return { title: m, score, reason: reasonText, reasonTags };
    })
    .sort((a, b) => b.score - a.score);
}
