import { useState, useRef, type ReactNode } from "react";
import type { MediaTitle } from "@/lib/types";
import { ContentBadges } from "./ContentBadges";
import { StreamingProviders } from "./StreamingProviders";
import { Star, Film, Tv } from "lucide-react";

interface Props {
  title: MediaTitle;
  providers?: { provider_name: string; availability_type: string; watch_url: string | null }[];
  reason?: string;
  onSwipeLeft?: () => void;   // hated
  onSwipeRight?: () => void;  // loved
  onSwipeUp?: () => void;     // liked
  onSwipeDown?: () => void;   // ok
  children?: ReactNode;       // action buttons row
}

export function SwipeCard({ title, providers, reason, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, children }: Props) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    setDrag((d) => ({ ...d, x: e.clientX - startRef.current!.x, y: e.clientY - startRef.current!.y, active: true }));
  };
  const onPointerUp = () => {
    if (!startRef.current) return;
    const { x, y } = drag;
    const TH = 100;
    if (Math.abs(x) > Math.abs(y)) {
      if (x > TH) onSwipeRight?.();
      else if (x < -TH) onSwipeLeft?.();
    } else {
      if (y < -TH) onSwipeUp?.();
      else if (y > TH) onSwipeDown?.();
    }
    startRef.current = null;
    setDrag({ x: 0, y: 0, active: false });
  };

  const rotate = drag.x * 0.06;
  const intent =
    drag.x > 60 ? "loved" : drag.x < -60 ? "hated" : drag.y < -60 ? "liked" : drag.y > 60 ? "ok" : null;

  return (
    <div
      className="relative mx-auto w-full max-w-md select-none touch-none"
      style={{
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotate}deg)`,
        transition: drag.active ? "none" : "transform 250ms cubic-bezier(.2,.8,.2,1)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="relative aspect-[2/3] w-full bg-muted">
          {title.poster_url && !imgError ? (
            <img
              src={title.poster_url}
              alt={title.title}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-card text-6xl font-bold text-muted-foreground">
              {title.title[0]}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-white/80">
              {title.type === "movie" ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
              <span>{title.type === "movie" ? "Movie" : "TV Series"}</span>
              {title.release_year && <span>· {title.release_year}</span>}
              {title.rating != null && (
                <span className="ml-auto inline-flex items-center gap-0.5 rounded-md bg-black/40 px-1.5 py-0.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {title.rating.toFixed(1)}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold leading-tight text-white">{title.title}</h2>
          </div>
          {intent && (
            <div
              className={`pointer-events-none absolute left-4 top-4 rounded-lg border-4 px-3 py-1 text-2xl font-black uppercase tracking-wider ${
                intent === "loved" ? "border-[color:var(--loved)] text-[color:var(--loved)]" :
                intent === "hated" ? "rotate-12 border-[color:var(--hated)] text-[color:var(--hated)]" :
                intent === "liked" ? "border-[color:var(--liked)] text-[color:var(--liked)]" :
                                    "border-[color:var(--ok)] text-[color:var(--ok)]"
              }`}
            >
              {intent === "loved" ? "LOVED" : intent === "hated" ? "HATED" : intent === "liked" ? "LIKED" : "OK"}
            </div>
          )}
        </div>
        <div className="space-y-3 p-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">{title.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {title.genres.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{g}</span>
            ))}
          </div>
          <ContentBadges title={title} />
          {title.cast_members.length > 0 && (
            <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Cast:</span> {title.cast_members.slice(0, 3).join(", ")}</p>
          )}
          {providers && (
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">Where to watch</p>
              <StreamingProviders providers={providers} />
            </div>
          )}
          {reason && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-xs italic text-primary-foreground/90">{reason}</p>
          )}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
