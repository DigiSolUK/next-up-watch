import type { StreamingProvider } from "@/lib/types";

export function StreamingProviders({ providers }: { providers: StreamingProvider[] }) {
  if (!providers || providers.length === 0) {
    return <p className="text-xs text-muted-foreground">Streaming availability not found yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {providers.map((p, i) => (
        <a
          key={i}
          href={p.watch_url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
        >
          {p.provider_name}
          <span className="ml-1 text-[10px] text-muted-foreground">· {p.availability_type}</span>
        </a>
      ))}
    </div>
  );
}
