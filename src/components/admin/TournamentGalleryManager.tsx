import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, Image as ImageIcon, GripVertical, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-gray-500' },
  { value: 'ceremonia', label: 'Ceremonia', color: 'bg-purple-500' },
  { value: 'partidos', label: 'Partidos', color: 'bg-emerald-500' },
  { value: 'aficion', label: 'Afición', color: 'bg-blue-500' },
  { value: 'premiacion', label: 'Premiación', color: 'bg-yellow-500' },
  { value: 'equipos', label: 'Equipos', color: 'bg-red-500' },
];

interface EventImage {
  id: string;
  event_id: string;
  image_url: string;
  caption: string | null;
  category: string | null;
  display_order: number;
  created_at: string;
}

interface TournamentGalleryManagerProps {
  eventId: string;
}

export const TournamentGalleryManager = ({ eventId }: TournamentGalleryManagerProps) => {
  const [images, setImages] = useState<EventImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadImages();
  }, [eventId]);

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('event_images')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las imágenes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: EventImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Error',
            description: `${file.name} no es una imagen válida`,
            variant: 'destructive'
          });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'Error',
            description: `${file.name} supera los 10MB`,
            variant: 'destructive'
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('imagenes-torneos')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('imagenes-torneos')
          .getPublicUrl(fileName);

        const { data: insertedImage, error: insertError } = await supabase
          .from('event_images')
          .insert({
            event_id: eventId,
            image_url: publicUrl,
            display_order: images.length + newImages.length,
            category: 'general'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          continue;
        }

        newImages.push(insertedImage);
      }

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        toast({
          title: 'Imágenes subidas',
          description: `Se han subido ${newImages.length} imagen(es)`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al subir las imágenes',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return;

    try {
      const { error } = await supabase
        .from('event_images')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const urlParts = imageUrl.split('/imagenes-torneos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('imagenes-torneos').remove([filePath]);
      }

      setImages(prev => prev.filter(img => img.id !== id));
      toast({ title: 'Imagen eliminada' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la imagen',
        variant: 'destructive'
      });
    }
  };

  const handleCaptionChange = async (id: string, caption: string) => {
    try {
      const { error } = await supabase
        .from('event_images')
        .update({ caption })
        .eq('id', id);

      if (error) throw error;

      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, caption } : img
      ));
    } catch (error) {
      console.error('Error updating caption:', error);
    }
  };

  const handleCategoryChange = async (id: string, category: string) => {
    try {
      const { error } = await supabase
        .from('event_images')
        .update({ category })
        .eq('id', id);

      if (error) throw error;

      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, category } : img
      ));
      
      toast({ title: 'Categoría actualizada' });
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    // Update display_order for all affected images
    const updatedImages = newImages.map((img, idx) => ({
      ...img,
      display_order: idx
    }));

    setImages(updatedImages);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Update in database
    try {
      const updates = updatedImages.map(img => 
        supabase
          .from('event_images')
          .update({ display_order: img.display_order })
          .eq('id', img.id)
      );
      
      await Promise.all(updates);
      toast({ title: 'Orden actualizado' });
    } catch (error) {
      console.error('Error updating order:', error);
      loadImages(); // Reload on error
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getCategoryInfo = (category: string | null) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Cargando galería...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Galería de Imágenes ({images.length})
        </h3>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            id={`gallery-upload-${eventId}`}
          />
          <label htmlFor={`gallery-upload-${eventId}`}>
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="cursor-pointer"
              asChild
            >
              <span>
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? 'Subiendo...' : 'Subir Imágenes'}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <Badge key={cat.value} variant="outline" className="text-xs">
            <span className={`w-2 h-2 rounded-full ${cat.color} mr-1`} />
            {cat.label}
          </Badge>
        ))}
      </div>

      {images.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No hay imágenes en la galería</p>
            <label htmlFor={`gallery-upload-${eventId}`}>
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir primera imagen
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Arrastra las imágenes para reordenarlas
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => {
              const categoryInfo = getCategoryInfo(image.category);
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              
              return (
                <Card 
                  key={image.id} 
                  className={`overflow-hidden group relative transition-all duration-200 ${
                    isDragging ? 'opacity-50 scale-95' : ''
                  } ${isDragOver ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="aspect-square relative">
                    {/* Drag Handle */}
                    <div className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing bg-black/50 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* Category Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className={`${categoryInfo.color} text-white text-xs`}>
                        {categoryInfo.label}
                      </Badge>
                    </div>
                    
                    <img
                      src={image.image_url}
                      alt={image.caption || 'Imagen del torneo'}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(image.id, image.image_url)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-2 space-y-2">
                    <Select 
                      value={image.category || 'general'} 
                      onValueChange={(value) => handleCategoryChange(image.id, value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Añadir descripción..."
                      value={image.caption || ''}
                      onChange={(e) => handleCaptionChange(image.id, e.target.value)}
                      className="text-xs h-8"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
