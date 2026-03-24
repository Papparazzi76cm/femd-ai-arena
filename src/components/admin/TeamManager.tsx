import { useState, useEffect } from 'react';
import { teamService } from '@/services/teamService';
import { participantService } from '@/services/participantService';
import { Team, Participant } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X, Upload, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const TeamManager = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    description: '',
    founded_year: '',
    colors: '',
    is_filial: false,
    parent_team_id: '',
    country: '',
    province: '',
    city: ''
  });
  const [participantFormData, setParticipantFormData] = useState({
    name: '',
    position: '',
    number: '',
    photo_url: '',
    birth_date: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const data = await teamService.getAll();
      setTeams(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los equipos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const teamData: any = {
        name: formData.name.trim(),
        logo_url: formData.logo_url.trim() || undefined,
        description: formData.description.trim() || undefined,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : undefined,
        colors: formData.colors.trim() || undefined,
        parent_team_id: formData.is_filial && formData.parent_team_id ? formData.parent_team_id : null,
        country: formData.country.trim() || null,
        province: formData.province.trim() || null,
        city: formData.city.trim() || null,
      };

      if (editingId) {
        await teamService.update(editingId, teamData);
        toast({ title: 'Equipo actualizado con éxito' });
      } else {
        await teamService.create(teamData);
        toast({ title: 'Equipo creado con éxito' });
      }

      resetForm();
      loadTeams();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el equipo',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (team: Team) => {
    setFormData({
      name: team.name,
      logo_url: team.logo_url || '',
      description: team.description || '',
      founded_year: team.founded_year?.toString() || '',
      colors: team.colors || '',
      is_filial: !!team.parent_team_id,
      parent_team_id: team.parent_team_id || '',
      country: team.country || '',
      province: team.province || '',
      city: team.city || '',
    });
    setEditingId(team.id);
    setShowForm(true);
    setShowParticipants(false);
    loadParticipants(team.id);
  };

  const loadParticipants = async (teamId: string) => {
    try {
      const data = await participantService.getByTeam(teamId);
      setParticipants(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los participantes',
        variant: 'destructive'
      });
    }
  };

  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const participantData = {
        team_id: editingId,
        name: participantFormData.name.trim(),
        position: participantFormData.position.trim() || undefined,
        number: participantFormData.number ? parseInt(participantFormData.number) : undefined,
        photo_url: participantFormData.photo_url.trim() || undefined,
        birth_date: participantFormData.birth_date || undefined
      };

      if (editingParticipantId) {
        await participantService.update(editingParticipantId, participantData);
        toast({ title: 'Participante actualizado con éxito' });
      } else {
        await participantService.create(participantData);
        toast({ title: 'Participante creado con éxito' });
      }

      resetParticipantForm();
      loadParticipants(editingId);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el participante',
        variant: 'destructive'
      });
    }
  };

  const handleEditParticipant = (participant: Participant) => {
    setParticipantFormData({
      name: participant.name,
      position: participant.position || '',
      number: participant.number?.toString() || '',
      photo_url: participant.photo_url || '',
      birth_date: participant.birth_date || ''
    });
    setEditingParticipantId(participant.id);
    setShowParticipantForm(true);
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este participante?')) return;

    try {
      await participantService.delete(id);
      toast({ title: 'Participante eliminado con éxito' });
      if (editingId) loadParticipants(editingId);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el participante',
        variant: 'destructive'
      });
    }
  };

  const resetParticipantForm = () => {
    setParticipantFormData({ name: '', position: '', number: '', photo_url: '', birth_date: '' });
    setEditingParticipantId(null);
    setShowParticipantForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este equipo?')) return;

    try {
      await teamService.delete(id);
      toast({ title: 'Equipo eliminado con éxito' });
      loadTeams();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el equipo',
        variant: 'destructive'
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen no puede superar los 2MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagenes-web')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('imagenes-web')
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
      
      toast({
        title: 'Imagen subida',
        description: 'El escudo se ha subido correctamente'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo subir la imagen',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', logo_url: '', description: '', founded_year: '', colors: '', is_filial: false, parent_team_id: '' });
    setEditingId(null);
    setShowForm(false);
    setShowParticipants(false);
    setParticipants([]);
    resetParticipantForm();
  };

  if (loading) {
    return <div className="text-center py-8">Cargando equipos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Equipos</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Nuevo Equipo'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Equipo' : 'Nuevo Equipo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del equipo"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Escudo del Club</label>
                <div className="space-y-2">
                  {formData.logo_url && (
                    <div className="flex items-center gap-2">
                      <img src={formData.logo_url} alt="Logo preview" className="w-16 h-16 object-contain border rounded" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
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
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="O pega la URL directamente"
                    type="url"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del equipo"
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Año de Fundación</label>
                  <Input
                    value={formData.founded_year}
                    onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                    placeholder="2020"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Colores</label>
                  <Input
                    value={formData.colors}
                    onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                    placeholder="Rojo y Blanco"
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Filial toggle */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_filial"
                    checked={formData.is_filial}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_filial: !!checked, parent_team_id: checked ? formData.parent_team_id : '' })}
                  />
                  <label htmlFor="is_filial" className="text-sm font-medium cursor-pointer">
                    Es equipo filial (B, C, etc.)
                  </label>
                </div>
                {formData.is_filial && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Club principal *</label>
                    <Select
                      value={formData.parent_team_id}
                      onValueChange={(value) => setFormData({ ...formData, parent_team_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el club principal" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams
                          .filter(t => !t.parent_team_id && t.id !== editingId)
                          .map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
                {editingId && (
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => setShowParticipants(!showParticipants)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {showParticipants ? 'Ocultar' : 'Gestionar'} Participantes
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showParticipants && editingId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Participantes del Equipo</span>
              <Button 
                size="sm"
                onClick={() => setShowParticipantForm(!showParticipantForm)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {showParticipantForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {showParticipantForm ? 'Cancelar' : 'Nuevo Participante'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showParticipantForm && (
              <form onSubmit={handleParticipantSubmit} className="space-y-4 p-4 border rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre *</label>
                  <Input
                    value={participantFormData.name}
                    onChange={(e) => setParticipantFormData({ ...participantFormData, name: e.target.value })}
                    placeholder="Nombre completo"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Posición</label>
                    <Input
                      value={participantFormData.position}
                      onChange={(e) => setParticipantFormData({ ...participantFormData, position: e.target.value })}
                      placeholder="Delantero, Defensa..."
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dorsal</label>
                    <Input
                      value={participantFormData.number}
                      onChange={(e) => setParticipantFormData({ ...participantFormData, number: e.target.value })}
                      placeholder="10"
                      type="number"
                      min="0"
                      max="99"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Nacimiento</label>
                  <Input
                    value={participantFormData.birth_date}
                    onChange={(e) => setParticipantFormData({ ...participantFormData, birth_date: e.target.value })}
                    type="date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL de Foto</label>
                  <Input
                    value={participantFormData.photo_url}
                    onChange={(e) => setParticipantFormData({ ...participantFormData, photo_url: e.target.value })}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="w-4 h-4 mr-2" />
                    {editingParticipantId ? 'Actualizar' : 'Guardar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetParticipantForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            <div className="grid gap-3">
              {participants.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No hay participantes en este equipo
                </p>
              ) : (
                participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {participant.photo_url && (
                        <img 
                          src={participant.photo_url} 
                          alt={participant.name} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {participant.position && `${participant.position}`}
                          {participant.number && ` · #${participant.number}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEditParticipant(participant)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteParticipant(participant.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span>{team.name}</span>
                  {team.parent_team_id && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (Filial de {teams.find(t => t.id === team.parent_team_id)?.name})
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(team)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(team.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {team.logo_url && (
                <img src={team.logo_url} alt={team.name} className="w-20 h-20 object-contain" />
              )}
              {team.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{team.description}</p>
              )}
              {team.colors && (
                <p className="text-sm"><strong>Colores:</strong> {team.colors}</p>
              )}
              {team.founded_year && (
                <p className="text-sm"><strong>Fundado:</strong> {team.founded_year}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
