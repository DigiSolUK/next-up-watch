import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookmarkPlus, Heart, Loader2, Meh, ThumbsDown, ThumbsUp, EyeOff } from "lucide-react";
import { toast } from "sonner";

import {
  useAddToWatchlist,
  useMediaTitles,
  useRateTitle,
  useUserRatings,
  useWatchlist,
} from "@/hooks/use-nextup-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaTitle, RatingValue } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/profile/ratings/$rating")({
  head: () => ({ meta: [{ title: "Rated Titles - NextUp" }] }),
  component: RatingCategoryPage,
});

const RATING_CONFIG: Record<RatingValue, { label: string; empty: string; tone: string }> = {
  hated: {
    label: "Hated",
    empty: "Titles you hate will appear here after you rate them.",
    tone: "var(--hated)",
  },
  ok: {
    label: "OK",
    empty: "Titles you rate OK will appear here.",
    tone: "var(--ok)",
  },
  not_seen: {
    label: "Not seen",
    empty: "Titles you mark as not seen will appear here.",
    tone: "var(--notseen)",
  },
  liked: {
    label: "Liked",
    empty: "Titles you like will appear here after you rate them.",
    tone: "var(--liked)",
  },
  loved: {
    label: "Loved",
    empty: "Titles you love will appear here after you rate them.",
    tone: "var(--loved)",
  },
};

const RATING_ACTIONS: Array<{ value: RatingValue; label: string; icon: typeof ThumbsDown; className: string }> = [
  { value: "hated", label: "Hated", icon: ThumbsDown, className: "bg-[color:var(--hated)]" },
  { value: "ok", label: "OK", icon: Meh, className: "bg-[color:var(--ok)]" },
  { value: "not_seen", label: "Not seen", icon: EyeOff, className: "bg-[color:var(--notseen)]" },
  { value: "liked", label: "Liked", icon: ThumbsUp, className: "bg-[color:var(--liked)]" },
  { value: "loved", label: "Loved", icon: Heart, className: "bg-[color:var(--loved)]" },
];

function isRatingValue(value: string): value is RatingValue {
  return value in RATING_CONFIG;
}

function RatingCategoryPage() {
  const { rating } = Route.useParams();
  const config = isRatingValue(rating) ? RATING_CONFIG[rating] : null;
  const { data: ratings, isLoading: ratingsLoading } = useUserRatings();
  const { data: titles, isLoading: titlesLoading } = useMediaTitles();
  const { data: watchlist } = useWatchlist();
  const rate = useRateTitle();
  const addWatch = useAddToWatchlist();
  const [selected, setSelected] = useState<MediaTitle | null>(null);

  const titleMap = useMemo(() => new Map((titles ?? []).map((title) => [title.id, title])), [titles]);
  const activeWatchlistIds = useMemo(
    () => new Set((watchlist ?? []).filter((item) => item.status !== "removed").map((item) => item.media_title_id)),
    [watchlist],
  );
  const ratedTitles = useMemo(() => {
    if (!config) return [];
    return (ratings ?? [])
      .filter((item) => item.rating_value === rating)
      .map((item) => titleMap.get(item.media_title_id))
      .filter((title): title is MediaTitle => Boolean(title));
  }, [config, rating, ratings, titleMap]);

  const busy = rate.isPending || addWatch.isPending;

  const changeRating = async (nextRating: RatingValue) => {
    if (!selected || busy) return;
    try {
      await rate.mutateAsync({
        mediaTitleId: selected.id,
        rating: nextRating,
        mode: "retaste",
      });
      toast.success(`Moved to ${RATING_CONFIG[nextRating].label}.`);
      setSelected(null);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const addToWatchlist = async () => {
    if (!selected || busy) return;
    try {
      if (activeWatchlistIds.has(selected.id)) {
        toast.info("Already in your watchlist.");
        return;
      }
      await addWatch.mutateAsync(selected.id);
      toast.success("Added to watchlist.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (!config) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Rating category not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a valid Taste category to review your rated titles.</p>
        <Link
          to="/profile"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Taste
        </Link>
      </div>
    );
  }

  if (ratingsLoading || titlesLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 md:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/profile" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
            Taste profile
          </Link>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl" style={{ color: config.tone }}>
            {config.label}
          </h1>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold">{ratedTitles.length}</span>
      </div>

      {ratedTitles.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-bold">Nothing here yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">{config.empty}</p>
          <Link
            to="/swipe"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Rate more titles
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {ratedTitles.map((title) => (
            <button
              key={title.id}
              type="button"
              onClick={() => setSelected(title)}
              className="group min-w-0 text-left"
            >
              <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted">
                {title.poster_url ? (
                  <img
                    src={title.poster_url}
                    alt={title.title}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary text-4xl font-bold text-muted-foreground">
                    {title.title[0]}
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">{title.title}</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-border bg-card p-4">
          {selected && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>Change rating or add this title to your watchlist.</DialogDescription>
              </DialogHeader>
              <div className="mx-auto aspect-[2/3] w-full max-w-52 overflow-hidden rounded-2xl bg-muted">
                {selected.poster_url ? (
                  <img src={selected.poster_url} alt={selected.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary text-5xl font-bold text-muted-foreground">
                    {selected.title[0]}
                  </div>
                )}
              </div>
              <h2 className="text-center text-lg font-bold leading-tight">{selected.title}</h2>
              <button
                type="button"
                disabled={busy}
                onClick={addToWatchlist}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--watchlist)] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {addWatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
                Add to watchlist
              </button>
              <div className="grid grid-cols-5 gap-1.5">
                {RATING_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.value}
                      type="button"
                      disabled={busy}
                      onClick={() => changeRating(action.value)}
                      className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${action.className}`}
                    >
                      {rate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
