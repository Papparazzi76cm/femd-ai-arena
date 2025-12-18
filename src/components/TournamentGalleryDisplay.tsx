import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Filter, LayoutGrid, List, Play, Pause, Download, CheckSquare, Square } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [selectedForDownload, setSelectedForDownload] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const slideshowRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

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

  // Get available categories that have images
  const availableCategories = ['all', ...new Set(images.map(img => img.category || 'general'))];

  // Slideshow logic
  useEffect(() => {
    if (isSlideshow && selectedIndex !== null && filteredImages.length > 1) {
      slideshowRef.current = setInterval(() => {
        setSelectedIndex(prev => {
          if (prev === null) return 0;
          return prev === filteredImages.length - 1 ? 0 : prev + 1;
        });
      }, 4000);
    }
    return () => {
      if (slideshowRef.current) {
        clearInterval(slideshowRef.current);
      }
    };
  }, [isSlideshow, selectedIndex, filteredImages.length]);

  const toggleSlideshow = useCallback(() => {
    if (!isSlideshow && selectedIndex === null) {
      setSelectedIndex(0);
    }
    setIsSlideshow(prev => !prev);
  }, [isSlideshow, selectedIndex]);

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
    if (e.key === 'Escape') {
      setSelectedIndex(null);
      setIsSlideshow(false);
    }
    if (e.key === ' ') {
      e.preventDefault();
      toggleSlideshow();
    }
  };

  const getCategoryInfo = (category: string | null) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[1];
  };

  // Download functions
  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast({ title: 'Error al descargar la imagen', variant: 'destructive' });
    }
  };

  const downloadSingleImage = (image: EventImage, index: number) => {
    const filename = image.caption 
      ? `${image.caption.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.jpg`
      : `imagen_${index + 1}.jpg`;
    downloadImage(image.image_url, filename);
    toast({ title: 'Descargando imagen...' });
  };

  const downloadSelectedImages = async () => {
    if (selectedForDownload.size === 0) {
      toast({ title: 'Selecciona al menos una imagen', variant: 'destructive' });
      return;
    }

    toast({ title: `Descargando ${selectedForDownload.size} imágenes...` });

    const imagesToDownload = filteredImages.filter(img => selectedForDownload.has(img.id));
    for (let i = 0; i < imagesToDownload.length; i++) {
      const img = imagesToDownload[i];
      const filename = img.caption 
        ? `${img.caption.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.jpg`
        : `imagen_${i + 1}.jpg`;
      await downloadImage(img.image_url, filename);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setSelectedForDownload(new Set());
    setSelectionMode(false);
    toast({ title: 'Descarga completada' });
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedForDownload);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedForDownload(newSelection);
  };

  const selectAllImages = () => {
    if (selectedForDownload.size === filteredImages.length) {
      setSelectedForDownload(new Set());
    } else {
      setSelectedForDownload(new Set(filteredImages.map(img => img.id)));
    }
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-emerald-600" />
          Galería de Fotos
        </h2>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Slideshow Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSlideshow}
            className={isSlideshow ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
          >
            {isSlideshow ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isSlideshow ? 'Pausar' : 'Presentación'}
          </Button>

          {/* Selection Mode Toggle */}
          <Button
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedForDownload(new Set());
            }}
            className={selectionMode ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            Seleccionar
          </Button>

          {selectionMode && (
            <>
              <Button variant="outline" size="sm" onClick={selectAllImages}>
                <Square className="w-4 h-4 mr-1" />
                {selectedForDownload.size === filteredImages.length ? 'Deseleccionar' : 'Todas'}
              </Button>
              <Button
                size="sm"
                onClick={downloadSelectedImages}
                disabled={selectedForDownload.size === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 mr-1" />
                Descargar ({selectedForDownload.size})
              </Button>
            </>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filter Row */}
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
      
      {filteredImages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay imágenes en esta categoría
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredImages.map((image, index) => {
            const categoryInfo = getCategoryInfo(image.category);
            const isSelected = selectedForDownload.has(image.id);
            return (
              <Card
                key={image.id}
                className={`overflow-hidden cursor-pointer group transition-all animate-fade-in ${
                  isSelected ? 'ring-2 ring-emerald-600' : 'hover:ring-2 hover:ring-emerald-600'
                }`}
                onClick={() => {
                  if (selectionMode) {
                    toggleImageSelection(image.id);
                  } else {
                    setSelectedIndex(index);
                  }
                }}
              >
                <div className="aspect-square relative">
                  <img
                    src={image.image_url}
                    alt={image.caption || `Imagen ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {selectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-emerald-600' : 'bg-black/50'
                      }`}>
                        {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className={`${categoryInfo.color} text-white text-xs`}>
                      {categoryInfo.label}
                    </Badge>
                  </div>
                  {!selectionMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSingleImage(image, index);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
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
      ) : (
        // List View
        <div className="space-y-3">
          {filteredImages.map((image, index) => {
            const categoryInfo = getCategoryInfo(image.category);
            const isSelected = selectedForDownload.has(image.id);
            return (
              <Card
                key={image.id}
                className={`overflow-hidden cursor-pointer group transition-all animate-fade-in ${
                  isSelected ? 'ring-2 ring-emerald-600' : 'hover:ring-2 hover:ring-emerald-600'
                }`}
                onClick={() => {
                  if (selectionMode) {
                    toggleImageSelection(image.id);
                  } else {
                    setSelectedIndex(index);
                  }
                }}
              >
                <div className="flex items-center gap-4 p-3">
                  {selectionMode && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-emerald-600' : 'bg-muted'
                    }`}>
                      {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                    </div>
                  )}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden">
                    <img
                      src={image.image_url}
                      alt={image.caption || `Imagen ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${categoryInfo.color} text-white text-xs`}>
                        {categoryInfo.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </div>
                    {image.caption ? (
                      <p className="text-sm text-foreground line-clamp-3">{image.caption}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Sin descripción</p>
                    )}
                  </div>
                  {!selectionMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSingleImage(image, index);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedIndex(null);
          setIsSlideshow(false);
        }
      }}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] p-0 bg-black/95 border-none"
          onKeyDown={handleKeyDown}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={toggleSlideshow}
                >
                  {isSlideshow ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isSlideshow ? 'Pausar' : 'Presentación'}
                </Button>
                {selectedIndex !== null && filteredImages[selectedIndex] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={() => downloadSingleImage(filteredImages[selectedIndex], selectedIndex)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Descargar
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  setSelectedIndex(null);
                  setIsSlideshow(false);
                }}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

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
              <div className="flex flex-col items-center max-h-[85vh] px-16 pt-16">
                <img
                  src={filteredImages[selectedIndex].image_url}
                  alt={filteredImages[selectedIndex].caption || `Imagen ${selectedIndex + 1}`}
                  className={`max-w-full max-h-[70vh] object-contain transition-opacity duration-500 ${isSlideshow ? 'animate-fade-in' : ''}`}
                />
                <div className="flex items-center gap-3 mt-4">
                  <Badge className={`${getCategoryInfo(filteredImages[selectedIndex].category).color} text-white`}>
                    {getCategoryInfo(filteredImages[selectedIndex].category).label}
                  </Badge>
                  {isSlideshow && (
                    <Badge className="bg-emerald-600 text-white animate-pulse">
                      Presentación
                    </Badge>
                  )}
                </div>
                {filteredImages[selectedIndex].caption && (
                  <p className="text-white text-center mt-2 px-4 max-w-2xl">
                    {filteredImages[selectedIndex].caption}
                  </p>
                )}
                <p className="text-white/60 text-sm mt-2">
                  {selectedIndex + 1} / {filteredImages.length}
                  {isSlideshow && <span className="ml-2">(Espacio para pausar)</span>}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
