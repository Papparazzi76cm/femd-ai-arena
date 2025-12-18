import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, Image as ImageIcon, GripVertical, Loader2 } from 'lucide-react';

interface EventImage {
  id: string;
  event_id: string;
  image_url: string;
  caption: string | null;
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
            display_order: images.length + newImages.length
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
      // Delete from database
      const { error } = await supabase
        .from('event_images')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Try to delete from storage (extract path from URL)
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
      <div className="flex items-center justify-between">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden group relative">
              <div className="aspect-square relative">
                <img
                  src={image.image_url}
                  alt={image.caption || 'Imagen del torneo'}
                  className="w-full h-full object-cover"
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
              <CardContent className="p-2">
                <Input
                  placeholder="Añadir descripción..."
                  value={image.caption || ''}
                  onChange={(e) => handleCaptionChange(image.id, e.target.value)}
                  className="text-xs h-8"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
