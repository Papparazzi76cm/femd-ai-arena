import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { playerHistoryService, PlayerTeamHistory } from '@/services/playerHistoryService';
import { participantService } from '@/services/participantService';
import { Team, Participant } from '@/types/database';
import { ArrowRight, Calendar, Trophy, Users, History, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PlayerTeamChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant;
  teams: Team[];
  onSuccess: () => void;
}

const CATEGORIES = [
  'Prebenjamín', 'Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil', 'Senior'
];

export const PlayerTeamChangeDialog = ({ 
  open, 
  onOpenChange, 
  participant, 
  teams,
  onSuccess 
}: PlayerTeamChangeDialogProps) => {
  const [history, setHistory] = useState<PlayerTeamHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamId, setNewTeamId] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [season, setSeason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && participant) {
      loadHistory();
    }
  }, [open, participant]);

  const loadHistory = async () => {
    try {
      const data = await playerHistoryService.getByPlayer(participant.id);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Equipo desconocido';
  };

  const handleTeamChange = async () => {
    if (!newTeamId) {
      toast({ title: 'Selecciona un equipo', variant: 'destructive' });
      return;
    }

    if (newTeamId === participant.team_id) {
      toast({ title: 'El jugador ya pertenece a este equipo', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Close current team history if exists
      if (participant.team_id) {
        await playerHistoryService.closeCurrentTeam(
          participant.id, 
          participant.team_id, 
          startDate
        );
      }

      // Create new history entry
      await playerHistoryService.create({
        player_id: participant.id,
        team_id: newTeamId,
        category: category || null,
        start_date: startDate,
        end_date: null,
        season: season || null,
        matches_played: 0,
        goals_scored: 0,
        yellow_cards: 0,
        red_cards: 0,
        notes: notes || null
      });

      // Update participant's current team
      await participantService.update(participant.id, { team_id: newTeamId });

      toast({ title: 'Cambio de equipo registrado correctamente' });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error changing team:', error);
      toast({ title: 'Error al cambiar de equipo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Historial de Equipos - {participant.name}
          </DialogTitle>
          <DialogDescription>
            Gestiona los cambios de equipo y consulta el historial del jugador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Team */}
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Equipo actual</p>
                  <p className="font-semibold">
                    {participant.team_id ? getTeamName(participant.team_id) : 'Sin equipo asignado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Team Form */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Cambiar de Equipo
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nuevo Equipo *</label>
                  <Select value={newTeamId} onValueChange={setNewTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Inicio *</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Temporada</label>
                  <Input
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="Ej: 2024-2025"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre el cambio..."
                />
              </div>

              <Button 
                onClick={handleTeamChange} 
                disabled={saving || !newTeamId}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Registrar Cambio de Equipo'}
              </Button>
            </CardContent>
          </Card>

          {/* History Timeline */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600" />
              Historial de Equipos
            </h3>

            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando historial...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay historial registrado. Los cambios futuros se guardarán aquí.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <Card key={entry.id} className={index === 0 && !entry.end_date ? 'border-emerald-300' : ''}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${index === 0 && !entry.end_date ? 'bg-emerald-500' : 'bg-muted'}`} />
                          <div>
                            <p className="font-medium">{getTeamName(entry.team_id)}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(entry.start_date), 'MMM yyyy', { locale: es })}
                              {entry.end_date && (
                                <>
                                  <ArrowRight className="w-3 h-3" />
                                  {format(new Date(entry.end_date), 'MMM yyyy', { locale: es })}
                                </>
                              )}
                              {!entry.end_date && (
                                <Badge className="bg-emerald-500 text-white text-xs ml-2">Actual</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {entry.category && (
                            <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                          )}
                          {entry.season && (
                            <Badge variant="secondary" className="text-xs">{entry.season}</Badge>
                          )}
                        </div>
                      </div>
                      {(entry.matches_played > 0 || entry.goals_scored > 0) && (
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground ml-6">
                          <span>PJ: {entry.matches_played}</span>
                          <span>Goles: {entry.goals_scored}</span>
                          <span>TA: {entry.yellow_cards}</span>
                          <span>TR: {entry.red_cards}</span>
                        </div>
                      )}
                      {entry.notes && (
                        <p className="mt-1 text-xs text-muted-foreground ml-6 italic">
                          {entry.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
