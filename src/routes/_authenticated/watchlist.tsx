import { createFileRoute } from "@tanstack/react-router";
import { useMediaTitles, useWatchlist, useUpdateWatchlistStatus, useStreamingForTitles, useRateTitle } from "@/hooks/use-nextup-data";
import { StreamingProviders } from "@/components/StreamingProviders";
import { Loader2, Check, Eye, Trash2, Heart, ThumbsUp, Meh, ThumbsDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MediaTitle, RatingValue, WatchStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — NextUp" }] }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { data: titles, isLoading: titlesLoading } = useMediaTitles();
  const { data: items, isLoading } = useWatchlist();
  const update = useUpdateWatchlistStatus();
  const rate = useRateTitle();
  const titleMap = new Map<string, MediaTitle>((titles ?? []).map((t) => [t.id, t]));
  const ids = (items ?? []).map((i) => i.media_title_id);
  const streaming = useStreamingForTitles(ids);
  const [askRating, setAskRating] = useState<string | null>(null);

  const busy = update.isPending || rate.isPending;

  if (isLoading || titlesLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Your watchlist is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add titles from the swipe screen in Recommendation Mode.</p>
      </div>
    );
  }

  const setStatus = async (mediaTitleId: string, status: WatchStatus) => {
    try {
      await update.mutateAsync({ mediaTitleId, status });
      if (status === "watched") setAskRating(mediaTitleId);
      else toast.success("Updated.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const ratePost = async (mediaTitleId: string, r: RatingValue) => {
    try {
      await rate.mutateAsync({ mediaTitleId, rating: r, mode: "watchlist_followup" });
      setAskRating(null);
      toast.success("Thanks - that'll improve future picks.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track what you want to watch, are watching, and what you've finished.</p>
      <ul className="mt-6 space-y-3">
        {items.map((item) => {
          const t = titleMap.get(item.media_title_id);
          if (!t) return null;
          const providers = streaming.data?.[t.id] ?? [];
          return (
            <li key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex gap-3 p-3">
                <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  {t.poster_url ? <img src={t.poster_url} alt={t.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold leading-tight">{t.title}</h3>
                      <p className="text-xs text-muted-foreground">{t.type === "movie" ? "Movie" : "TV"} · {t.release_year}</p>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">{item.status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.genres.slice(0, 3).map((g) => (
                      <span key={g} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{g}</span>
                    ))}
                  </div>
                  <div className="mt-2"><StreamingProviders providers={providers} /></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.status !== "watching" && (
                      <button disabled={busy} onClick={() => setStatus(t.id, "watching")} className="rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium hover:bg-secondary/80 disabled:opacity-60"><Eye className="mr-1 inline h-3 w-3" />Watching</button>
                    )}
                    {item.status !== "watched" && (
                      <button disabled={busy} onClick={() => setStatus(t.id, "watched")} className="rounded-md bg-[color:var(--liked)] px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"><Check className="mr-1 inline h-3 w-3" />Watched</button>
                    )}
                    <button disabled={busy} onClick={() => setStatus(t.id, "removed")} className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium hover:bg-muted/70 disabled:opacity-60"><Trash2 className="mr-1 inline h-3 w-3" />Remove</button>
                  </div>

                  {askRating === t.id && (
                    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <p className="text-xs font-semibold">How was it?</p>
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        <button disabled={busy} onClick={() => ratePost(t.id, "loved")} className="flex flex-col items-center rounded-md bg-[color:var(--loved)] p-1.5 text-[10px] font-semibold text-white disabled:opacity-60"><Heart className="h-4 w-4" />Loved</button>
                        <button disabled={busy} onClick={() => ratePost(t.id, "liked")} className="flex flex-col items-center rounded-md bg-[color:var(--liked)] p-1.5 text-[10px] font-semibold text-white disabled:opacity-60"><ThumbsUp className="h-4 w-4" />Liked</button>
                        <button disabled={busy} onClick={() => ratePost(t.id, "ok")} className="flex flex-col items-center rounded-md bg-[color:var(--ok)] p-1.5 text-[10px] font-semibold text-white disabled:opacity-60"><Meh className="h-4 w-4" />OK</button>
                        <button disabled={busy} onClick={() => ratePost(t.id, "hated")} className="flex flex-col items-center rounded-md bg-[color:var(--hated)] p-1.5 text-[10px] font-semibold text-white disabled:opacity-60"><ThumbsDown className="h-4 w-4" />Hated</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

