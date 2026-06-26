import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMediaTitles, useUserRatings, useUserSettings, useRateTitle, useAddToWatchlist, useLogEvent, useUserProfile, useWatchlist, useStreamingForTitles } from "@/hooks/use-nextup-data";
import { SwipeCard } from "@/components/SwipeCard";
import { RatingButtons } from "@/components/RatingButtons";
import { buildTasteProfile, scoreCandidates, stableTitleOrder } from "@/lib/recommend";
import type { MediaTitle, RatingValue, TasteProfile } from "@/lib/types";
import { Loader2, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/swipe")({
  head: () => ({ meta: [{ title: "Swipe - NextUp" }] }),
  component: SwipePage,
});

function SwipePage() {
  const { data: titles, isLoading: titlesLoading, isError: titlesError, error: titlesLoadError } = useMediaTitles();
  const { data: ratings, isLoading: ratingsLoading, isError: ratingsError, error: ratingsLoadError } = useUserRatings();
  const { data: settings, isLoading: settingsLoading, isError: settingsError, error: settingsLoadError } = useUserSettings();
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
  const titleIds = useMemo(() => (titles ?? []).map((t) => t.id), [titles]);
  const streamingByTitle = useStreamingForTitles(titleIds, settings?.region ?? "GB", settings?.preferred_streaming_providers ?? []);

  const streamableIds = useMemo(() => {
    if (!settings?.preferred_streaming_providers.length) return undefined;
    return new Set(Object.keys(streamingByTitle.data ?? {}));
  }, [settings?.preferred_streaming_providers.length, streamingByTitle.data]);

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
    const excludedIds = new Set([...ratedIdSet, ...skippedIds, ...watchlistIdSet]);

    if (!ready) {
      const pool = titles.filter((t) => !excludedIds.has(t.id));
      const seen = new Set<string>();
      const ordered: MediaTitle[] = [];
      const rest: MediaTitle[] = [];

      for (const t of stableTitleOrder(pool, `${ratedCount}-${threshold}`)) {
        const key = t.genres[0] ?? "_";
        if (!seen.has(key)) {
          seen.add(key);
          ordered.push(t);
        } else {
          rest.push(t);
        }
      }

      return [...ordered, ...rest].slice(0, 30).map((t) => ({ title: t }));
    }

    if (!tasteProfile || !settings) return [];
    const scored = scoreCandidates(
      titles,
      tasteProfile,
      settings,
      ratedIdSet,
      new Set([...skippedIds, ...watchlistIdSet]),
      streamableIds,
    );
    return scored.slice(0, 30).map((s) => ({ title: s.title, reason: s.reason }));
  }, [titles, ratedIdSet, skippedIds, watchlistIdSet, ready, tasteProfile, settings, streamableIds, ratedCount, threshold]);

  const current = queue[0];
  const currentProviders = current ? streamingByTitle.data?.[current.title.id] : undefined;
  const busy = rate.isPending || addWatch.isPending || logEvent.isPending;

  if (titlesLoading || ratingsLoading || settingsLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (titlesError || ratingsError || settingsError) {
    const message = (titlesLoadError ?? ratingsLoadError ?? settingsLoadError)?.message ?? "Could not load NextUp.";
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Could not load your swipe queue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  const advanceCurrent = () => {
    if (!current) return;
    setSkippedIds((s) => new Set(s).add(current.title.id));
  };

  const onRate = async (rating: RatingValue) => {
    if (!current || busy) return;
    try {
      await rate.mutateAsync({ mediaTitleId: current.title.id, rating, mode: ready ? "recommendation" : "learning" });
      advanceCurrent();
      if (rating === "loved") toast.success("Noted - we'll find more like this.");
      else if (rating === "hated") toast.message("Got it. Steering away from similar titles.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onAddWatchlist = async () => {
    if (!current || busy) return;
    try {
      if (watchlistIdSet.has(current.title.id)) {
        toast.info("Already in your watchlist.");
      } else {
        await addWatch.mutateAsync(current.title.id);
        toast.success("Added to watchlist.");
      }
      advanceCurrent();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onNotInterested = async () => {
    if (!current || busy) return;
    try {
      await logEvent.mutateAsync({ mediaTitleId: current.title.id, eventType: "marked_not_interested" });
      advanceCurrent();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onSkip = async () => {
    if (!current || busy) return;
    try {
      await logEvent.mutateAsync({ mediaTitleId: current.title.id, eventType: "skipped" });
      advanceCurrent();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 rounded-2xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-2">
          {ready ? <Sparkles className="h-4 w-4 text-primary" /> : <Target className="h-4 w-4 text-primary" />}
          <span className="text-sm font-bold">{ready ? "Recommendation Mode" : "Learning Mode"}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {ready
            ? "These are picked for you. Keep rating - NextUp keeps learning."
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
            {ready ? "Come back later for more recommendations, or loosen your settings filters." : "Seed more catalog titles or lower the learning threshold to unlock recommendations sooner."}
          </p>
        </div>
      ) : (
        <SwipeCard
          title={current.title}
          providers={currentProviders}
          reason={current.reason}
          disabled={busy}
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
            disabled={busy}
          />
        </SwipeCard>
      )}
    </div>
  );
}
