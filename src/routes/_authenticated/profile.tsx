import { createFileRoute } from "@tanstack/react-router";
import { useUserProfile, useUserRatings, useMediaTitles, useUserSettings } from "@/hooks/use-nextup-data";
import { buildTasteProfile, summariseProfile } from "@/lib/recommend";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { MediaTitle, TasteProfile } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Taste Profile — NextUp" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile, isLoading } = useUserProfile();
  const { data: ratings } = useUserRatings();
  const { data: titles } = useMediaTitles();
  const { data: settings } = useUserSettings();

  const tp: TasteProfile | null = useMemo(() => {
    if (!ratings || !titles) return null;
    const map = new Map<string, MediaTitle>(titles.map((t) => [t.id, t]));
    return buildTasteProfile(ratings.map((r) => ({ ...r, media: map.get(r.media_title_id) ?? null })), settings?.preferred_type ?? "both");
  }, [ratings, titles, settings]);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const ratedCount = (ratings ?? []).filter((r) => r.rating_value !== "not_seen").length;
  const summary = tp ? summariseProfile(tp, ratedCount) : (profile?.profile_summary ?? "");
  const breakdown = (() => {
    const acc = { loved: 0, liked: 0, ok: 0, hated: 0, not_seen: 0 };
    for (const r of ratings ?? []) (acc as Record<string, number>)[r.rating_value]++;
    return acc;
  })();

  const top = (m: Record<string, number> | undefined, n = 5) =>
    Object.entries(m ?? {}).sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-bold">Your Taste Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">{summary}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        <Stat label="Loved" value={breakdown.loved} tone="var(--loved)" />
        <Stat label="Liked" value={breakdown.liked} tone="var(--liked)" />
        <Stat label="OK" value={breakdown.ok} tone="var(--ok)" />
        <Stat label="Hated" value={breakdown.hated} tone="var(--hated)" />
        <Stat label="Not seen" value={breakdown.not_seen} tone="var(--notseen)" />
      </div>

      {tp && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card title="Favourite genres" items={top(tp.favourite_genres)} />
          <Card title="Disliked genres" items={top(tp.disliked_genres)} />
          <Card title="Themes you enjoy" items={top(tp.favourite_themes)} />
          <Card title="Themes you avoid" items={top(tp.disliked_themes)} />
          <Card title="Favourite cast" items={top(tp.favourite_cast)} />
          <Sliders tp={tp} />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold">Profile confidence</h3>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.round((profile?.confidence_score ?? 0) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{profile?.recommendation_ready ? "Recommendation Mode is unlocked." : "Keep rating to unlock recommendations."}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="text-2xl font-extrabold" style={{ color: `oklch(from ${tone} l c h)` }}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Not enough data yet.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.map((i) => <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{i}</span>)}
        </div>
      )}
    </div>
  );
}

function Sliders({ tp }: { tp: TasteProfile }) {
  const rows: { label: string; v: number }[] = [
    { label: "Complexity preference", v: tp.preferred_complexity },
    { label: "Mystery level", v: tp.preferred_mystery },
    { label: "World-building", v: tp.preferred_world_building },
    { label: "Emotional depth", v: tp.preferred_emotional_depth },
    { label: "Twisted plot preference", v: tp.preferred_twisted_plot },
    { label: "Gore tolerance", v: tp.gore_tolerance },
    { label: "Gruesome visuals tolerance", v: tp.gruesome_tolerance },
    { label: "Horror tolerance", v: tp.horror_tolerance },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2">
      <h3 className="text-sm font-bold">Tone & intensity</h3>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-xs"><span>{r.label}</span><span className="text-muted-foreground">{r.v.toFixed(1)} / 5</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.max(0, Math.min(100, (r.v / 5) * 100))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
