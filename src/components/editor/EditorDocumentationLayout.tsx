import { ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Check, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TocItem {
  id: string;
  label: string;
  level: number;
}

interface EditorDocumentationLayoutProps {
  children: ReactNode;
  tocItems: TocItem[];
  onPublish: () => void;
  isPublishing: boolean;
  hasPublishedContent?: boolean;
  hasUnpublishedChanges?: boolean;
  publishSuccess?: boolean;
}

export default function EditorDocumentationLayout({
  children,
  tocItems,
  onPublish,
  isPublishing,
  hasPublishedContent = false,
  hasUnpublishedChanges = false,
  publishSuccess = false,
}: EditorDocumentationLayoutProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<string>("");
  const [publishPopoverOpen, setPublishPopoverOpen] = useState(false);
  const isScrollingRef = useRef(false);

  const publishedUrl = "petition.robomart.ai";

  // Scroll-spy: update active section based on scroll position
  useEffect(() => {
    const proseMirror = document.querySelector('.ProseMirror');
    const scrollContainer = proseMirror?.closest('.overflow-y-auto');
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      if (!proseMirror) return;

      const h1Headings = proseMirror.querySelectorAll('h1');
      if (h1Headings.length === 0) return;

      const toolbarHeight = 150;
      let currentSection = '';

      h1Headings.forEach((heading, index) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= toolbarHeight) {
          currentSection = `h1-${index}`;
        }
      });

      if (currentSection && currentSection !== activeSection) {
        setActiveSection(currentSection);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [activeSection, tocItems]);

  const handleExit = async () => {
    await signOut('/editor/login');
  };

  const handlePublishClick = () => {
    onPublish();
  };

  const scrollToSection = (id: string) => {
    isScrollingRef.current = true;
    setActiveSection(id);
    
    const match = id.match(/h1-(\d+)/);
    if (!match) {
      isScrollingRef.current = false;
      return;
    }
    
    const h1Index = parseInt(match[1], 10);
    
    const proseMirror = document.querySelector('.ProseMirror');
    if (!proseMirror) {
      isScrollingRef.current = false;
      return;
    }
    
    const h1Headings = proseMirror.querySelectorAll('h1');
    const targetHeading = h1Headings[h1Index] as HTMLElement;
    
    if (!targetHeading) {
      isScrollingRef.current = false;
      return;
    }
    
    const toolbarHeight = 70;
    const editorWrapper = targetHeading.closest('.overflow-y-auto') || document.querySelector('main');
    
    if (editorWrapper) {
      const wrapperRect = editorWrapper.getBoundingClientRect();
      const headingRect = targetHeading.getBoundingClientRect();
      const currentScroll = editorWrapper.scrollTop;
      const targetScroll = currentScroll + (headingRect.top - wrapperRect.top) - toolbarHeight;
      editorWrapper.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
    
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-background sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {/* Editor Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-amber-600">Editor</span>
          </div>
          
          <span className="text-muted-foreground">/</span>
          
          <span className="text-sm text-muted-foreground">Robomart Petition</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Unsaved Changes Warning */}
          {hasUnpublishedChanges && !publishSuccess && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span>Unsaved changes</span>
            </div>
          )}

          <Popover open={publishPopoverOpen} onOpenChange={setPublishPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" className="min-w-[100px]">
                Publish
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              <a
                href={`https://${publishedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border"
              >
                <span className="text-muted-foreground">{publishedUrl}</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
              <div className="p-3">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handlePublishClick}
                  disabled={isPublishing || publishSuccess}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Publishing...
                    </>
                  ) : publishSuccess ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Published
                    </>
                  ) : hasPublishedContent ? (
                    'Update'
                  ) : (
                    'Publish'
                  )}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Dynamic TOC */}
        <aside className="w-72 flex flex-col border-r border-border sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="flex-1 p-6 pt-12 overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Document Outline
            </h3>
            
            {tocItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Add headings to see the document outline
              </p>
            ) : (
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left text-sm py-1.5 transition-colors ${
                      activeSection === item.id
                        ? "text-foreground font-medium opacity-100"
                        : "text-foreground/80 hover:text-foreground"
                    }`}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Main content - Editor */}
        <main className="flex-1 overflow-y-auto flex flex-col h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
