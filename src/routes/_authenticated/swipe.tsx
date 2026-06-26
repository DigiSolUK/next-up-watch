import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMediaTitles, useUserRatings, useUserSettings, useStreamingForTitles, useRateTitle, useAddToWatchlist, useLogEvent, useUserProfile, useWatchlist } from "@/hooks/use-nextup-data";
import { SwipeCard } from "@/components/SwipeCard";
import { RatingButtons } from "@/components/RatingButtons";
import { buildTasteProfile, scoreCandidates } from "@/lib/recommend";
import type { MediaTitle, RatingValue, TasteProfile } from "@/lib/types";
import { Loader2, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/swipe")({
  head: () => ({ meta: [{ title: "Swipe — NextUp" }] }),
  component: SwipePage,
});

function SwipePage() {
  const { data: titles, isLoading: tLoading } = useMediaTitles();
  const { data: ratings, isLoading: rLoading } = useUserRatings();
  const { data: settings } = useUserSettings();
  const { data: profile } = useUserProfile();
  const { data: watchlist } = useWatchlist();
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const rate = useRateTitle();
  const addWatch = useAddToWatchlist();
  const logEvent = useLogEvent();

  const ratedCount = (ratings ?? []).filter((r) => r.rating_value !== "not_seen").length;
  const threshold = settings?.learning_threshold ?? 50;
  const ready = (profile?.recommendation_ready ?? false) || ratedCount >= threshold;

  const ratedIdSet = useMemo(() => new Set((ratings ?? []).map((r) => r.media_title_id)), [ratings]);
  const watchlistIdSet = useMemo(() => new Set((watchlist ?? []).map((w) => w.media_title_id)), [watchlist]);

  const titleMap = useMemo(() => {
    const m = new Map<string, MediaTitle>();
    for (const t of titles ?? []) m.set(t.id, t);
    return m;
  }, [titles]);

  const tasteProfile: TasteProfile | null = useMemo(() => {
    if (!ratings || !titles) return null;
    return buildTasteProfile(
      ratings.map((r) => ({ ...r, media: titleMap.get(r.media_title_id) ?? null })),
      settings?.preferred_type ?? "both",
    );
  }, [ratings, titles, titleMap, settings]);

  const queue: { title: MediaTitle; reason?: string }[] = useMemo(() => {
    if (!titles) return [];
    if (!ready) {
      // Learning mode: diverse mix of unrated titles
      const pool = titles.filter((t) => !ratedIdSet.has(t.id) && !skippedIds.has(t.id));
      // Spread genres - simple shuffle ordering by genre rotation
      const seen = new Set<string>();
      const ordered: MediaTitle[] = [];
      const rest: MediaTitle[] = [];
      for (const t of [...pool].sort(() => Math.random() - 0.5)) {
        const key = t.genres[0] ?? "_";
        if (!seen.has(key)) { seen.add(key); ordered.push(t); } else rest.push(t);
      }
      return [...ordered, ...rest].slice(0, 30).map((t) => ({ title: t }));
    }
    if (!tasteProfile || !settings) return [];
    const scored = scoreCandidates(titles, tasteProfile, settings, ratedIdSet, skippedIds);
    return scored.slice(0, 30).map((s) => ({ title: s.title, reason: s.reason }));
  }, [titles, ratedIdSet, skippedIds, ready, tasteProfile, settings]);

  const current = queue[0];
  const streaming = useStreamingForTitles(current ? [current.title.id] : []);

  if (tLoading || rLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const onRate = async (r: RatingValue) => {
    if (!current) return;
    try {
      await rate.mutateAsync({ mediaTitleId: current.title.id, rating: r, mode: ready ? "recommendation" : "learning" });
      if (r === "loved") toast.success("Noted — we'll find more like this.");
      else if (r === "hated") toast.message("Got it. Steering away from similar titles.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onAddWatchlist = async () => {
    if (!current) return;
    if (watchlistIdSet.has(current.title.id)) {
      toast.info("Already in your watchlist.");
    } else {
      await addWatch.mutateAsync(current.title.id);
      toast.success("Added to watchlist.");
    }
    setSkippedIds((s) => new Set(s).add(current.title.id));
  };

  const onNotInterested = async () => {
    if (!current) return;
    await logEvent.mutateAsync({ mediaTitleId: current.title.id, eventType: "marked_not_interested" });
    setSkippedIds((s) => new Set(s).add(current.title.id));
  };

  const onSkip = async () => {
    if (!current) return;
    await logEvent.mutateAsync({ mediaTitleId: current.title.id, eventType: "skipped" });
    setSkippedIds((s) => new Set(s).add(current.title.id));
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* Mode header */}
      <div className="mb-4 rounded-2xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-2">
          {ready ? <Sparkles className="h-4 w-4 text-primary" /> : <Target className="h-4 w-4 text-primary" />}
          <span className="text-sm font-bold">{ready ? "Recommendation Mode" : "Learning Mode"}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {ready
            ? "These are picked for you. Keep rating — NextUp keeps learning."
            : `Training your taste profile: ${ratedCount} / ${threshold} rated`}
        </p>
        {!ready && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${Math.min(100, (ratedCount / threshold) * 100)}%` }} />
          </div>
        )}
      </div>

      {!current ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h3 className="text-xl font-bold">You're all caught up</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready ? "Come back later for more recommendations. Or add more ratings to refine your taste." : "Add more titles to the catalog or rate more to unlock recommendations."}
          </p>
        </div>
      ) : (
        <SwipeCard
          title={current.title}
          providers={streaming.data?.[current.title.id]}
          reason={current.reason}
          onSwipeRight={() => onRate("loved")}
          onSwipeLeft={() => onRate("hated")}
          onSwipeUp={() => onRate("liked")}
          onSwipeDown={() => onRate("ok")}
        >
          <RatingButtons
            onRate={onRate}
            mode={ready ? "recommendation" : "learning"}
            onAddWatchlist={onAddWatchlist}
            onNotInterested={onNotInterested}
            onSkip={onSkip}
          />
        </SwipeCard>
      )}
    </div>
  );
}
