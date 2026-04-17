import { useState, useEffect, useRef } from 'react';
import { sponsorService } from '@/services/sponsorService';
import { Sponsor } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const SponsorManager = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    website: '',
    tier: ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Selecciona un archivo de imagen', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `sponsors/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('imagenes-web')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('imagenes-web').getPublicUrl(fileName);
      setFormData((prev) => ({ ...prev, logo_url: publicData.publicUrl }));
      toast({ title: 'Logo subido con éxito' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo subir el logo', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    loadSponsors();
  }, []);

  const loadSponsors = async () => {
    try {
      const data = await sponsorService.getAll();
      setSponsors(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los patrocinadores',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sponsorData = {
        name: formData.name.trim(),
        logo_url: formData.logo_url.trim() || undefined,
        website: formData.website.trim() || undefined,
        tier: formData.tier.trim() || undefined
      };

      if (editingId) {
        await sponsorService.update(editingId, sponsorData);
        toast({ title: 'Patrocinador actualizado con éxito' });
      } else {
        await sponsorService.create(sponsorData);
        toast({ title: 'Patrocinador creado con éxito' });
      }

      resetForm();
      loadSponsors();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el patrocinador',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (sponsor: Sponsor) => {
    setFormData({
      name: sponsor.name,
      logo_url: sponsor.logo_url || '',
      website: sponsor.website || '',
      tier: sponsor.tier || ''
    });
    setEditingId(sponsor.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este patrocinador?')) return;

    try {
      await sponsorService.delete(id);
      toast({ title: 'Patrocinador eliminado con éxito' });
      loadSponsors();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el patrocinador',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', logo_url: '', website: '', tier: '' });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando patrocinadores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Patrocinadores</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Nuevo Patrocinador'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Patrocinador' : 'Nuevo Patrocinador'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del patrocinador"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL del Logo</label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sitio Web</label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <Input
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  placeholder="Oro, Plata, Bronce..."
                  maxLength={50}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sponsors.map((sponsor) => (
          <Card key={sponsor.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{sponsor.name}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(sponsor)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(sponsor.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sponsor.logo_url && (
                <img src={sponsor.logo_url} alt={sponsor.name} className="w-full h-24 object-contain" />
              )}
              {sponsor.tier && (
                <p className="text-sm"><strong>Categoría:</strong> {sponsor.tier}</p>
              )}
              {sponsor.website && (
                <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline">
                  Visitar sitio web
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
