import { Loader2 } from "lucide-react";

export function RoutePending() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm font-semibold text-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        <span>Loading NextUp</span>
      </div>
    </div>
  );
}
