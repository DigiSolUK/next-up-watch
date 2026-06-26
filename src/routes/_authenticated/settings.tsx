import { createFileRoute } from "@tanstack/react-router";
import { useUserSettings, useUpdateSettings } from "@/hooks/use-nextup-data";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UserSettings } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — NextUp" }] }),
  component: SettingsPage,
});

const TOGGLES: { key: keyof UserSettings; label: string; desc: string }[] = [
  { key: "hide_horror", label: "Hide horror", desc: "Skip titles that are mainly horror." },
  { key: "hide_gore", label: "Hide gore", desc: "Skip gore-heavy titles." },
  { key: "hide_graphic_violence", label: "Hide graphic violence", desc: "Skip very violent titles." },
  { key: "hide_gruesome_visuals", label: "Hide gruesome visuals", desc: "Skip titles with disturbing imagery." },
  { key: "hide_excessive_slaughter", label: "Hide slaughter-heavy", desc: "Skip slasher-style content." },
  { key: "hide_pointless_suspense", label: "Hide pointless suspense", desc: "Skip suspense without substance." },
  { key: "prefer_complex_plots", label: "Prefer complex plots", desc: "Bias toward layered storytelling." },
  { key: "prefer_twisted_plots", label: "Prefer twisted plots", desc: "Bias toward twists and reveals." },
  { key: "prefer_newer_releases", label: "Prefer newer releases", desc: "Boost recent titles in recs." },
  { key: "include_older_classics", label: "Include older classics", desc: "Allow pre-1990 titles." },
];

function SettingsPage() {
  const { data: settings, isLoading } = useUserSettings();
  const update = useUpdateSettings();

  if (isLoading || !settings) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const patch = async (p: Partial<UserSettings>) => {
    try { await update.mutateAsync(p); toast.success("Saved."); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">These affect what we show you and what we recommend.</p>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">Content type</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["movie", "tv", "both"] as const).map((v) => (
            <button
              key={v}
              onClick={() => patch({ preferred_type: v })}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${settings.preferred_type === v ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
            >
              {v === "movie" ? "Movies" : v === "tv" ? "TV" : "Both"}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">Filters & tone</h2>
        <div className="mt-3 divide-y divide-border">
          {TOGGLES.map((t) => (
            <label key={t.key as string} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings[t.key])}
                onChange={(e) => patch({ [t.key]: e.target.checked } as Partial<UserSettings>)}
                className="mt-1 h-5 w-5 rounded border-input accent-primary"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">Thresholds</h2>
        <label className="mt-3 block">
          <span className="text-xs text-muted-foreground">Minimum external rating ({settings.minimum_rating.toFixed(1)})</span>
          <input
            type="range" min={0} max={9} step={0.5}
            value={settings.minimum_rating}
            onChange={(e) => patch({ minimum_rating: Number(e.target.value) })}
            className="mt-1 w-full accent-primary"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-xs text-muted-foreground">Ratings needed to unlock recommendations ({settings.learning_threshold})</span>
          <input
            type="range" min={10} max={100} step={5}
            value={settings.learning_threshold}
            onChange={(e) => patch({ learning_threshold: Number(e.target.value) })}
            className="mt-1 w-full accent-primary"
          />
        </label>
      </section>
    </div>
  );
}
