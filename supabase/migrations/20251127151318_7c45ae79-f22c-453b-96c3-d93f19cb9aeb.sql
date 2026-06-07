-- Create petition_content table for storing editor content
CREATE TABLE public.petition_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL DEFAULT '{}',
  is_published boolean DEFAULT false,
  is_draft boolean DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id)
);

-- Create petition_content_versions table for version history
CREATE TABLE public.petition_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.petition_content(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  version integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.petition_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_content_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for petition_content
CREATE POLICY "Admins can view all petition content"
ON public.petition_content
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert petition content"
ON public.petition_content
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update petition content"
ON public.petition_content
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete petition content"
ON public.petition_content
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Stakeholders can view published content"
ON public.petition_content
FOR SELECT
USING (is_published = true);

-- RLS Policies for petition_content_versions
CREATE POLICY "Admins can view all versions"
ON public.petition_content_versions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert versions"
ON public.petition_content_versions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete versions"
ON public.petition_content_versions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for editor images
INSERT INTO storage.buckets (id, name, public) VALUES ('editor_images', 'editor_images', true);

-- Storage policies for editor_images bucket
CREATE POLICY "Admins can upload editor images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'editor_images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update editor images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'editor_images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete editor images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'editor_images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view editor images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'editor_images');

-- Add trigger for updated_at
CREATE TRIGGER update_petition_content_updated_at
BEFORE UPDATE ON public.petition_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();