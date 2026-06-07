import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Menu, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

export interface TocItem {
  id: string;
  label: string;
  level: number;
}
export interface DocNavItem {
  id: string;
  label: string;
  href: string;
  active: boolean;
}

interface Props {
  portalName: string;
  gated?: boolean;
  docNav: DocNavItem[];
  tocItems: TocItem[];
  children: React.ReactNode;
}

/**
 * Published documentation portal layout.
 * (Same chrome as the original petition portal: sticky h-14 header, w-72 TOC sidebar
 * with IntersectionObserver scroll-spy, and pl-[7.5rem] pr-48 / max-w-4xl content.)
 */
export default function DocumentationLayout({ portalName, gated, docNav, tocItems, children }: Props) {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<string>("");
  const [tocSheetOpen, setTocSheetOpen] = useState(false);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (tocItems.length > 0) setActiveSection(tocItems[0].id);
  }, [tocItems]);

  // Scroll spy
  useEffect(() => {
    if (tocItems.length === 0) return;
    const observers: IntersectionObserver[] = [];
    const visible = new Set<string>();
    tocItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          if (isScrollingRef.current) return;
          entries.forEach((entry) => {
            if (entry.isIntersecting) visible.add(id);
            else visible.delete(id);
            const first = tocItems.find((s) => visible.has(s.id));
            if (first) setActiveSection(first.id);
          });
        },
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [tocItems]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    isScrollingRef.current = true;
    if (isMobile) setTocSheetOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = isMobile ? 56 : 96;
      const pos = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: pos, behavior: "smooth" });
    }
    setTimeout(() => { isScrollingRef.current = false; }, 800);
  };

  const sidebar = (
    <>
      {docNav.length > 1 && (
        <>
          <p className="text-xs font-mono tracking-wider uppercase text-muted-foreground/70 mb-2 px-3">Docs</p>
          <nav className="space-y-1 mb-8">
            {docNav.map((d) => (
              <Link
                key={d.id}
                to={d.href}
                onClick={() => isMobile && setTocSheetOpen(false)}
                className={`block w-full text-left text-sm py-1 px-3 transition-colors ${
                  d.active ? "text-foreground font-medium" : "text-muted-foreground/80 hover:text-foreground"
                }`}
              >
                {d.label}
              </Link>
            ))}
          </nav>
        </>
      )}
      {tocItems.length > 0 && (
        <>
          {docNav.length > 1 && (
            <p className="text-xs font-mono tracking-wider uppercase text-muted-foreground/70 mb-2 px-3">On this page</p>
          )}
          <nav className="space-y-1">
            {tocItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`block w-full text-left text-sm py-1 transition-colors ${
                  activeSection === item.id ? "text-foreground font-medium" : "text-muted-foreground/80 hover:text-foreground"
                }`}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 px-4 md:px-6 border-b border-border flex items-center justify-between bg-background sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Sheet open={tocSheetOpen} onOpenChange={setTocSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-sm font-medium">Contents</SheetTitle>
                </SheetHeader>
                <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">{sidebar}</div>
              </SheetContent>
            </Sheet>
          )}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium font-heading">{portalName}</span>
            {gated && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-xs font-mono tracking-wider text-muted-foreground/50 hidden sm:inline">thesis</span>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1">
        {!isMobile && (
          <aside className="w-72 sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col">
            <div className="flex-1 pt-10 px-6 pb-6 overflow-y-auto">{sidebar}</div>
          </aside>
        )}
        <main className={`flex-1 pt-2 pb-10 overflow-y-auto ${isMobile ? "px-6 pb-32" : "pl-[7.5rem] pr-48"}`}>
          <div className={isMobile ? "max-w-full" : "max-w-4xl"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
