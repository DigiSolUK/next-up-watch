import type { MediaTitle, TmdbTrailer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Loader2, PlayCircle } from "lucide-react";

interface TrailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: MediaTitle;
  trailer?: TmdbTrailer | null;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

export function TrailerDialog({
  open,
  onOpenChange,
  title,
  trailer,
  isLoading = false,
  isError = false,
  errorMessage,
}: TrailerDialogProps) {
  const displayTitle = title?.title ?? "Trailer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl gap-3 overflow-hidden rounded-2xl border-border bg-card p-3 shadow-2xl sm:p-4">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="line-clamp-1 text-base sm:text-lg">{displayTitle}</DialogTitle>
          <DialogDescription>
            {isLoading ? "Finding the best trailer" : trailer ? trailer.name : "Trailer preview"}
          </DialogDescription>
        </DialogHeader>

        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading trailer...</p>
            </div>
          ) : trailer ? (
            <iframe
              src={trailer.embedUrl}
              title={`${displayTitle} trailer`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-muted-foreground">
              <PlayCircle className="h-10 w-10" />
              <div>
                <p className="font-semibold text-foreground">
                  {isError ? "Could not load trailer" : "No trailer found"}
                </p>
                <p className="mt-1 text-sm">
                  {isError
                    ? errorMessage ?? "TMDb did not return a trailer for this title."
                    : "TMDb does not have a YouTube trailer for this title yet."}
                </p>
              </div>
            </div>
          )}
        </div>

        {trailer?.watchUrl && (
          <Button asChild variant="secondary" className="w-full sm:w-auto sm:self-end">
            <a href={trailer.watchUrl} target="_blank" rel="noreferrer">
              Open on YouTube
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
