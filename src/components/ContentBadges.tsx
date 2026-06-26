import type { MediaTitle } from "@/lib/types";

interface Props { title: MediaTitle; }

const flagsFor = (m: MediaTitle): { label: string; tone: string }[] => {
  const out: { label: string; tone: string }[] = [];
  if ((m.gore_level ?? 0) >= 4) out.push({ label: "Gore", tone: "bg-red-500/20 text-red-300" });
  if ((m.gruesome_visuals_level ?? 0) >= 4) out.push({ label: "Gruesome visuals", tone: "bg-red-500/20 text-red-300" });
  if ((m.horror_level ?? 0) >= 4) out.push({ label: "Horror", tone: "bg-purple-500/20 text-purple-300" });
  if ((m.violence_level ?? 0) >= 4) out.push({ label: "Graphic violence", tone: "bg-orange-500/20 text-orange-300" });
  if ((m.suspense_level ?? 0) >= 4) out.push({ label: "Suspense-heavy", tone: "bg-amber-500/20 text-amber-200" });
  if ((m.twisted_plot_level ?? 0) >= 4) out.push({ label: "Twisted plot", tone: "bg-fuchsia-500/20 text-fuchsia-200" });
  if ((m.complexity_level ?? 0) >= 4) out.push({ label: "Complex plot", tone: "bg-blue-500/20 text-blue-300" });
  if ((m.emotional_depth_level ?? 0) >= 4) out.push({ label: "Emotional", tone: "bg-pink-500/20 text-pink-200" });
  if ((m.pacing ?? "") === "slow-burn") out.push({ label: "Slow burn", tone: "bg-slate-500/20 text-slate-200" });
  if ((m.complexity_level ?? 3) <= 2 && (m.horror_level ?? 0) < 3) out.push({ label: "Easy watch", tone: "bg-emerald-500/20 text-emerald-200" });
  return out;
};

export function ContentBadges({ title }: Props) {
  const flags = flagsFor(title);
  if (!flags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((f) => (
        <span key={f.label} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${f.tone}`}>{f.label}</span>
      ))}
    </div>
  );
}
