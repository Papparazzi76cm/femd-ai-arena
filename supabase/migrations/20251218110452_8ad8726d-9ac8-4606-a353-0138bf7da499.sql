-- Create a table for event/tournament gallery images
CREATE TABLE public.event_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.event_images ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Event images are viewable by everyone" 
ON public.event_images 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert event images" 
ON public.event_images 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update event images" 
ON public.event_images 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete event images" 
ON public.event_images 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_event_images_event_id ON public.event_images(event_id);
CREATE INDEX idx_event_images_display_order ON public.event_images(event_id, display_order);