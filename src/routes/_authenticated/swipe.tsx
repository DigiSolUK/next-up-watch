import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMediaTitles, useUserRatings, useUserSettings, useRateTitle, useAddToWatchlist, useLogEvent, useUserProfile, useWatchlist, useStreamingForTitles, useImportMoreTmdbTitles } from "@/hooks/use-nextup-data";
import { SwipeCard } from "@/components/SwipeCard";
import { RatingButtons } from "@/components/RatingButtons";
import { buildTasteProfile, scoreCandidates, stableTitleOrder } from "@/lib/recommend";
import type { MediaTitle, RatingValue, TasteProfile, UserSettings, WatchStatus } from "@/lib/types";
import { ArrowRight, Loader2, RefreshCcw, RotateCcw, Sparkles, SlidersHorizontal, Target } from "lucide-react";
import { toast } from "sonner";

const WATCHLIST_GOAL = 5;

export const Route = createFileRoute("/_authenticated/swipe")({
  head: () => ({ meta: [{ title: "Swipe - NextUp" }] }),
  component: SwipePage,
});

function isActiveWatchlistItem(status: WatchStatus) {
  return status === "want_to_watch" || status === "watching";
}

function SwipePage() {
  const { data: titles, isLoading: titlesLoading, isError: titlesError, error: titlesLoadError } = useMediaTitles();
  const { data: ratings, isLoading: ratingsLoading, isError: ratingsError, error: ratingsLoadError } = useUserRatings();
  const { data: settings, isLoading: settingsLoading, isError: settingsError, error: settingsLoadError } = useUserSettings();
  const { data: profile } = useUserProfile();
  const { data: watchlist } = useWatchlist();
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [catalogImportAttemptKey, setCatalogImportAttemptKey] = useState<string | null>(null);
  const [catalogImportResult, setCatalogImportResult] = useState<{ key: string; added: number; scanned: number } | null>(null);
  const [catalogImportError, setCatalogImportError] = useState<string | null>(null);

  const rate = useRateTitle();
  const addWatch = useAddToWatchlist();
  const logEvent = useLogEvent();
  const importMoreTitles = useImportMoreTmdbTitles();

  const ratedCount = (ratings ?? []).filter((r) => r.rating_value !== "not_seen").length;
  const threshold = settings?.learning_threshold ?? 50;
  const ready = (profile?.recommendation_ready ?? false) || ratedCount >= threshold;

  const ratedIdSet = useMemo(() => new Set((ratings ?? []).map((r) => r.media_title_id)), [ratings]);
  const watchlistIdSet = useMemo(() => new Set((watchlist ?? []).map((w) => w.media_title_id)), [watchlist]);
  const activeWatchlistCount = useMemo(
    () => (watchlist ?? []).filter((item) => isActiveWatchlistItem(item.status)).length,
    [watchlist],
  );
  const watchlistGoalReached = ready && activeWatchlistCount >= WATCHLIST_GOAL;
  const hiddenByHistoryIds = useMemo(() => new Set([...ratedIdSet, ...skippedIds, ...watchlistIdSet]), [ratedIdSet, skippedIds, watchlistIdSet]);
  const titleIds = useMemo(() => (titles ?? []).map((t) => t.id), [titles]);
  const streamingByTitle = useStreamingForTitles(titleIds, settings?.region ?? "GB", settings?.preferred_streaming_providers ?? []);
  const streamableIds = useMemo(() => {
    if (!settings?.preferred_streaming_providers.length) return undefined;
    return new Set(Object.keys(streamingByTitle.data ?? {}));
  }, [settings?.preferred_streaming_providers.length, streamingByTitle.data]);
  const freshCandidateCount = useMemo(
    () => (titles ?? []).filter((t) => !hiddenByHistoryIds.has(t.id)).length,
    [titles, hiddenByHistoryIds],
  );
  const availableFallbackTitles = useMemo(
    () => (titles ?? []).filter((t) => isFallbackCandidate(t, settings, ratedIdSet, watchlistIdSet, skippedIds, streamableIds)),
    [titles, settings, ratedIdSet, watchlistIdSet, skippedIds, streamableIds],
  );
  const activeFilterLabels = useMemo(() => buildActiveFilterLabels(settings ?? undefined), [settings]);
  const catalogImportKey = useMemo(
    () => `${titles?.length ?? 0}:${activeFilterLabels.join("|")}`,
    [titles?.length, activeFilterLabels],
  );

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
    if (watchlistGoalReached) return [];

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
    const personalized = scored.slice(0, 30).map((s) => ({ title: s.title, reason: s.reason }));
    const personalizedIds = new Set(personalized.map((item) => item.title.id));
    const fallback = stableTitleOrder(
      availableFallbackTitles.filter((title) => !personalizedIds.has(title.id)),
      `watchlist-goal-${ratedCount}-${activeWatchlistCount}`,
    )
      .slice(0, Math.max(0, 30 - personalized.length))
      .map((title) => ({
        title,
        reason: "A broader pick so you can keep building your watchlist.",
      }));

    return [...personalized, ...fallback];
  }, [
    titles,
    watchlistGoalReached,
    ratedIdSet,
    skippedIds,
    watchlistIdSet,
    hiddenByHistoryIds,
    ready,
    tasteProfile,
    settings,
    streamableIds,
    ratedCount,
    threshold,
    availableFallbackTitles,
    activeWatchlistCount,
  ]);

  const current = queue[0];
  const currentProviders = current ? streamingByTitle.data?.[current.title.id] : undefined;
  const busy = rate.isPending || addWatch.isPending || logEvent.isPending;
  const streamingFilterLoading = Boolean(settings?.preferred_streaming_providers.length && streamingByTitle.isLoading);
  const catalogImportExhausted = catalogImportResult?.key === catalogImportKey && catalogImportResult.added === 0;
  const catalogImportErrorMessage = catalogImportAttemptKey === catalogImportKey ? catalogImportError : null;

  const runCatalogImport = useCallback((manual = false) => {
    if (importMoreTitles.isPending) return;

    setCatalogImportAttemptKey(catalogImportKey);
    setCatalogImportError(null);
    importMoreTitles.mutate(undefined, {
      onSuccess: (result) => {
        setCatalogImportResult({ key: catalogImportKey, added: result.added, scanned: result.scanned });
        if (result.added > 0) {
          toast.success(`Added ${result.added} fresh TMDb picks.`);
        } else if (manual || queue.length === 0) {
          toast.info("TMDb did not find fresh matches for those filters yet.");
        }
      },
      onError: (error) => {
        const message = (error as Error).message;
        setCatalogImportError(message);
        toast.error(message);
      },
    });
  }, [catalogImportKey, importMoreTitles, queue.length]);

  useEffect(() => {
    if (!ready || watchlistGoalReached || titlesLoading || ratingsLoading || settingsLoading || streamingFilterLoading) return;
    if (queue.length > 3 || importMoreTitles.isPending) return;
    if (catalogImportAttemptKey === catalogImportKey) return;

    runCatalogImport(false);
  }, [
    catalogImportAttemptKey,
    catalogImportKey,
    importMoreTitles,
    queue.length,
    ratingsLoading,
    ready,
    settingsLoading,
    streamingFilterLoading,
    titlesLoading,
    watchlistGoalReached,
    runCatalogImport,
  ]);

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
        const nextCount = Math.min(WATCHLIST_GOAL, activeWatchlistCount + 1);
        toast.success(
          nextCount >= WATCHLIST_GOAL
            ? "Watchlist ready. Watch these, then come back for more."
            : `Added to watchlist (${nextCount}/${WATCHLIST_GOAL}).`,
        );
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
            ? watchlistGoalReached
              ? "Watch the titles on your list, then come back for more."
              : `Pick ${Math.max(0, WATCHLIST_GOAL - activeWatchlistCount)} more for your watchlist. Keep rating - NextUp keeps learning.`
            : `Training your taste profile: ${ratedCount} / ${threshold} rated`}
        </p>
        {ready ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${Math.min(100, (activeWatchlistCount / WATCHLIST_GOAL) * 100)}%` }}
            />
          </div>
        ) : (
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
          freshCandidateCount={freshCandidateCount}
          activeWatchlistCount={activeWatchlistCount}
          watchlistGoal={WATCHLIST_GOAL}
          goalReached={watchlistGoalReached}
          importingCatalog={importMoreTitles.isPending}
          catalogImportExhausted={catalogImportExhausted}
          catalogImportError={catalogImportErrorMessage}
          skippedCount={skippedIds.size}
          activeFilterLabels={activeFilterLabels}
          onImportMore={() => runCatalogImport(true)}
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
  freshCandidateCount,
  activeWatchlistCount,
  watchlistGoal,
  goalReached,
  importingCatalog,
  catalogImportExhausted,
  catalogImportError,
  skippedCount,
  activeFilterLabels,
  onImportMore,
  onRestoreSkipped,
}: {
  ready: boolean;
  ratedCount: number;
  threshold: number;
  totalTitles: number;
  freshCandidateCount: number;
  activeWatchlistCount: number;
  watchlistGoal: number;
  goalReached: boolean;
  importingCatalog: boolean;
  catalogImportExhausted: boolean;
  catalogImportError: string | null;
  skippedCount: number;
  activeFilterLabels: string[];
  onImportMore: () => void;
  onRestoreSkipped: () => void;
}) {
  const hasFilters = !goalReached && activeFilterLabels.length > 0;
  const canRestoreSkipped = skippedCount > 0;
  const progress = threshold > 0 ? Math.min(100, (ratedCount / threshold) * 100) : 0;
  const title = importingCatalog && ready && !goalReached
    ? "Finding more titles"
    : goalReached
    ? `You've got ${watchlistGoal} ready to watch`
    : catalogImportError && ready
      ? "Could not fetch more titles"
    : catalogImportExhausted && ready
      ? "No fresh matches for these filters"
    : ready
      ? "Find more titles"
      : "Keep rating to unlock recommendations";
  const message = importingCatalog && ready && !goalReached
    ? "NextUp is pulling in another batch from TMDb with posters, details, and GB streaming options."
    : goalReached
    ? "Your watchlist has enough to choose from. Watch a couple, mark them watched, then come back and NextUp will find the next batch."
    : catalogImportError && ready
      ? `${catalogImportError} Try again, or loosen provider and rating filters if the API keeps coming back empty.`
    : catalogImportExhausted && ready
      ? "TMDb checked the current filters but did not find fresh matches. Loosen provider or rating filters, restore skipped titles, or try again."
    : !ready
      ? totalTitles > 0
        ? `You're in learning mode and have rated ${ratedCount} of ${threshold} titles. A few more swipes will unlock the recommendation queue.`
        : "There isn't enough catalog data yet to build a learning queue."
      : freshCandidateCount > 0
        ? "Your remaining titles are blocked by stricter filters. Loosen them to keep building your watchlist."
        : "The local catalog is thin for your current filters. Pull another TMDb batch to keep building your watchlist.";

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {importingCatalog && ready && !goalReached ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : ready ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <Target className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {ready ? "Recommendation Mode" : "Learning Mode"}
          </p>
          <h3 className="mt-2 text-2xl font-bold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Active watchlist"
          value={`${Math.min(activeWatchlistCount, watchlistGoal)}/${watchlistGoal}`}
          note={goalReached ? "Ready for viewing" : `${Math.max(0, watchlistGoal - activeWatchlistCount)} more to pick`}
        />
        <StatCard
          label="Rated titles"
          value={String(ratedCount)}
          note={ready ? "Taste profile unlocked" : `${Math.round(progress)}% to recommendations`}
        />
        <StatCard
          label="Skipped"
          value={String(skippedCount)}
          note={canRestoreSkipped ? "Can be restored this session" : "Nothing skipped this session"}
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
        {!goalReached && ready && (
          <button
            type="button"
            onClick={onImportMore}
            disabled={importingCatalog}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importingCatalog ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            {catalogImportError ? "Try again" : "Find more titles"}
          </button>
        )}
        <Link
          to="/watchlist"
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            goalReached
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-border hover:bg-secondary"
          }`}
        >
          {goalReached ? "Watch from your list" : "View watchlist"}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {!goalReached && (
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            Open settings
            <SlidersHorizontal className="h-4 w-4" />
          </Link>
        )}
        {!goalReached && canRestoreSkipped && (
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
        {goalReached
          ? "When you mark something as watched, your active list drops below the goal and recommendations will open again."
          : importingCatalog && ready
            ? "Fresh titles will appear here automatically as soon as the import finishes."
          : ready
            ? "NextUp will keep offering broader picks until your active watchlist reaches five."
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

function isFallbackCandidate(
  title: MediaTitle,
  settings: UserSettings | undefined | null,
  ratedIdSet: Set<string>,
  watchlistIdSet: Set<string>,
  skippedIds: Set<string>,
  streamableIds?: Set<string>,
) {
  if (ratedIdSet.has(title.id) || watchlistIdSet.has(title.id) || skippedIds.has(title.id)) return false;
  if (!settings) return true;
  if (settings.preferred_type !== "both" && title.type !== settings.preferred_type) return false;
  if (settings.preferred_streaming_providers.length && !streamableIds?.has(title.id)) return false;
  if (settings.minimum_rating > 0 && (title.rating ?? 0) < settings.minimum_rating) return false;
  if (settings.hide_horror && (title.horror_level ?? 0) >= 4) return false;
  if (settings.hide_gore && (title.gore_level ?? 0) >= 4) return false;
  if (settings.hide_gruesome_visuals && (title.gruesome_visuals_level ?? 0) >= 4) return false;
  if (settings.hide_graphic_violence && (title.violence_level ?? 0) >= 4) return false;
  if (settings.hide_excessive_slaughter && title.content_warnings.some((warning) => /slaughter|gore/i.test(warning))) return false;
  if (settings.hide_pointless_suspense && (title.suspense_level ?? 0) >= 4 && (title.smart_level ?? 3) <= 2) return false;
  return true;
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
