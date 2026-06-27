import type { RatingValue } from "@/lib/types";
import { Heart, ThumbsUp, Meh, ThumbsDown, EyeOff, BookmarkPlus, X, SkipForward } from "lucide-react";

interface Props {
  onRate: (r: RatingValue) => void;
  mode?: "learning" | "recommendation";
  onAddWatchlist?: () => void;
  onNotInterested?: () => void;
  onSkip?: () => void;
  disabled?: boolean;
}

const base =
  "flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-50";

export function RatingButtons({ onRate, mode = "learning", onAddWatchlist, onNotInterested, onSkip, disabled = false }: Props) {
  return (
    <div className="space-y-2">
      {mode === "recommendation" && (
        <button
          disabled={disabled || !onAddWatchlist}
          aria-label="Add to watchlist"
          onClick={onAddWatchlist}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--watchlist)] px-4 py-3 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-50"
        >
          <BookmarkPlus className="h-5 w-5" />
          <span>Add to watchlist</span>
        </button>
      )}
      <div className="grid grid-cols-5 gap-2">
        <button disabled={disabled} aria-label="Rate as loved" onClick={() => onRate("loved")} className={`${base} bg-[color:var(--loved)]`}>
          <Heart className="h-5 w-5" /><span>Loved</span>
        </button>
        <button disabled={disabled} aria-label="Rate as liked" onClick={() => onRate("liked")} className={`${base} bg-[color:var(--liked)]`}>
          <ThumbsUp className="h-5 w-5" /><span>Liked</span>
        </button>
        <button disabled={disabled} aria-label="Rate as okay" onClick={() => onRate("ok")} className={`${base} bg-[color:var(--ok)]`}>
          <Meh className="h-5 w-5" /><span>OK</span>
        </button>
        <button disabled={disabled} aria-label="Rate as hated" onClick={() => onRate("hated")} className={`${base} bg-[color:var(--hated)]`}>
          <ThumbsDown className="h-5 w-5" /><span>Hated</span>
        </button>
        <button disabled={disabled} aria-label="Mark as not seen" onClick={() => onRate("not_seen")} className={`${base} bg-[color:var(--notseen)]`}>
          <EyeOff className="h-5 w-5" /><span>Not seen</span>
        </button>
      </div>
      {mode === "recommendation" && (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={disabled || !onNotInterested} aria-label="Mark not interested" onClick={onNotInterested} className={`${base} bg-muted text-foreground`}>
            <X className="h-5 w-5" /><span>Not now</span>
          </button>
          <button disabled={disabled || !onSkip} aria-label="Skip this title" onClick={onSkip} className={`${base} bg-muted text-foreground`}>
            <SkipForward className="h-5 w-5" /><span>Skip</span>
          </button>
        </div>
      )}
    </div>
  );
}
