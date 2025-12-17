import { useState, useEffect } from 'react';
import { eventService } from '@/services/eventService';
import { teamService } from '@/services/teamService';
import { Event, Team } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X, Calendar, Upload, Trophy, History as HistoryIcon, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TournamentManager } from './TournamentManager';
import { HistoricalTournamentManager } from './HistoricalTournamentManager';

export const EventManager = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);
  const [tournamentMode, setTournamentMode] = useState<'automatic' | 'historical'>('automatic');
  const [showTeamsDialog, setShowTeamsDialog] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    poster_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsData, teamsData] = await Promise.all([
        eventService.getAll(),
        teamService.getAll()
      ]);
      setEvents(eventsData);
      setTeams(teamsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        date: formData.date,
        location: formData.location.trim() || undefined,
        poster_url: formData.poster_url.trim() || undefined,
        team_ids: selectedTeamIds
      };

      if (editingId) {
        await eventService.update(editingId, eventData);
        toast({ title: 'Evento actualizado con éxito' });
      } else {
        await eventService.create(eventData);
        toast({ title: 'Evento creado con éxito' });
      }

      resetForm();
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el evento',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (event: Event) => {
    setFormData({
      title: event.title,
      description: event.description || '',
      date: event.date.split('T')[0],
      location: event.location || '',
      poster_url: (event as any).poster_url || ''
    });
    setSelectedTeamIds((event as any).team_ids || []);
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;

    try {
      await eventService.delete(id);
      toast({ title: 'Evento eliminado con éxito' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el evento',
        variant: 'destructive'
      });
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo de imagen',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen no puede superar los 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('carteles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('carteles')
        .getPublicUrl(filePath);

      setFormData({ ...formData, poster_url: publicUrl });
      
      toast({
        title: 'Cartel subido',
        description: 'El cartel se ha subido correctamente'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo subir el cartel',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', date: '', location: '', poster_url: '' });
    setSelectedTeamIds([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  if (loading) {
    return <div className="text-center py-8">Cargando eventos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Eventos</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Nuevo Evento'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Evento' : 'Nuevo Evento'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título del evento"
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del evento"
                  maxLength={1000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha *</label>
                  <Input
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    type="date"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ubicación</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ubicación del evento"
                    maxLength={200}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cartel del Evento</label>
                <div className="space-y-2">
                  {formData.poster_url && (
                    <div className="flex items-center gap-2">
                      <img src={formData.poster_url} alt="Cartel preview" className="w-24 h-32 object-cover border rounded" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, poster_url: '' })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterUpload}
                      disabled={uploading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Subiendo...' : 'Subir'}
                    </Button>
                  </div>
                  <Input
                    value={formData.poster_url}
                    onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                    placeholder="O pega la URL directamente"
                    type="url"
                  />
                </div>
              </div>
              
              {/* Team Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Equipos Participantes</label>
                <Dialog open={showTeamsDialog} onOpenChange={setShowTeamsDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      {selectedTeamIds.length > 0 
                        ? `${selectedTeamIds.length} equipo(s) seleccionado(s)` 
                        : 'Añadir equipos'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Seleccionar Equipos</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-2">
                        {teams.map(team => (
                          <div 
                            key={team.id} 
                            className="flex items-center space-x-3 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleTeamToggle(team.id)}
                          >
                            <Checkbox 
                              checked={selectedTeamIds.includes(team.id)}
                              onCheckedChange={() => handleTeamToggle(team.id)}
                            />
                            {team.logo_url && (
                              <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />
                            )}
                            <span className="flex-1">{team.name}</span>
                          </div>
                        ))}
                        {teams.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No hay equipos registrados
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        {selectedTeamIds.length} seleccionado(s)
                      </span>
                      <Button onClick={() => setShowTeamsDialog(false)}>
                        Confirmar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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

      <div className="space-y-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{event.title}</span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={expandedTournament === event.id ? "default" : "outline"}
                    onClick={() => setExpandedTournament(expandedTournament === event.id ? null : event.id)}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Gestionar Torneo
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(event)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(event.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {(event as any).poster_url && (
                    <img src={(event as any).poster_url} alt={event.title} className="w-full h-48 object-cover rounded" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString('es-ES')}
                  </div>
                  {event.location && (
                    <p className="text-sm"><strong>Ubicación:</strong> {event.location}</p>
                  )}
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}
                </div>
              </div>
              
              {expandedTournament === event.id && (
                <div className="border-t pt-4">
                  <Tabs value={tournamentMode} onValueChange={(v: any) => setTournamentMode(v)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="automatic">
                        <Trophy className="w-4 h-4 mr-2" />
                        Torneo Automático
                      </TabsTrigger>
                      <TabsTrigger value="historical">
                        <HistoryIcon className="w-4 h-4 mr-2" />
                        Entrada Manual
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="automatic" className="mt-4">
                      <TournamentManager eventId={event.id} />
                    </TabsContent>
                    
                    <TabsContent value="historical" className="mt-4">
                      <HistoricalTournamentManager eventId={event.id} />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
