import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { roleService } from '@/services/roleService';
import { tournamentService } from '@/services/tournamentService';
import { teamService } from '@/services/teamService';
import { Match } from '@/types/tournament';
import { Team } from '@/types/database';
import { Loader2, LogOut, Calendar, Trophy, AlertCircle } from 'lucide-react';
import { MatchCard } from '@/components/referee/MatchCard';

export const RefereeDashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isMesa, setIsMesa] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (!authLoading) {
      checkAccess();
    }
  }, [user, authLoading]);

  const checkAccess = async () => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);
      const roles = await roleService.getUserRoles(user.id);
      
      if (!roles.includes('mesa')) {
        toast({
          title: 'Acceso denegado',
          description: 'No tienes permisos para acceder a este panel',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsMesa(true);
      await loadData();
    } catch (error) {
      console.error('Error verificando acceso:', error);
      toast({
        title: 'Error',
        description: 'No se pudo verificar el acceso',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!user) return;

    try {
      // Get all matches assigned to this referee
      const { data: allMatches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('referee_user_id', user.id)
        .order('match_date', { ascending: true });

      if (error) throw error;

      setMatches((allMatches || []) as Match[]);

      // Get all teams
      const teamsData = await teamService.getAll();
      setTeams(teamsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los partidos',
        variant: 'destructive',
      });
    }
  };

  const handleMatchUpdate = async (matchId: string, updates: Partial<Match>) => {
    try {
      await tournamentService.updateMatch(matchId, updates);
      
      // Update statistics if scores are updated
      const match = matches.find(m => m.id === matchId);
      if (match && updates.home_score !== undefined && updates.away_score !== undefined) {
        await tournamentService.updateTeamStatistics(match.event_id);
      }

      toast({
        title: 'Partido actualizado',
        description: 'Los datos del partido se guardaron correctamente',
      });
      
      loadData();
    } catch (error) {
      console.error('Error actualizando partido:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el partido',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Equipo desconocido';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (!isMesa) {
    return null;
  }

  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  const completedMatches = matches.filter(m => m.status === 'finished');

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pt-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 truncate">Panel de Mesa</h1>
              <p className="text-emerald-100 text-sm sm:text-base truncate">
                Bienvenido, {user?.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 shrink-0"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Partidos</p>
                <p className="text-2xl font-bold">{matches.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{upcomingMatches.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold">{completedMatches.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Matches */}
        {matches.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay partidos asignados</h3>
            <p className="text-muted-foreground">
              Aún no tienes partidos asignados. Contacta al administrador del torneo.
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Partidos Pendientes</h2>
                <div className="grid gap-4">
                  {upcomingMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      homeTeamName={getTeamName(match.home_team_id)}
                      awayTeamName={getTeamName(match.away_team_id)}
                      onUpdate={handleMatchUpdate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Matches */}
            {completedMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Partidos Completados</h2>
                <div className="grid gap-4">
                  {completedMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      homeTeamName={getTeamName(match.home_team_id)}
                      awayTeamName={getTeamName(match.away_team_id)}
                      onUpdate={handleMatchUpdate}
                      readOnly
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
