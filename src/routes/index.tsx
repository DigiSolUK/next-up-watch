import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Sparkles, Heart, ThumbsDown, EyeOff, ThumbsUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NextUp — Swipe your way to your next watch" },
      { name: "description", content: "NextUp learns what you actually love by letting you swipe through movies and TV shows, then recommends what to watch next." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/swipe" />;
  return (
    <div className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.15_25/.35),transparent_60%),radial-gradient(ellipse_at_bottom_left,oklch(0.35_0.18_320/.3),transparent_60%)]" />
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" /> NextUp
        </div>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight md:text-7xl">
          Stop scrolling.<br />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Start swiping.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Swipe through movies and TV shows. Tell us what you love, hate, or haven't seen. NextUp learns your taste and recommends what to watch next — properly.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/auth" className="rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90">
            Start building my taste profile
          </Link>
          <Link to="/auth" className="rounded-2xl border border-border px-6 py-4 text-base font-semibold text-foreground hover:bg-secondary">
            I already have an account
          </Link>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-4">
          {[
            { icon: Heart, label: "Loved it", tone: "var(--loved)", desc: "Strongest positive signal" },
            { icon: ThumbsUp, label: "Liked it", tone: "var(--liked)", desc: "Good but not all-time" },
            { icon: ThumbsDown, label: "Hated it", tone: "var(--hated)", desc: "We won't show similar" },
            { icon: EyeOff, label: "Haven't seen", tone: "var(--notseen)", desc: "Save for later" },
          ].map(({ icon: Icon, label, tone, desc }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${tone} 30%, transparent)` }}>
                <Icon className="h-5 w-5" style={{ color: `oklch(from ${tone} l c h)` }} />
              </div>
              <h3 className="mt-3 text-base font-bold">{label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <FeatureBlock title="Learns the deeper why" body="It's not just genre. NextUp learns whether you like mystery-driven sci-fi, slow-burn thrillers, or easy-watch comfort shows — and avoids gore-heavy or pointless suspense if that's not you." />
          <FeatureBlock title="Adapts as you change" body="Recent loves matter more than old ratings. Your taste evolves, and so does NextUp." />
          <FeatureBlock title="Knows where to watch" body="Find titles already streaming on Netflix, Prime, Apple TV, iPlayer and more, with one tap to save to your Watchlist." />
        </div>
      </div>
    </div>
  );
}

function FeatureBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
