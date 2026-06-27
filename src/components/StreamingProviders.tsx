import type { StreamingProvider } from "@/lib/types";

export function StreamingProviders({ providers, maxVisible = 4 }: { providers: StreamingProvider[]; maxVisible?: number }) {
  if (!providers || providers.length === 0) {
    return <p className="text-xs text-muted-foreground">Streaming availability not found yet.</p>;
  }

  const visibleProviders = providers.slice(0, maxVisible);
  const extraCount = Math.max(0, providers.length - visibleProviders.length);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleProviders.map((p, i) => (
        <a
          key={i}
          href={p.watch_url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
        >
          {p.provider_name}
          <span className="ml-1 text-[10px] text-muted-foreground">- {availabilityLabel(p.availability_type)}</span>
        </a>
      ))}
      {extraCount > 0 && (
        <span className="inline-flex min-h-10 items-center rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          +{extraCount} more
        </span>
      )}
    </div>
  );
}

function availabilityLabel(type: StreamingProvider["availability_type"]) {
  return type === "subscription" ? "sub" : type;
}
