import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { roleService } from '@/services/roleService';
import { tournamentService } from '@/services/tournamentService';
import { teamService } from '@/services/teamService';
import { Match } from '@/types/tournament';
import { Team } from '@/types/database';
import { Loader2, LogOut, Calendar, Trophy, AlertCircle, ArrowLeft, Filter, Search, X } from 'lucide-react';
import { MatchCard } from '@/components/referee/MatchCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EventInfo {
  id: string;
  title: string;
}

export const MesaDashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isMesa, setIsMesa] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);

  // Filters
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!authLoading) {
      checkAccess();
    }
  }, [user, authLoading]);

  const checkAccess = async () => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }

    try {
      setLoading(true);
      const roles = await roleService.getUserRoles(user.id);
      const hasMesaRole = roles.includes('mesa');
      const hasAdminRole = roles.includes('admin');

      if (!hasMesaRole && !hasAdminRole) {
        toast({ title: 'Acceso denegado', description: 'No tienes permisos para acceder a este panel', variant: 'destructive' });
        navigate('/');
        return;
      }

      setIsMesa(true);
      setIsAdmin(hasAdminRole);
      await loadData(hasAdminRole);
    } catch (error) {
      console.error('Error verificando acceso:', error);
      toast({ title: 'Error', description: 'No se pudo verificar el acceso', variant: 'destructive' });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (userIsAdmin: boolean) => {
    if (!user) return;

    try {
      let query = supabase.from('matches').select('*').order('match_date', { ascending: true });
      if (!userIsAdmin) {
        query = query.eq('referee_user_id', user.id);
      }

      const [matchesRes, teamsData, eventsRes] = await Promise.all([
        query,
        teamService.getAll(),
        supabase.from('events').select('id, title').order('date', { ascending: false }),
      ]);

      if (matchesRes.error) throw matchesRes.error;
      setMatches((matchesRes.data || []) as Match[]);
      setTeams(teamsData);
      setEvents((eventsRes.data || []) as EventInfo[]);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los partidos', variant: 'destructive' });
    }
  };

  const handleMatchUpdate = async (matchId: string, updates: Partial<Match>) => {
    try {
      await tournamentService.updateMatch(matchId, updates);
      const match = matches.find(m => m.id === matchId);
      if (match && updates.home_score !== undefined && updates.away_score !== undefined) {
        await tournamentService.updateTeamStatistics(match.event_id);
      }
      if (updates.status === 'finished' && match) {
        const resolved = await tournamentService.resolveWinnerForFinishedMatch(match.event_id, matchId);
        if (resolved > 0) {
          toast({ title: '✅ Cruces actualizados', description: `Se asignaron ${resolved} equipo(s) automáticamente a los cruces de la siguiente ronda.` });
        }
      }
      toast({ title: 'Partido actualizado', description: 'Los datos del partido se guardaron correctamente' });
      loadData(isAdmin);
    } catch (error) {
      console.error('Error actualizando partido:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el partido', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Por definir';
    return teams.find(t => t.id === teamId)?.name || 'Equipo desconocido';
  };

  // Derive unique teams that appear in current matches
  const matchTeams = useMemo(() => {
    const teamIds = new Set<string>();
    matches.forEach(m => {
      if (m.home_team_id) teamIds.add(m.home_team_id);
      if (m.away_team_id) teamIds.add(m.away_team_id);
    });
    return teams.filter(t => teamIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [matches, teams]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    let result = matches;

    if (filterEvent !== 'all') {
      result = result.filter(m => m.event_id === filterEvent);
    }
    if (filterStatus !== 'all') {
      result = result.filter(m => m.status === filterStatus);
    }
    if (filterTeam !== 'all') {
      result = result.filter(m => m.home_team_id === filterTeam || m.away_team_id === filterTeam);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(m => {
        const home = getTeamName(m.home_team_id).toLowerCase();
        const away = getTeamName(m.away_team_id).toLowerCase();
        return home.includes(q) || away.includes(q);
      });
    }

    return result;
  }, [matches, filterEvent, filterStatus, filterTeam, searchText, teams]);

  const hasActiveFilters = filterEvent !== 'all' || filterStatus !== 'all' || filterTeam !== 'all' || searchText.trim() !== '';

  const clearFilters = () => {
    setFilterEvent('all');
    setFilterStatus('all');
    setFilterTeam('all');
    setSearchText('');
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

  if (!isMesa && !isAdmin) return null;

  const liveMatches = filteredMatches.filter(m => m.status === 'in_progress');
  const upcomingMatches = filteredMatches.filter(m => m.status === 'scheduled');
  const completedMatches = filteredMatches.filter(m => m.status === 'finished');

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pt-16 sm:pt-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-4 sm:py-6 px-3 sm:px-4">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4">
            <div className="min-w-0 flex-1 w-full">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-0.5 sm:mb-1">Panel de Mesa</h1>
              <p className="text-emerald-100 text-xs sm:text-sm truncate">Bienvenido, {user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 w-full lg:w-auto">
              {isAdmin && (
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-1 lg:flex-none h-10" onClick={() => navigate('/admin')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden xs:inline">Volver al Admin</span>
                  <span className="xs:hidden">Admin</span>
                </Button>
              )}
              <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-1 lg:flex-none h-10" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden xs:inline">Cerrar Sesión</span>
                <span className="xs:hidden">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                <p className="text-lg sm:text-xl font-bold">{filteredMatches.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 border-2 border-red-500/50">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/30 rounded-lg relative shrink-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                {liveMatches.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">En Juego</p>
                <p className="text-lg sm:text-xl font-bold text-red-600">{liveMatches.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg sm:text-xl font-bold">{upcomingMatches.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Completados</p>
                <p className="text-lg sm:text-xl font-bold">{completedMatches.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Filtros</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-8 text-xs">
                <X className="w-3 h-3 mr-1" />Limpiar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Event filter */}
            <Select value={filterEvent} onValueChange={setFilterEvent}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los torneos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los torneos</SelectItem>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="scheduled">Pendientes</SelectItem>
                <SelectItem value="in_progress">En juego</SelectItem>
                <SelectItem value="finished">Finalizados</SelectItem>
              </SelectContent>
            </Select>

            {/* Team filter */}
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los equipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los equipos</SelectItem>
                {matchTeams.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipo..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </Card>

        {/* Matches */}
        {filteredMatches.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {hasActiveFilters ? 'No hay partidos con estos filtros' : 'No hay partidos disponibles'}
            </h3>
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? 'Prueba a cambiar los filtros para ver otros partidos.'
                : isAdmin
                  ? 'No hay partidos registrados en el sistema.'
                  : 'Aún no tienes partidos asignados. Contacta al administrador del torneo.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Limpiar filtros</Button>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            {liveMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-600">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  Partidos en Juego
                </h2>
                <div className="grid gap-4">
                  {liveMatches.map(match => (
                    <MatchCard key={match.id} match={match} homeTeamName={getTeamName(match.home_team_id)} awayTeamName={getTeamName(match.away_team_id)} homeTeamId={match.home_team_id} awayTeamId={match.away_team_id} onUpdate={handleMatchUpdate} />
                  ))}
                </div>
              </div>
            )}

            {upcomingMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Partidos Pendientes</h2>
                <div className="grid gap-4">
                  {upcomingMatches.map(match => (
                    <MatchCard key={match.id} match={match} homeTeamName={getTeamName(match.home_team_id)} awayTeamName={getTeamName(match.away_team_id)} homeTeamId={match.home_team_id} awayTeamId={match.away_team_id} onUpdate={handleMatchUpdate} />
                  ))}
                </div>
              </div>
            )}

            {completedMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Partidos Completados</h2>
                <div className="grid gap-4">
                  {completedMatches.map(match => (
                    <MatchCard key={match.id} match={match} homeTeamName={getTeamName(match.home_team_id)} awayTeamName={getTeamName(match.away_team_id)} homeTeamId={match.home_team_id} awayTeamId={match.away_team_id} onUpdate={handleMatchUpdate} readOnly={!isAdmin} />
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
