import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMediaTitles, useUserRatings, useUserSettings, useRateTitle, useAddToWatchlist, useLogEvent, useUserProfile, useWatchlist, useStreamingForTitles } from "@/hooks/use-nextup-data";
import { SwipeCard } from "@/components/SwipeCard";
import { RatingButtons } from "@/components/RatingButtons";
import { buildTasteProfile, scoreCandidates, stableTitleOrder } from "@/lib/recommend";
import type { MediaTitle, RatingValue, TasteProfile, UserSettings } from "@/lib/types";
import { ArrowRight, Loader2, RotateCcw, Sparkles, SlidersHorizontal, Target } from "lucide-react";
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
  const hiddenByHistoryIds = useMemo(() => new Set([...ratedIdSet, ...skippedIds, ...watchlistIdSet]), [ratedIdSet, skippedIds, watchlistIdSet]);
  const titleIds = useMemo(() => (titles ?? []).map((t) => t.id), [titles]);
  const streamingByTitle = useStreamingForTitles(titleIds, settings?.region ?? "GB", settings?.preferred_streaming_providers ?? []);
  const remainingTitles = useMemo(() => (titles ?? []).filter((t) => !hiddenByHistoryIds.has(t.id)), [titles, hiddenByHistoryIds]);
  const activeFilterLabels = useMemo(() => buildActiveFilterLabels(settings ?? undefined), [settings]);

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
    if (!ready) {
      const pool = titles.filter((t) => !hiddenByHistoryIds.has(t.id));
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
  }, [titles, ratedIdSet, skippedIds, watchlistIdSet, hiddenByHistoryIds, ready, tasteProfile, settings, streamableIds, ratedCount, threshold]);

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
        <QueueEmptyState
          ready={ready}
          ratedCount={ratedCount}
          threshold={threshold}
          totalTitles={titles?.length ?? 0}
          remainingCount={remainingTitles.length}
          skippedCount={skippedIds.size}
          watchlistCount={watchlistIdSet.size}
          activeFilterLabels={activeFilterLabels}
          onRestoreSkipped={() => {
            setSkippedIds(new Set());
            toast.info("Skipped titles are back in the queue.");
          }}
        />
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

function QueueEmptyState({
  ready,
  ratedCount,
  threshold,
  totalTitles,
  remainingCount,
  skippedCount,
  watchlistCount,
  activeFilterLabels,
  onRestoreSkipped,
}: {
  ready: boolean;
  ratedCount: number;
  threshold: number;
  totalTitles: number;
  remainingCount: number;
  skippedCount: number;
  watchlistCount: number;
  activeFilterLabels: string[];
  onRestoreSkipped: () => void;
}) {
  const hasFilters = activeFilterLabels.length > 0;
  const canRestoreSkipped = skippedCount > 0;
  const progress = threshold > 0 ? Math.min(100, (ratedCount / threshold) * 100) : 0;
  const message = !ready
    ? totalTitles > 0
      ? `You're in learning mode and have rated ${ratedCount} of ${threshold} titles. A few more swipes will unlock the recommendation queue.`
      : "There isn't enough catalog data yet to build a learning queue."
    : remainingCount > 0
      ? "There are still titles in the catalog, but your current settings and watch history are filtering them all out."
      : "You've already rated, saved, or skipped everything in the current catalog.";

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {ready ? <Sparkles className="h-5 w-5" /> : <Target className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {ready ? "Recommendation Mode" : "Learning Mode"}
          </p>
          <h3 className="mt-2 text-2xl font-bold">
            {ready ? "You're all caught up" : "Keep rating to unlock recommendations"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label={ready ? "Remaining in catalog" : "Progress to unlock"}
          value={ready ? String(remainingCount) : `${ratedCount}/${threshold}`}
          note={ready ? "Still hidden by your filters" : `${Math.round(progress)}% complete`}
        />
        <StatCard
          label="Watchlist"
          value={String(watchlistCount)}
          note="Saved titles stay out of the swipe queue"
        />
        <StatCard
          label="Skipped this session"
          value={String(skippedCount)}
          note={canRestoreSkipped ? "You can bring these back" : "Nothing skipped yet"}
        />
      </div>

      {hasFilters && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current filters</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilterLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-border bg-secondary/70 px-3 py-1 text-xs font-medium text-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open settings
          <SlidersHorizontal className="h-4 w-4" />
        </Link>
        <Link
          to="/watchlist"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          View watchlist
          <ArrowRight className="h-4 w-4" />
        </Link>
        {ready && canRestoreSkipped && (
          <button
            type="button"
            onClick={onRestoreSkipped}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            Restore skipped titles
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {ready
          ? "If things still feel sparse after loosening filters, a few more ratings will make the next batch sharper."
          : "Once you hit the unlock threshold, we switch from learning your taste to serving recommendations."}
      </p>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function buildActiveFilterLabels(settings: UserSettings | undefined): string[] {
  if (!settings) return [];

  const labels: string[] = [];
  if (settings.preferred_type !== "both") labels.push(settings.preferred_type === "movie" ? "Movies only" : "TV only");
  if (settings.preferred_streaming_providers.length) {
    const providers = settings.preferred_streaming_providers;
    labels.push(providers.length > 2 ? `${providers.slice(0, 2).join(", ")} +${providers.length - 2} more` : providers.join(", "));
  }
  if (settings.region) labels.push(`Region ${settings.region}`);
  if (settings.minimum_rating > 0) labels.push(`Min rating ${settings.minimum_rating.toFixed(1)}`);

  const toggles: Array<[boolean, string]> = [
    [settings.hide_horror, "Hide horror"],
    [settings.hide_gore, "Hide gore"],
    [settings.hide_graphic_violence, "Hide violence"],
    [settings.hide_gruesome_visuals, "Hide gruesome visuals"],
    [settings.hide_excessive_slaughter, "Hide slaughter"],
    [settings.hide_pointless_suspense, "Hide suspense"],
    [settings.prefer_complex_plots, "Prefer complex plots"],
    [settings.prefer_twisted_plots, "Prefer twisted plots"],
    [settings.prefer_newer_releases, "Prefer newer releases"],
    [settings.include_older_classics, "Include older classics"],
  ];

  for (const [enabled, label] of toggles) {
    if (enabled) labels.push(label);
  }

  return labels;
}
