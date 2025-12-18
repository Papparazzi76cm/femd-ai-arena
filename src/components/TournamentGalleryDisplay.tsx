import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Filter } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'Todas', color: 'bg-muted' },
  { value: 'general', label: 'General', color: 'bg-gray-500' },
  { value: 'ceremonia', label: 'Ceremonia', color: 'bg-purple-500' },
  { value: 'partidos', label: 'Partidos', color: 'bg-emerald-500' },
  { value: 'aficion', label: 'Afición', color: 'bg-blue-500' },
  { value: 'premiacion', label: 'Premiación', color: 'bg-yellow-500' },
  { value: 'equipos', label: 'Equipos', color: 'bg-red-500' },
];

interface EventImage {
  id: string;
  image_url: string;
  caption: string | null;
  category: string | null;
  display_order: number;
}

interface TournamentGalleryDisplayProps {
  eventId: string;
}

export const TournamentGalleryDisplay = ({ eventId }: TournamentGalleryDisplayProps) => {
  const [images, setImages] = useState<EventImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const loadImages = async () => {
      try {
        const { data, error } = await supabase
          .from('event_images')
          .select('id, image_url, caption, category, display_order')
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

  const filteredImages = activeCategory === 'all' 
    ? images 
    : images.filter(img => img.category === activeCategory);

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === 0 ? filteredImages.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === filteredImages.length - 1 ? 0 : selectedIndex + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setSelectedIndex(null);
  };

  const getCategoryInfo = (category: string | null) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[1];
  };

  // Get available categories that have images
  const availableCategories = ['all', ...new Set(images.map(img => img.category || 'general'))];

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-emerald-600" />
          Galería de Fotos
        </h2>
        
        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {CATEGORIES.filter(cat => availableCategories.includes(cat.value)).map(cat => (
            <Button
              key={cat.value}
              variant={activeCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.value)}
              className={activeCategory === cat.value ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              <span className={`w-2 h-2 rounded-full ${cat.color} mr-2`} />
              {cat.label}
              {cat.value !== 'all' && (
                <span className="ml-1 text-xs opacity-70">
                  ({images.filter(img => (img.category || 'general') === cat.value).length})
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>
      
      {filteredImages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay imágenes en esta categoría
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredImages.map((image, index) => {
            const categoryInfo = getCategoryInfo(image.category);
            return (
              <Card
                key={image.id}
                className="overflow-hidden cursor-pointer group hover:ring-2 hover:ring-emerald-600 transition-all animate-fade-in"
                onClick={() => setSelectedIndex(index)}
              >
                <div className="aspect-square relative">
                  <img
                    src={image.image_url}
                    alt={image.caption || `Imagen ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Category Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge className={`${categoryInfo.color} text-white text-xs`}>
                      {categoryInfo.label}
                    </Badge>
                  </div>
                  {image.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs line-clamp-2">{image.caption}</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
            {filteredImages.length > 1 && (
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
            {selectedIndex !== null && filteredImages[selectedIndex] && (
              <div className="flex flex-col items-center max-h-[85vh] px-16">
                <img
                  src={filteredImages[selectedIndex].image_url}
                  alt={filteredImages[selectedIndex].caption || `Imagen ${selectedIndex + 1}`}
                  className="max-w-full max-h-[75vh] object-contain"
                />
                <div className="flex items-center gap-3 mt-4">
                  <Badge className={`${getCategoryInfo(filteredImages[selectedIndex].category).color} text-white`}>
                    {getCategoryInfo(filteredImages[selectedIndex].category).label}
                  </Badge>
                </div>
                {filteredImages[selectedIndex].caption && (
                  <p className="text-white text-center mt-2 px-4 max-w-2xl">
                    {filteredImages[selectedIndex].caption}
                  </p>
                )}
                <p className="text-white/60 text-sm mt-2">
                  {selectedIndex + 1} / {filteredImages.length}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
