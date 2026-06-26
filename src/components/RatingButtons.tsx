import type { RatingValue } from "@/lib/types";
import { Heart, ThumbsUp, Meh, ThumbsDown, EyeOff, BookmarkPlus, X, SkipForward } from "lucide-react";

interface Props {
  onRate: (r: RatingValue) => void;
  mode?: "learning" | "recommendation";
  onAddWatchlist?: () => void;
  onNotInterested?: () => void;
  onSkip?: () => void;
}

const base =
  "flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-50";

export function RatingButtons({ onRate, mode = "learning", onAddWatchlist, onNotInterested, onSkip }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        <button onClick={() => onRate("loved")} className={`${base} bg-[color:var(--loved)]`}>
          <Heart className="h-5 w-5" /><span>Loved</span>
        </button>
        <button onClick={() => onRate("liked")} className={`${base} bg-[color:var(--liked)]`}>
          <ThumbsUp className="h-5 w-5" /><span>Liked</span>
        </button>
        <button onClick={() => onRate("ok")} className={`${base} bg-[color:var(--ok)]`}>
          <Meh className="h-5 w-5" /><span>OK</span>
        </button>
        <button onClick={() => onRate("hated")} className={`${base} bg-[color:var(--hated)]`}>
          <ThumbsDown className="h-5 w-5" /><span>Hated</span>
        </button>
        <button onClick={() => onRate("not_seen")} className={`${base} bg-[color:var(--notseen)]`}>
          <EyeOff className="h-5 w-5" /><span>Not seen</span>
        </button>
      </div>
      {mode === "recommendation" && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onAddWatchlist} className={`${base} bg-[color:var(--watchlist)]`}>
            <BookmarkPlus className="h-5 w-5" /><span>Watchlist</span>
          </button>
          <button onClick={onNotInterested} className={`${base} bg-muted text-foreground`}>
            <X className="h-5 w-5" /><span>Not now</span>
          </button>
          <button onClick={onSkip} className={`${base} bg-muted text-foreground`}>
            <SkipForward className="h-5 w-5" /><span>Skip</span>
          </button>
        </div>
      )}
    </div>
  );
}
