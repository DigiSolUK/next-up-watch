import { useEffect, useState, useRef, type ReactNode } from "react";
import type { MediaTitle, StreamingProvider } from "@/lib/types";
import { ContentBadges } from "./ContentBadges";
import { StreamingProviders } from "./StreamingProviders";
import { Star, Film, Tv, Sparkles, PlayCircle } from "lucide-react";

interface Props {
  title: MediaTitle;
  providers?: StreamingProvider[];
  reason?: string;
  reasonTags?: string[];
  disabled?: boolean;
  onSwipeLeft?: () => void;   // hated
  onSwipeRight?: () => void;  // loved
  onSwipeUp?: () => void;     // liked
  onSwipeDown?: () => void;   // ok
  children?: ReactNode;       // action buttons row
  compactMobile?: boolean;
  onTrailerClick?: () => void;
}

export function SwipeCard({
  title,
  providers,
  reason,
  reasonTags,
  disabled = false,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  children,
  compactMobile = false,
  onTrailerClick,
}: Props) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [title.id]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled) return;
    if (!startRef.current) return;
    setDrag((d) => ({ ...d, x: e.clientX - startRef.current!.x, y: e.clientY - startRef.current!.y, active: true }));
  };
  const onPointerUp = () => {
    if (disabled) return;
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
  const stopTrailerPointer = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };
  const openTrailer = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onTrailerClick?.();
  };

  const rotate = drag.x * 0.06;
  const intent =
    drag.x > 60 ? "loved" : drag.x < -60 ? "hated" : drag.y < -60 ? "liked" : drag.y > 60 ? "ok" : null;
  const rootClass = compactMobile
    ? "relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col select-none touch-none md:block md:flex-none"
    : "relative mx-auto w-full max-w-md select-none touch-none";
  const shellClass = compactMobile
    ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:block md:rounded-3xl"
    : "overflow-hidden rounded-3xl border border-border bg-card shadow-2xl";
  const posterClass = compactMobile
    ? "relative h-[clamp(11.5rem,36dvh,19rem)] w-full shrink-0 bg-muted md:aspect-[2/3] md:h-auto"
    : "relative aspect-[2/3] w-full bg-muted";
  const overlayClass = compactMobile
    ? "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 md:p-4"
    : "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4";
  const titleClass = compactMobile
    ? "line-clamp-2 text-xl font-bold leading-tight text-white md:text-2xl"
    : "text-2xl font-bold leading-tight text-white";
  const detailsClass = compactMobile
    ? "min-h-0 flex-1 space-y-2 overflow-hidden p-3 md:space-y-3 md:p-4"
    : "space-y-3 p-4";
  const visibleReasonTags = (reasonTags ?? []).filter(Boolean).slice(0, 3);
  const reasonHeading = visibleReasonTags.length > 0 ? (reason ?? "Recommended based on") : "Recommended";

  return (
    <div
      className={rootClass}
      style={{
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotate}deg)`,
        transition: drag.active ? "none" : "transform 250ms cubic-bezier(.2,.8,.2,1)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className={shellClass}>
        <div className={posterClass}>
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
          {onTrailerClick && (
            <button
              type="button"
              aria-label={`Play trailer for ${title.title}`}
              onPointerDown={stopTrailerPointer}
              onPointerMove={stopTrailerPointer}
              onPointerUp={stopTrailerPointer}
              onClick={openTrailer}
              className="absolute left-3 top-3 z-10 inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur transition-colors hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              <PlayCircle className="h-5 w-5" />
            </button>
          )}
          <div className={overlayClass}>
            <div className="mb-1 flex items-center gap-2 text-xs text-white/80">
              {title.type === "movie" ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
              <span>{title.type === "movie" ? "Movie" : "TV Series"}</span>
              {title.release_year && <span>- {title.release_year}</span>}
              {title.rating != null && (
                <span className="ml-auto inline-flex items-center gap-0.5 rounded-md bg-black/40 px-1.5 py-0.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {title.rating.toFixed(1)}
                </span>
              )}
            </div>
            <h2 className={titleClass}>{title.title}</h2>
          </div>
          {intent && (
            <div
              className={`pointer-events-none absolute right-4 top-4 rounded-lg border-4 px-3 py-1 text-2xl font-black uppercase tracking-wider ${
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
        <div className={detailsClass}>
          <p className={compactMobile ? "line-clamp-3 text-xs leading-[1.15rem] text-muted-foreground md:text-sm" : "line-clamp-3 text-sm text-muted-foreground"}>
            {title.description}
          </p>
          <div className="flex max-h-7 flex-wrap gap-1.5 overflow-hidden md:max-h-none">
            {title.genres.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">{g}</span>
            ))}
          </div>
          <div className="max-h-6 overflow-hidden md:max-h-none">
            <ContentBadges title={title} />
          </div>
          {title.cast_members.length > 0 && (
            <p className="line-clamp-1 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Cast:</span> {title.cast_members.slice(0, 3).join(", ")}</p>
          )}
          {providers && (
            <div className="min-h-0 overflow-hidden">
              <p className="mb-1 text-xs font-semibold text-foreground">Where to watch</p>
              <StreamingProviders providers={providers} maxVisible={compactMobile ? 2 : 4} />
            </div>
          )}
          {(reason || visibleReasonTags.length > 0) && (
            <div className={compactMobile ? "rounded-xl border border-primary/25 bg-primary/10 p-2 md:p-3" : "rounded-xl border border-primary/25 bg-primary/10 p-3"}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                <Sparkles className="h-3 w-3" />
                <span>{reasonHeading}</span>
              </div>
              {visibleReasonTags.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {visibleReasonTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-primary/25 bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{reason}</p>
              )}
            </div>
          )}
        </div>
      </div>
      {children && <div className={compactMobile ? "mt-1.5 shrink-0 md:mt-4" : "mt-4"}>{children}</div>}
    </div>
  );
}
