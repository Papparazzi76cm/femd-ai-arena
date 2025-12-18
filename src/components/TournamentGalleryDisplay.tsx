import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';

interface EventImage {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
}

interface TournamentGalleryDisplayProps {
  eventId: string;
}

export const TournamentGalleryDisplay = ({ eventId }: TournamentGalleryDisplayProps) => {
  const [images, setImages] = useState<EventImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const { data, error } = await supabase
          .from('event_images')
          .select('id, image_url, caption, display_order')
          .eq('event_id', eventId)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setImages(data || []);
      } catch (error) {
        console.error('Error loading gallery:', error);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [eventId]);

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setSelectedIndex(null);
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <ImageIcon className="w-6 h-6 text-emerald-600" />
        Galería de Fotos
      </h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image, index) => (
          <Card
            key={image.id}
            className="overflow-hidden cursor-pointer group hover:ring-2 hover:ring-emerald-600 transition-all"
            onClick={() => setSelectedIndex(index)}
          >
            <div className="aspect-square relative">
              <img
                src={image.image_url}
                alt={image.caption || `Imagen ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {image.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs line-clamp-2">{image.caption}</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] p-0 bg-black/95 border-none"
          onKeyDown={handleKeyDown}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-10 text-white hover:bg-white/20 h-12 w-12"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-10 text-white hover:bg-white/20 h-12 w-12"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            {/* Image */}
            {selectedIndex !== null && (
              <div className="flex flex-col items-center max-h-[85vh] px-16">
                <img
                  src={images[selectedIndex].image_url}
                  alt={images[selectedIndex].caption || `Imagen ${selectedIndex + 1}`}
                  className="max-w-full max-h-[75vh] object-contain"
                />
                {images[selectedIndex].caption && (
                  <p className="text-white text-center mt-4 px-4 max-w-2xl">
                    {images[selectedIndex].caption}
                  </p>
                )}
                <p className="text-white/60 text-sm mt-2">
                  {selectedIndex + 1} / {images.length}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
