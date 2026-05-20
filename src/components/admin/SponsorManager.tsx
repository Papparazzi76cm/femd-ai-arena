import { useState, useEffect, useRef } from 'react';
import { sponsorService } from '@/services/sponsorService';
import { Sponsor, Event } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X, Upload, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { eventService } from '@/services/eventService';

const TIER_OPTIONS = [
  { value: 'premium', label: 'Premium' },
  { value: 'oro', label: 'Oro' },
  { value: 'partner', label: 'Partner' },
];

const TIER_LABEL = (t: string | null | undefined) => {
  const v = (t || '').toLowerCase();
  return TIER_OPTIONS.find(o => o.value === v)?.label || (t || '—');
};

export const SponsorManager = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sponsorEvents, setSponsorEvents] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    website: '',
    tier: 'partner',
  });
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
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

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [sponsorsData, eventsData, { data: seData }] = await Promise.all([
        sponsorService.getAll(),
        eventService.getAll(),
        supabase.from('sponsor_events').select('sponsor_id, event_id'),
      ]);
      setSponsors(sponsorsData);
      setEvents(eventsData);
      const map: Record<string, string[]> = {};
      (seData || []).forEach((r: any) => {
        if (!map[r.sponsor_id]) map[r.sponsor_id] = [];
        map[r.sponsor_id].push(r.event_id);
      });
      setSponsorEvents(map);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const syncSponsorEvents = async (sponsorId: string, eventIds: string[]) => {
    // Replace assignments
    await supabase.from('sponsor_events').delete().eq('sponsor_id', sponsorId);
    if (eventIds.length > 0) {
      const rows = eventIds.map(event_id => ({ sponsor_id: sponsorId, event_id }));
      await supabase.from('sponsor_events').insert(rows);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sponsorData = {
        name: formData.name.trim(),
        logo_url: formData.logo_url.trim() || undefined,
        website: formData.website.trim() || undefined,
        tier: formData.tier || undefined,
      };
      let id = editingId;
      if (editingId) {
        await sponsorService.update(editingId, sponsorData);
      } else {
        const created = await sponsorService.create(sponsorData);
        id = created.id;
      }
      if (id) await syncSponsorEvents(id, selectedEventIds);
      toast({ title: editingId ? 'Patrocinador actualizado' : 'Patrocinador creado' });
      resetForm();
      loadAll();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar el patrocinador', variant: 'destructive' });
    }
  };

  const handleEdit = (sponsor: Sponsor) => {
    setFormData({
      name: sponsor.name,
      logo_url: sponsor.logo_url || '',
      website: sponsor.website || '',
      tier: (sponsor.tier || 'partner').toLowerCase(),
    });
    setSelectedEventIds(sponsorEvents[sponsor.id] || []);
    setEditingId(sponsor.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este patrocinador?')) return;
    try {
      await supabase.from('sponsor_events').delete().eq('sponsor_id', id);
      await sponsorService.delete(id);
      toast({ title: 'Patrocinador eliminado' });
      loadAll();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el patrocinador', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', logo_url: '', website: '', tier: 'partner' });
    setSelectedEventIds([]);
    setEditingId(null);
    setShowForm(false);
  };

  const toggleEvent = (id: string) => {
    setSelectedEventIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) return <div className="text-center py-8">Cargando patrocinadores...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Patrocinadores</h2>
        <Button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className="bg-emerald-600 hover:bg-emerald-700">
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
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required maxLength={100} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Logo</label>
                <div className="flex gap-2">
                  <Input value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} placeholder="URL del logo" type="url" className="flex-1" />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
                {formData.logo_url && (
                  <div className="mt-2 p-2 border rounded-md bg-muted/30 flex items-center justify-center h-24">
                    <img src={formData.logo_url} alt="Vista previa" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sitio Web</label>
                <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." type="url" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría *</label>
                <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {TIER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Torneos asignados</label>
                <p className="text-xs text-muted-foreground mb-2">Selecciona en qué torneos aparecerá este patrocinador. Si no marcas ninguno, no aparecerá en banners de torneos.</p>
                <div className="border rounded-md p-2 max-h-56 overflow-y-auto space-y-1 bg-background">
                  {events.length === 0 && <p className="text-sm text-muted-foreground p-2">No hay torneos creados</p>}
                  {events.map(ev => {
                    const checked = selectedEventIds.includes(ev.id);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => toggleEvent(ev.id)}
                        className={`w-full text-left flex items-center gap-2 p-2 rounded text-sm hover:bg-muted ${checked ? 'bg-primary/10' : ''}`}
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${checked ? 'bg-primary border-primary' : 'border-input'}`}>
                          {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                        </span>
                        <span className="truncate">{ev.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-2" />Guardar
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sponsors.map((sponsor) => {
          const assignedIds = sponsorEvents[sponsor.id] || [];
          return (
            <Card key={sponsor.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{sponsor.name}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(sponsor)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(sponsor.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sponsor.logo_url && <img src={sponsor.logo_url} alt={sponsor.name} className="w-full h-24 object-contain" />}
                <div className="flex flex-wrap gap-1 items-center">
                  <Badge variant={(sponsor.tier || '').toLowerCase() === 'premium' ? 'default' : 'secondary'}>{TIER_LABEL(sponsor.tier)}</Badge>
                  <span className="text-xs text-muted-foreground">{assignedIds.length} torneo(s)</span>
                </div>
                {sponsor.website && (
                  <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline block">Visitar sitio web</a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
