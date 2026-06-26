import { Link, useNavigate } from "@tanstack/react-router";
import { Film, Bookmark, User, Settings, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const linkClass =
  "flex flex-col items-center gap-1 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary";

export function Navbar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <>
      {/* Top bar (desktop) */}
      <header className="hidden border-b border-border bg-card/60 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/swipe" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>NextUp</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/swipe" className={linkClass}><Film className="h-5 w-5" /><span>Swipe</span></Link>
            <Link to="/watchlist" className={linkClass}><Bookmark className="h-5 w-5" /><span>Watchlist</span></Link>
            <Link to="/profile" className={linkClass}><User className="h-5 w-5" /><span>Profile</span></Link>
            <Link to="/settings" className={linkClass}><Settings className="h-5 w-5" /><span>Settings</span></Link>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className={linkClass}
            ><LogOut className="h-5 w-5" /><span>Sign out</span></button>
          </nav>
        </div>
      </header>
      {/* Bottom bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-border bg-card/90 backdrop-blur md:hidden">
        <Link to="/swipe" className={linkClass}><Film className="h-5 w-5" /><span>Swipe</span></Link>
        <Link to="/watchlist" className={linkClass}><Bookmark className="h-5 w-5" /><span>List</span></Link>
        <Link to="/profile" className={linkClass}><User className="h-5 w-5" /><span>Taste</span></Link>
        <Link to="/settings" className={linkClass}><Settings className="h-5 w-5" /><span>Settings</span></Link>
      </nav>
    </>
  );
}
