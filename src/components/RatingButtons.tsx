import type { RatingValue } from "@/lib/types";
import { Heart, ThumbsUp, Meh, ThumbsDown, EyeOff, BookmarkPlus, SkipForward } from "lucide-react";

interface Props {
  onRate: (r: RatingValue) => void;
  mode?: "learning" | "recommendation";
  onAddWatchlist?: () => void;
  onSkip?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

const base =
  "flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-50";

const compactBase =
  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight text-white transition-transform active:scale-95 disabled:opacity-50";

export function RatingButtons({ onRate, mode = "learning", onAddWatchlist, onSkip, disabled = false, compact = false }: Props) {
  const buttonBase = compact ? compactBase : base;
  const iconClass = compact ? "h-4 w-4" : "h-5 w-5";
  const watchlistButtonBase = compact
    ? "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg bg-[color:var(--watchlist)] px-1 py-1 text-[10px] font-semibold leading-tight text-white transition-transform active:scale-95 disabled:opacity-50"
    : "flex flex-col items-center justify-center gap-1 rounded-xl bg-[color:var(--watchlist)] p-3 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-50";

  return (
    <div className={compact ? "space-y-1 md:space-y-2" : "space-y-2"}>
      <div className={compact ? "grid grid-cols-5 gap-1 md:gap-2" : "grid grid-cols-5 gap-2"}>
        <button disabled={disabled} aria-label="Rate as hated" onClick={() => onRate("hated")} className={`${buttonBase} bg-[color:var(--hated)]`}>
          <ThumbsDown className={iconClass} /><span>Hated</span>
        </button>
        <button disabled={disabled} aria-label="Rate as okay" onClick={() => onRate("ok")} className={`${buttonBase} bg-[color:var(--ok)]`}>
          <Meh className={iconClass} /><span>OK</span>
        </button>
        <button disabled={disabled} aria-label="Mark as not seen" onClick={() => onRate("not_seen")} className={`${buttonBase} bg-[color:var(--notseen)]`}>
          <EyeOff className={iconClass} /><span>Not seen</span>
        </button>
        <button disabled={disabled} aria-label="Rate as liked" onClick={() => onRate("liked")} className={`${buttonBase} bg-[color:var(--liked)]`}>
          <ThumbsUp className={iconClass} /><span>Liked</span>
        </button>
        <button disabled={disabled} aria-label="Rate as loved" onClick={() => onRate("loved")} className={`${buttonBase} bg-[color:var(--loved)]`}>
          <Heart className={iconClass} /><span>Loved</span>
        </button>
      </div>
      {mode === "recommendation" && (
        <div className={compact ? "grid grid-cols-2 gap-1 md:gap-2" : "grid grid-cols-2 gap-2"}>
          <button disabled={disabled || !onAddWatchlist} aria-label="Add to watchlist" onClick={onAddWatchlist} className={watchlistButtonBase}>
            <BookmarkPlus className={iconClass} /><span>Add to watchlist</span>
          </button>
          <button disabled={disabled || !onSkip} aria-label="Skip this title" onClick={onSkip} className={`${buttonBase} bg-muted text-foreground`}>
            <SkipForward className={iconClass} /><span>Skip</span>
          </button>
        </div>
      )}
    </div>
  );
}
