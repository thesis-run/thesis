import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  to?: string;
}

export function AppShell({
  crumbs = [],
  actions,
  children,
}: {
  crumbs?: Crumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 h-12 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="h-full px-4 flex items-center gap-2">
          <Link to="/app" className="font-heading text-sm font-bold tracking-tight shrink-0">
            thesis
          </Link>
          <nav className="flex items-center gap-1 min-w-0 text-sm">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                {c.to ? (
                  <Link
                    to={c.to}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-mono text-xs text-foreground truncate">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>
        </div>
      </header>
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
