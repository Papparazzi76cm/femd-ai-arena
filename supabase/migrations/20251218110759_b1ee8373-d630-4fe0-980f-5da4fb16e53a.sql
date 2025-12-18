-- Add category column to event_images table
ALTER TABLE public.event_images 
ADD COLUMN category TEXT DEFAULT 'general';

-- Create index for filtering by category
CREATE INDEX idx_event_images_category ON public.event_images(event_id, category);