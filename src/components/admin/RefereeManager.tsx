import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from '@/services/tournamentService';
import { teamService } from '@/services/teamService';
import { Match } from '@/types/tournament';
import { Team } from '@/types/database';
import { UserCog, Calendar, MapPin, Trash2, UserPlus, Copy, Phone, Link as LinkIcon, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface RefereeManagerProps {
  eventId: string;
}

interface MesaAssignment {
  id: string;
  match_id: string;
  mesa_name: string;
  phone: string;
  token: string;
  status: string;
  accepted_at: string | null;
  created_at: string;
}

export const RefereeManager = ({ eventId }: RefereeManagerProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<MesaAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  const [mesaName, setMesaName] = useState('');
  const [mesaPhone, setMesaPhone] = useState('');
  const [creating, setCreating] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [matchesData, teamsData] = await Promise.all([
        tournamentService.getMatches(eventId),
        teamService.getAll(),
      ]);
      setMatches(matchesData);
      setTeams(teamsData);

      // Load assignments for this event's matches
      const matchIds = matchesData.map(m => m.id);
      if (matchIds.length > 0) {
        const { data: assignData } = await supabase
          .from('mesa_assignments')
          .select('*')
          .in('match_id', matchIds);
        setAssignments((assignData || []) as MesaAssignment[]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedMatch || !mesaName.trim() || !mesaPhone.trim()) {
      toast({ title: 'Atención', description: 'Nombre y teléfono son obligatorios', variant: 'destructive' });
      return;
    }

    try {
      setCreating(true);
      const { data, error } = await supabase
        .from('mesa_assignments')
        .insert({
          match_id: selectedMatch.id,
          mesa_name: mesaName.trim(),
          phone: mesaPhone.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const assignment = data as MesaAssignment;
      const link = `${window.location.origin}/mesa/partido/${assignment.token}`;
      
      await navigator.clipboard.writeText(link);
      
      toast({
        title: '✅ Mesa asignada',
        description: `Enlace copiado al portapapeles. Envíalo a ${mesaName} por WhatsApp.`,
      });

      setAssignDialogOpen(false);
      setMesaName('');
      setMesaPhone('');
      setSelectedMatch(null);
      loadData();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'No se pudo crear la asignación', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('mesa_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
      toast({ title: 'Asignación eliminada' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/mesa/partido/${token}`;
    await navigator.clipboard.writeText(link);
    toast({ title: 'Enlace copiado', description: 'Enlace copiado al portapapeles' });
  };

  const openWhatsApp = (phone: string, token: string, match: Match) => {
    const link = `${window.location.origin}/mesa/partido/${token}`;
    const homeTeam = getTeamName(match.home_team_id);
    const awayTeam = getTeamName(match.away_team_id);
    const date = match.match_date ? new Date(match.match_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    const time = match.match_date ? new Date(match.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    
    const message = `⚽ *Asignación de Mesa*\n\n🏆 ${homeTeam} vs ${awayTeam}\n📅 ${date} · ${time}\n\n👉 Acepta y gestiona el partido aquí:\n${link}`;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Equipo desconocido';
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      'group': 'Fase de Grupos',
      'round_of_16': 'Octavos de Final',
      'quarter_final': 'Cuartos de Final',
      'semi_final': 'Semifinales',
      'final': 'Final',
    };
    return labels[phase] || phase;
  };

  const getAssignmentForMatch = (matchId: string) => {
    return assignments.find(a => a.match_id === matchId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><CheckCircle className="w-3 h-3 mr-1" />Aceptada</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rechazada</Badge>;
      default:
        return null;
    }
  };

  const groupedMatches = matches.reduce((acc, match) => {
    const phase = match.phase;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  if (loading && matches.length === 0) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserCog className="w-6 h-6 text-primary" />
        <h3 className="text-2xl font-bold">Asignación de Mesas</h3>
      </div>

      {matches.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay partidos generados aún.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMatches).map(([phase, phaseMatches]) => (
            <div key={phase}>
              <h4 className="text-xl font-bold mb-4">{getPhaseLabel(phase)}</h4>
              <div className="grid gap-4">
                {phaseMatches.map((match) => {
                  const assignment = getAssignmentForMatch(match.id);
                  return (
                    <Card key={match.id} className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="font-semibold">{getTeamName(match.home_team_id)}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-semibold">{getTeamName(match.away_team_id)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            {match.group_name && <span>Grupo {match.group_name}</span>}
                            {match.match_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(match.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                {' '}
                                {new Date(match.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {assignment ? (
                            <>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{assignment.mesa_name}</span>
                                  {getStatusBadge(assignment.status)}
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" />{assignment.phone}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => copyLink(assignment.token)} title="Copiar enlace">
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openWhatsApp(assignment.phone, assignment.token, match)} title="Enviar por WhatsApp" className="text-emerald-600">
                                  <Phone className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteAssignment(assignment.id)} title="Eliminar asignación" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedMatch(match); setAssignDialogOpen(true); }}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Asignar Mesa
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para asignar mesa */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Mesa al Partido</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="font-semibold">
                  {getTeamName(selectedMatch.home_team_id)} vs {getTeamName(selectedMatch.away_team_id)}
                </p>
                {selectedMatch.match_date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedMatch.match_date).toLocaleDateString('es-ES')} · {new Date(selectedMatch.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="mesa-name">Nombre de la Mesa</Label>
                <Input id="mesa-name" placeholder="Ej: Juan García" value={mesaName} onChange={(e) => setMesaName(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="mesa-phone">Teléfono (con prefijo país)</Label>
                <Input id="mesa-phone" type="tel" placeholder="+34612345678" value={mesaPhone} onChange={(e) => setMesaPhone(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Se generará un enlace único para que la mesa acepte y gestione el partido
                </p>
              </div>

              <Button onClick={handleCreateAssignment} className="w-full" disabled={creating}>
                {creating ? 'Creando...' : 'Asignar y Copiar Enlace'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
