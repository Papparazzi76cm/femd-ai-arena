import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from '@/services/tournamentService';
import { roleService } from '@/services/roleService';
import { teamService } from '@/services/teamService';
import { Match } from '@/types/tournament';
import { Team } from '@/types/database';
import { UserCog, Calendar, MapPin, Trash2, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface RefereeManagerProps {
  eventId: string;
}

interface RefereeUser {
  id: string;
  email: string;
}

export const RefereeManager = ({ eventId }: RefereeManagerProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [referees, setReferees] = useState<RefereeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Form state for new mesa
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [matchesData, teamsData, refereesData] = await Promise.all([
        tournamentService.getMatches(eventId),
        teamService.getAll(),
        roleService.getUsersByRole('mesa'),
      ]);
      setMatches(matchesData);
      setTeams(teamsData);
      setReferees(refereesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignReferee = async (matchId: string, refereeId: string) => {
    try {
      await tournamentService.assignReferee(matchId, refereeId);
      toast({
        title: 'Mesa asignada',
        description: 'Mesa asignada correctamente al partido',
      });
      setAssignDialogOpen(false);
      setSelectedMatch(null);
      loadData();
    } catch (error) {
      console.error('Error asignando mesa:', error);
      toast({
        title: 'Error',
        description: 'No se pudo asignar la mesa al partido',
        variant: 'destructive',
      });
    }
  };

  const handleUnassignReferee = async (matchId: string) => {
    try {
      await tournamentService.unassignReferee(matchId);
      toast({
        title: 'Mesa desasignada',
        description: 'Mesa removida del partido',
      });
      loadData();
    } catch (error) {
      console.error('Error desasignando mesa:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desasignar la mesa',
        variant: 'destructive',
      });
    }
  };

  const handleCreateMesa = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      toast({
        title: 'Atención',
        description: 'Debes ingresar email y contraseña',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Atención',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Error',
          description: 'Debes estar autenticado',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-mesa-user', {
        body: { email: newEmail, password: newPassword },
      });

      if (error) {
        console.error('Error creating mesa:', error);
        toast({
          title: 'Error',
          description: error.message || 'No se pudo crear el usuario mesa',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Mesa creada',
        description: `Usuario mesa ${newEmail} creado correctamente. Puede cambiar su contraseña al acceder por primera vez.`,
      });
      
      setDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      loadData();
    } catch (error) {
      console.error('Error creating mesa:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el usuario mesa',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const openAssignDialog = (match: Match) => {
    setSelectedMatch(match);
    setAssignDialogOpen(true);
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

  const getRefereeEmail = (refereeId: string) => {
    return referees.find(r => r.id === refereeId)?.email || 'Mesa desconocida';
  };

  const groupedMatches = matches.reduce((acc, match) => {
    const phase = match.phase;
    if (!acc[phase]) {
      acc[phase] = [];
    }
    acc[phase].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  if (loading && matches.length === 0) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <UserCog className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-bold">Asignación de Mesas</h3>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-emerald">
              <UserPlus className="w-4 h-4 mr-2" />
              Registrar Nueva Mesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Usuario Mesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="mesa-email">Email</Label>
                <Input
                  id="mesa-email"
                  type="email"
                  placeholder="mesa@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mesa-password">Contraseña Provisional</Label>
                <div className="relative">
                  <Input
                    id="mesa-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  El usuario podrá cambiar esta contraseña cuando acceda por primera vez
                </p>
              </div>
              <Button 
                onClick={handleCreateMesa} 
                className="w-full"
                disabled={creating}
              >
                {creating ? 'Creando...' : 'Registrar Mesa'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de mesas registradas */}
      {referees.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Mesas Registradas ({referees.length})</h4>
          <div className="flex flex-wrap gap-2">
            {referees.map((referee) => (
              <div 
                key={referee.id}
                className="bg-muted px-3 py-1.5 rounded-full text-sm"
              >
                {referee.email}
              </div>
            ))}
          </div>
        </Card>
      )}

      {matches.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No hay partidos generados aún. Primero genera el sorteo del torneo.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMatches).map(([phase, phaseMatches]) => (
            <div key={phase}>
              <h4 className="text-xl font-bold mb-4">{getPhaseLabel(phase)}</h4>
              <div className="grid gap-4">
                {phaseMatches.map((match) => (
                  <Card 
                    key={match.id} 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => !match.referee_user_id && openAssignDialog(match)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="font-semibold">
                            {getTeamName(match.home_team_id)}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-semibold">
                            {getTeamName(match.away_team_id)}
                          </span>
                        </div>
                        {match.group_name && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Grupo {match.group_name}
                          </div>
                        )}
                        {match.match_date && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(match.match_date).toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {match.referee_user_id ? (
                          <>
                            <div className="text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
                              {getRefereeEmail(match.referee_user_id)}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnassignReferee(match.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground px-3 py-1 rounded-full border border-dashed">
                            Sin asignar - Clic para asignar
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para asignar mesa a partido */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Mesa al Partido</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-semibold text-center mb-2">
                  {getTeamName(selectedMatch.home_team_id)} vs {getTeamName(selectedMatch.away_team_id)}
                </div>
                {selectedMatch.group_name && (
                  <div className="text-sm text-muted-foreground text-center">
                    Grupo {selectedMatch.group_name}
                  </div>
                )}
              </div>
              
              <div>
                <Label>Seleccionar Mesa</Label>
                {referees.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    No hay mesas registradas. Registra una mesa primero.
                  </p>
                ) : (
                  <div className="grid gap-2 mt-2">
                    {referees.map((referee) => (
                      <Button
                        key={referee.id}
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleAssignReferee(selectedMatch.id, referee.id)}
                      >
                        <UserCog className="w-4 h-4 mr-2" />
                        {referee.email}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
