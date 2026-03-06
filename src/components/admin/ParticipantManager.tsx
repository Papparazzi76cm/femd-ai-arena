import { useState, useEffect } from 'react';
import { participantService } from '@/services/participantService';
import { teamService } from '@/services/teamService';
import { Participant, Team } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X, Upload, History, ArrowRightLeft, Filter } from 'lucide-react';
import { PlayerTeamChangeDialog } from './PlayerTeamChangeDialog';
import { PlayerTransferDialog } from './PlayerTransferDialog';
import { playerHistoryService, PlayerTeamHistory } from '@/services/playerHistoryService';

export const ParticipantManager = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    team_id: '',
    name: '',
    position: '',
    number: '',
    photo_url: '',
    birth_date: ''
  });
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferParticipant, setTransferParticipant] = useState<Participant | null>(null);
  const [playerHistories, setPlayerHistories] = useState<Record<string, PlayerTeamHistory[]>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [participantsData, teamsData] = await Promise.all([
        participantService.getAll(),
        teamService.getAll()
      ]);
      setParticipants(participantsData);
      setTeams(teamsData);

      // Load histories for all participants
      const histories: Record<string, PlayerTeamHistory[]> = {};
      await Promise.all(
        participantsData.map(async (p) => {
          try {
            histories[p.id] = await playerHistoryService.getByPlayer(p.id);
          } catch { histories[p.id] = []; }
        })
      );
      setPlayerHistories(histories);
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
      const participantData = {
        team_id: formData.team_id || undefined,
        name: formData.name.trim(),
        position: formData.position.trim() || undefined,
        number: formData.number ? parseInt(formData.number) : undefined,
        photo_url: formData.photo_url.trim() || undefined,
        birth_date: formData.birth_date || undefined
      };

      if (editingId) {
        await participantService.update(editingId, participantData);
        toast({ title: 'Participante actualizado con éxito' });
      } else {
        await participantService.create(participantData);
        toast({ title: 'Participante creado con éxito' });
      }

      resetForm();
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el participante',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (participant: Participant) => {
    setFormData({
      team_id: participant.team_id || '',
      name: participant.name,
      position: participant.position || '',
      number: participant.number?.toString() || '',
      photo_url: participant.photo_url || '',
      birth_date: participant.birth_date || ''
    });
    setEditingId(participant.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este participante?')) return;

    try {
      await participantService.delete(id);
      toast({ title: 'Participante eliminado con éxito' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el participante',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({ team_id: '', name: '', position: '', number: '', photo_url: '', birth_date: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      let successCount = 0;
      let errorCount = 0;

      for (const line of dataLines) {
        // CSV format: team_name,name,position,number,photo_url,birth_date
        const [teamName, name, position, number, photo_url, birth_date] = line.split(',').map(s => s.trim());
        
        if (!name) continue;

        try {
          // Find team by name
          const team = teams.find(t => t.name.toLowerCase() === teamName?.toLowerCase());
          
          const participantData = {
            team_id: team?.id,
            name: name,
            position: position || undefined,
            number: number ? parseInt(number) : undefined,
            photo_url: photo_url || undefined,
            birth_date: birth_date || undefined
          };

          await participantService.create(participantData);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Error importing participant:', name, error);
        }
      }

      toast({
        title: 'Importación completada',
        description: `${successCount} participantes importados correctamente. ${errorCount > 0 ? `${errorCount} errores.` : ''}`
      });

      loadData();
      
      // Reset file input
      e.target.value = '';
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo procesar el archivo CSV',
        variant: 'destructive'
      });
    }
  };

  const filteredParticipants = filterTeamId === 'all'
    ? participants
    : filterTeamId === 'none'
      ? participants.filter(p => !p.team_id)
      : participants.filter(p => p.team_id === filterTeamId);

  const getTeamName = (teamId?: string) => {
    if (!teamId) return 'Sin equipo';
    return teams.find(t => t.id === teamId)?.name || 'Sin equipo';
  };

  if (loading) {
    return <div className="text-center py-8">Cargando participantes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Participantes</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('csv-upload')?.click()}
            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700">
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancelar' : 'Nuevo Participante'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterTeamId} onValueChange={setFilterTeamId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filtrar por equipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            <SelectItem value="none">Sin equipo</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredParticipants.length} jugador(es)</span>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Participante' : 'Nuevo Participante'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del participante"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Equipo</label>
                <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Posición</label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Delantero, Defensa..."
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Número</label>
                  <Input
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="10"
                    type="number"
                    min="0"
                    max="99"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL de Foto</label>
                <Input
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Nacimiento</label>
                <Input
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  type="date"
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <Card key={participant.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{participant.name}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setTransferParticipant(participant);
                    setTransferDialogOpen(true);
                  }} title="Traspaso a otro club">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setSelectedParticipant(participant);
                    setHistoryDialogOpen(true);
                  }} title="Historial de equipos">
                    <History className="w-4 h-4 text-emerald-600" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(participant)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(participant.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {participant.photo_url && (
                <img src={participant.photo_url} alt={participant.name} className="w-20 h-20 object-cover rounded-full" />
              )}
              <p className="text-sm"><strong>Equipo:</strong> {getTeamName(participant.team_id)}</p>
              {participant.position && (
                <p className="text-sm"><strong>Posición:</strong> {participant.position}</p>
              )}
              {participant.number && (
                <p className="text-sm"><strong>Número:</strong> {participant.number}</p>
              )}

              {/* Histórico de clubes */}
              {playerHistories[participant.id] && playerHistories[participant.id].length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <History className="w-3 h-3" /> Histórico de clubes
                  </p>
                  <div className="space-y-1">
                    {playerHistories[participant.id].map(h => (
                      <div key={h.id} className="text-xs flex items-center gap-1 text-muted-foreground">
                        <span className="font-medium text-foreground">{getTeamName(h.team_id)}</span>
                        <span>({h.start_date}{h.end_date ? ` → ${h.end_date}` : ' → actual'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedParticipant && (
        <PlayerTeamChangeDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          participant={selectedParticipant}
          teams={teams}
          onSuccess={loadData}
        />
      )}

      {transferParticipant && (
        <PlayerTransferDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          participant={transferParticipant}
          teams={teams}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
