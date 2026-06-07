import { useNavigate } from "react-router-dom";
import { LogOut, Download, Loader2, Check, Menu, X } from "lucide-react";
import { useStakeholderAuth } from "@/contexts/StakeholderAuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import robomartLogo from "@/assets/robomart-icon.png";
import JSZip from "jszip";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TocItem {
  id: string;
  label: string;
  level: number;
}

interface DocumentationLayoutProps {
  children: React.ReactNode;
  tocItems: TocItem[];
}

interface DownloadFile {
  name: string;
  status: "pending" | "downloading" | "done" | "error";
}

interface DownloadProgress {
  isOpen: boolean;
  stage: "idle" | "fetching" | "downloading" | "zipping" | "complete";
  files: DownloadFile[];
  currentIndex: number;
}

export default function DocumentationLayout({ children, tocItems }: DocumentationLayoutProps) {
  const navigate = useNavigate();
  const { stakeholderSession, clearStakeholderSession } = useStakeholderAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [tocSheetOpen, setTocSheetOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    isOpen: false,
    stage: "idle",
    files: [],
    currentIndex: -1,
  });
  const mainRef = useRef<HTMLElement>(null);
  const isScrollingRef = useRef(false);

  // Auto-scroll progress panel to current downloading item
  useEffect(() => {
    if (downloadProgress.isOpen && downloadProgress.currentIndex >= 0) {
      const currentItem = document.getElementById(`download-item-${downloadProgress.currentIndex}`);
      if (currentItem) {
        currentItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [downloadProgress.currentIndex, downloadProgress.isOpen]);

  // Set initial active section
  useEffect(() => {
    if (tocItems.length > 0 && !activeSection) {
      setActiveSection(tocItems[0].id);
    }
  }, [tocItems, activeSection]);

  // Scroll spy using IntersectionObserver
  useEffect(() => {
    if (tocItems.length === 0) return;

    const observers: IntersectionObserver[] = [];
    const visibleSections = new Set<string>();

    tocItems.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        const observer = new IntersectionObserver(
          (entries) => {
            // Skip updates during click-initiated scrolls
            if (isScrollingRef.current) return;
            
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                visibleSections.add(id);
              } else {
                visibleSections.delete(id);
              }

              // Find the first visible section in document order
              const firstVisible = tocItems.find((s) => visibleSections.has(s.id));
              if (firstVisible) {
                setActiveSection(firstVisible.id);
              }
            });
          },
          { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
        );
        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [tocItems]);

  const handleSignOut = () => {
    clearStakeholderSession();
    navigate("/login");
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id); // Immediately update active section on click
    isScrollingRef.current = true; // Disable scroll spy during click scroll
    
    // Close TOC sheet on mobile after clicking
    if (isMobile) {
      setTocSheetOpen(false);
    }
    
    const element = document.getElementById(id);
    if (element) {
      // Offset for fixed header (56px) + TOC top padding (40px) to align with TOC start
      const headerOffset = isMobile ? 56 : 96;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
    
    // Re-enable scroll spy after scroll completes
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  };

  // Retry helper for Safari CORS mitigation
  const fetchWithRetry = async (url: string, maxRetries = 3): Promise<Response> => {
    let lastError: Error = new Error('Fetch failed');
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.log(`[Download] Fetch attempt ${attempt + 1} failed:`, lastError.message);
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  };

  const handleDownloadPackage = async () => {
    setIsDownloading(true);
    setDownloadProgress({ isOpen: true, stage: "fetching", files: [], currentIndex: -1 });

    try {
      // Get the access key from stakeholder session
      const sessionData = localStorage.getItem("stakeholder_session");
      const accessKey = sessionData ? JSON.parse(sessionData).accessKey : null;

      if (!accessKey) {
        throw new Error("No access key found. Please log in again.");
      }

      // Call edge function with retry logic for Safari CORS mitigation
      let data: any;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await supabase.functions.invoke("get-document-urls", {
            body: { accessKey },
          });
          
          if (result.error) throw result.error;
          data = result.data;
          lastError = null;
          break;
        } catch (error) {
          lastError = error as Error;
          console.log(`[Download] Edge function attempt ${attempt + 1} failed:`, lastError.message);
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          }
        }
      }
      
      if (lastError) throw lastError;

      if (!data.files || data.files.length === 0) {
        setDownloadProgress((prev) => ({ ...prev, isOpen: false, stage: "idle" }));
        toast({
          title: "No documents available",
          description: "There are no documents in the package yet.",
          variant: "destructive",
        });
        return;
      }

      // Initialize files list with pending status
      const filesList: DownloadFile[] = data.files.map((f: { name: string }) => ({
        name: f.name,
        status: "pending" as const,
      }));
      setDownloadProgress((prev) => ({ ...prev, stage: "downloading", files: filesList }));

      // Create ZIP using signed URLs
      const zip = new JSZip();

      for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i];

        // Update current file to downloading
        setDownloadProgress((prev) => ({
          ...prev,
          currentIndex: i,
          files: prev.files.map((f, idx) => (idx === i ? { ...f, status: "downloading" } : f)),
        }));

        try {
          // Use retry for individual file downloads (Safari CORS mitigation)
          const response = await fetchWithRetry(file.url);
          if (!response.ok) {
            throw new Error(`Failed to download`);
          }
          const blob = await response.blob();
          zip.file(file.name, blob);

          // Mark as done
          setDownloadProgress((prev) => ({
            ...prev,
            files: prev.files.map((f, idx) => (idx === i ? { ...f, status: "done" } : f)),
          }));
        } catch {
          // Mark as error but continue
          setDownloadProgress((prev) => ({
            ...prev,
            files: prev.files.map((f, idx) => (idx === i ? { ...f, status: "error" } : f)),
          }));
        }
      }

      // Update to zipping stage
      setDownloadProgress((prev) => ({ ...prev, stage: "zipping" }));

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "robomart-nhtsa-petition-documents.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mark complete
      setDownloadProgress((prev) => ({ ...prev, stage: "complete" }));

      toast({
        title: "Download complete",
        description: `Downloaded ${data.files.length} document(s) as ZIP`,
      });
    } catch (error: any) {
      console.error("Download error:", error);
      setDownloadProgress((prev) => ({ ...prev, isOpen: false, stage: "idle" }));
      toast({
        title: "Download failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getStageLabel = () => {
    switch (downloadProgress.stage) {
      case "fetching":
        return "Fetching document list...";
      case "downloading":
        return `Downloading ${downloadProgress.currentIndex + 1}/${downloadProgress.files.length}`;
      case "zipping":
        return "Creating ZIP...";
      case "complete":
        return "Complete!";
      default:
        return "";
    }
  };

  // Render TOC navigation items
  const renderTocItems = () => (
    <nav className="space-y-1">
      {tocItems.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollToSection(item.id)}
          className={`block w-full text-left text-sm py-1 transition-colors ${
            activeSection === item.id
              ? "text-foreground font-medium"
              : "text-muted-foreground/80 hover:text-foreground"
          }`}
          style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );

  // Render download progress panel
  const renderDownloadProgress = () => (
    <div className="p-3 bg-background rounded-lg border border-border shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{getStageLabel()}</span>
        {downloadProgress.stage === "complete" && (
          <button
            onClick={() => setDownloadProgress({ isOpen: false, stage: "idle", files: [], currentIndex: -1 })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        )}
      </div>
      {downloadProgress.files.length > 0 && (
        <div className="max-h-32 overflow-y-auto space-y-1">
          {downloadProgress.files.map((file, idx) => (
            <div
              key={idx}
              id={`download-item-${idx}`}
              className={`flex items-center gap-2 text-xs ${
                file.status === "pending"
                  ? "text-muted-foreground/50"
                  : file.status === "error"
                    ? "text-destructive"
                    : "text-foreground"
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {file.status === "done" && <Check className="w-3 h-3 text-green-600" />}
                {file.status === "downloading" && <Loader2 className="w-3 h-3 animate-spin" />}
                {file.status === "pending" && <span className="text-muted-foreground/40">○</span>}
                {file.status === "error" && <span className="text-destructive">✕</span>}
              </div>
              <span className="truncate">{file.name}</span>
            </div>
          ))}
        </div>
      )}
      {downloadProgress.stage === "zipping" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Creating ZIP archive...</span>
        </div>
      )}
      {downloadProgress.stage === "complete" && (
        <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
          <Check className="w-3 h-3" />
          <span>Download complete!</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 px-4 md:px-6 border-b border-border flex items-center justify-between bg-background sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {/* Mobile: Hamburger menu for TOC */}
          {isMobile && (
            <Sheet open={tocSheetOpen} onOpenChange={setTocSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-sm font-medium">On this page</SheetTitle>
                </SheetHeader>
                <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
                  {tocItems.length > 0 ? (
                    renderTocItems()
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No headings available</p>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              if (tocItems.length > 0) {
                setActiveSection(tocItems[0].id);
              }
            }}
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            <img src={robomartLogo} alt="Robomart" className="h-5 w-auto" />
            <span className="text-sm font-medium hidden sm:inline">Robomart Part 555 Petition</span>
            <span className="text-sm font-medium sm:hidden">Petition</span>
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">{stakeholderSession?.name}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Exit</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Left sidebar - TOC (Desktop only) */}
        {!isMobile && (
          <aside className="w-72 sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col">
            <div className="flex-1 pt-10 px-6 pb-6 overflow-y-auto">
              {tocItems.length > 0 ? (
                renderTocItems()
              ) : (
                <p className="text-sm text-muted-foreground italic px-3">No headings available</p>
              )}
            </div>

            {/* Download Package Box (Desktop) */}
            <div className="p-6">
              {/* Progress Panel - opens above button */}
              {downloadProgress.isOpen && (
                <div className="mb-3">
                  {renderDownloadProgress()}
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <h4 className="text-sm font-medium mb-2">Document Package</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Download all supporting documents as individual files
                </p>
                <Button size="sm" className="w-full" onClick={handleDownloadPackage} disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download Package
                </Button>
              </div>
            </div>
          </aside>
        )}

        {/* Content area */}
        <main 
          ref={mainRef}
          className={`flex-1 pt-2 pb-10 overflow-y-auto ${
            isMobile 
              ? "px-6 pb-32" // Match header padding, extra bottom for mobile footer
              : "pl-[7.5rem] pr-48"
          }`}
        >
          <div className={isMobile ? "max-w-full" : "max-w-4xl"}>{children}</div>
        </main>
      </div>

      {/* Mobile: Fixed footer with download button */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          {/* Download progress panel (mobile) - floats above footer */}
          {downloadProgress.isOpen && (
            <div className="px-6 pb-2 bg-background">
              {renderDownloadProgress()}
            </div>
          )}
          
          {/* Footer with download button */}
          <div className="bg-background border-t border-border px-6 py-3 pb-safe">
            <Button 
              className="w-full" 
              onClick={handleDownloadPackage} 
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download Package
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
