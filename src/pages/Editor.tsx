import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PetitionEditor } from '@/components/editor/PetitionEditor';
import { EditorErrorBoundary } from '@/components/editor/EditorErrorBoundary';
import EditorDocumentationLayout from '@/components/editor/EditorDocumentationLayout';
import { useToast } from '@/hooks/use-toast';

interface TocItem {
  id: string;
  label: string;
  level: number;
}

const Editor = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isSessionReady } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState<any>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Fetch the ONE petition document (single-document architecture)
  // CRITICAL: persist: false ensures we ALWAYS fetch fresh content on refresh
  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ['editorContent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('petition_content')
        .select('id, content, updated_at, created_at, is_published, published_at, published_by, published_content')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Content fetch error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No petition document found. Please contact an administrator.');
      }

      const rawData = data as any;

      return {
        content: rawData.content,
        contentId: rawData.id,
        publishedContent: rawData.published_content,
        isPublished: rawData.is_published,
      };
    },
    enabled: !!user && isSessionReady,
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 3000),
    meta: { persist: false }, // Never cache to localStorage - always fetch fresh
  });

  const contentId = contentData?.contentId || null;
  const hasPublishedContent = !!contentData?.publishedContent;

  // Load content on mount
  useEffect(() => {
    if (contentData && content === null) {
      setContent(contentData.content);
    }
  }, [contentData, content]);

  // Determine initial publish state by comparing draft and published content
  useEffect(() => {
    if (contentData) {
      if (contentData.publishedContent) {
        const draftJson = JSON.stringify(contentData.content);
        const publishedJson = JSON.stringify(contentData.publishedContent);
        const contentMatches = draftJson === publishedJson;
        
        if (contentMatches) {
          setHasUnpublishedChanges(false);
          setPublishSuccess(true);
        } else {
          setHasUnpublishedChanges(true);
          setPublishSuccess(false);
        }
      } else {
        setHasUnpublishedChanges(true);
        setPublishSuccess(false);
      }
    }
  }, [contentData]);

  // Handle redirects in useEffect, not during render
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/editor/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Simple content change handler - no auto-save
  const handleContentChange = useCallback((newContent: any) => {
    setContent(newContent);
    setHasUnpublishedChanges(true);
    setPublishSuccess(false);
  }, []);

  const handleTocChange = useCallback((toc: TocItem[]) => {
    setTocItems(toc);
  }, []);

  // Publish via edge function with retry logic for Safari CORS flakiness
  const handlePublish = async () => {
    if (!contentId || !user || !content) return;

    setIsPublishing(true);

    try {
      let lastError: Error | null = null;
      
      // Retry up to 3 times with exponential backoff
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`[Publish] Attempt ${attempt + 1}...`);
          const { data, error } = await supabase.functions.invoke('publish-petition', {
            body: { content, contentId }
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          
          // Success - clear lastError and break
          lastError = null;
          console.log('[Publish] Success!');
          break;
        } catch (error: any) {
          lastError = error;
          console.log(`[Publish] Attempt ${attempt + 1} failed:`, error.message);
          if (attempt < 2) {
            const delay = 500 * Math.pow(2, attempt);
            console.log(`[Publish] Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
      
      if (lastError) throw lastError;

      // Invalidate caches so main site gets fresh content
      queryClient.invalidateQueries({ queryKey: ['editorContent'] });
      queryClient.invalidateQueries({ queryKey: ['petition-content'] });

      setPublishSuccess(true);
      setHasUnpublishedChanges(false);

      toast({
        title: 'Published!',
        description: 'Your changes are now live.',
      });
    } catch (error: any) {
      console.error('Publish error:', error);
      toast({
        title: 'Publish failed',
        description: error.message || 'Failed to publish content',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEditorReset = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['editorContent'] });
  }, [queryClient]);

  // Show nothing while loading or redirecting
  if (authLoading || !isSessionReady || !user || contentLoading || content === null) {
    return null;
  }

  return (
    <EditorDocumentationLayout
      tocItems={tocItems}
      onPublish={handlePublish}
      isPublishing={isPublishing}
      hasPublishedContent={hasPublishedContent}
      hasUnpublishedChanges={hasUnpublishedChanges}
      publishSuccess={publishSuccess}
    >
      <EditorErrorBoundary onReset={handleEditorReset}>
        <PetitionEditor
          content={content}
          onContentChange={handleContentChange}
          onTocChange={handleTocChange}
        />
      </EditorErrorBoundary>
    </EditorDocumentationLayout>
  );
};

export default Editor;