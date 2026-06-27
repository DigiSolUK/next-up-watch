import { createFileRoute } from "@tanstack/react-router";
import { useUserSettings, useUpdateSettings } from "@/hooks/use-nextup-data";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { UserSettings } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings - NextUp" }] }),
  component: SettingsPage,
});

const CONTENT_FILTERS: { key: keyof UserSettings; label: string; desc: string }[] = [
  { key: "hide_horror", label: "Hide horror", desc: "Skip titles that are mainly horror." },
  { key: "hide_gore", label: "Hide gore", desc: "Skip gore-heavy titles." },
  { key: "hide_graphic_violence", label: "Hide graphic violence", desc: "Skip very violent titles." },
  { key: "hide_gruesome_visuals", label: "Hide gruesome visuals", desc: "Skip titles with disturbing imagery." },
  { key: "hide_excessive_slaughter", label: "Hide slaughter-heavy", desc: "Skip slasher-style content." },
  { key: "hide_pointless_suspense", label: "Hide pointless suspense", desc: "Skip suspense without substance." },
];

const STORY_PREFERENCES: { key: keyof UserSettings; label: string; desc: string }[] = [
  { key: "prefer_complex_plots", label: "Prefer complex plots", desc: "Bias toward layered storytelling." },
  { key: "prefer_twisted_plots", label: "Prefer twisted plots", desc: "Bias toward twists and reveals." },
  { key: "prefer_newer_releases", label: "Prefer newer releases", desc: "Boost recent titles in recommendations." },
  { key: "include_older_classics", label: "Include older classics", desc: "Allow pre-1990 titles." },
];

const PROVIDERS = ["Netflix", "Prime Video", "Apple TV"];

type SaveState = "idle" | "saving" | "saved" | "error";

function SettingsPage() {
  const { data: settings, isLoading } = useUserSettings();
  const update = useUpdateSettings();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  if (isLoading || !settings) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const patch = async (p: Partial<UserSettings>) => {
    setSaveState("saving");
    setSaveMessage("Saving...");
    try {
      await update.mutateAsync(p);
      setSaveState("saved");
      setSaveMessage("Saved");
      toast.success("Saved.");
      window.setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      const message = (e as Error).message;
      setSaveState("error");
      setSaveMessage(message);
      toast.error(message);
    }
  };

  const toggleProvider = (provider: string) => {
    const selected = new Set(settings.preferred_streaming_providers);
    if (selected.has(provider)) selected.delete(provider);
    else selected.add(provider);
    void patch({ preferred_streaming_providers: [...selected] });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 md:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">These affect what we show you and what we recommend.</p>
        </div>
      </div>
      <SaveStatus state={saveState} message={saveMessage} />

      <SettingsSection title="Content type">
        <div className="grid grid-cols-3 gap-2">
          {(["movie", "tv", "both"] as const).map((v) => (
            <button
              key={v}
              type="button"
              disabled={update.isPending}
              onClick={() => patch({ preferred_type: v })}
              className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${settings.preferred_type === v ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
            >
              {v === "movie" ? "Movies" : v === "tv" ? "TV" : "Both"}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Content filters">
        <div className="space-y-2">
          {CONTENT_FILTERS.map((t) => (
            <ToggleRow
              key={t.key as string}
              label={t.label}
              desc={t.desc}
              active={Boolean(settings[t.key])}
              disabled={update.isPending}
              onToggle={() => patch({ [t.key]: !settings[t.key] } as Partial<UserSettings>)}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Story preferences">
        <div className="space-y-2">
          {STORY_PREFERENCES.map((t) => (
            <ToggleRow
              key={t.key as string}
              label={t.label}
              desc={t.desc}
              active={Boolean(settings[t.key])}
              disabled={update.isPending}
              onToggle={() => patch({ [t.key]: !settings[t.key] } as Partial<UserSettings>)}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Streaming">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region</span>
          <select
            value={settings.region}
            onChange={(e) => patch({ region: e.target.value })}
            disabled={update.isPending}
            className="mt-2 min-h-11 w-full rounded-xl border border-input bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          >
            <option value="GB">United Kingdom</option>
          </select>
        </label>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preferred providers</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROVIDERS.map((provider) => {
              const active = settings.preferred_streaming_providers.includes(provider);
              return (
                <button
                  key={provider}
                  type="button"
                  disabled={update.isPending}
                  onClick={() => toggleProvider(provider)}
                  className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${active ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
                >
                  {provider}
                </button>
              );
            })}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Thresholds">
        <label className="block">
          <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Minimum external rating</span>
            <span>{settings.minimum_rating.toFixed(1)}</span>
          </span>
          <input
            type="range" min={0} max={9} step={0.5}
            value={settings.minimum_rating}
            onChange={(e) => patch({ minimum_rating: Number(e.target.value) })}
            disabled={update.isPending}
            className="mt-3 w-full accent-primary disabled:opacity-60"
          />
        </label>
        <label className="mt-5 block">
          <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Ratings to unlock</span>
            <span>{settings.learning_threshold}</span>
          </span>
          <input
            type="range" min={10} max={100} step={5}
            value={settings.learning_threshold}
            onChange={(e) => patch({ learning_threshold: Number(e.target.value) })}
            disabled={update.isPending}
            className="mt-3 w-full accent-primary disabled:opacity-60"
          />
        </label>
      </SettingsSection>
    </div>
  );
}

function SaveStatus({ state, message }: { state: SaveState; message: string }) {
  if (state === "idle") return null;

  const icon = state === "saving"
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : state === "saved"
      ? <CheckCircle2 className="h-4 w-4" />
      : <AlertCircle className="h-4 w-4" />;

  return (
    <div className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
      state === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground"
    }`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 md:p-5">
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  desc,
  active,
  disabled,
  onToggle,
}: {
  label: string;
  desc: string;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
      className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-left transition-colors hover:bg-secondary/60 disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{desc}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${active ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </button>
  );
}
