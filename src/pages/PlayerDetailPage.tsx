import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { participantService } from '@/services/participantService';
import { playerHistoryService, PlayerTeamHistory } from '@/services/playerHistoryService';
import { Participant, Team } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, User, Trophy, Calendar, Target, Shield, 
  TrendingUp, History, Users, MapPin, Award
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface TeamHistoryWithDetails extends PlayerTeamHistory {
  team?: Team;
}

export const PlayerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [player, setPlayer] = useState<Participant | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [history, setHistory] = useState<TeamHistoryWithDetails[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [playerEvents, setPlayerEvents] = useState<{ id: string; title: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Accumulated stats from history
  const accumulatedStats = history.reduce((acc, h) => ({
    matches_played: acc.matches_played + (h.matches_played || 0),
    goals_scored: acc.goals_scored + (h.goals_scored || 0),
    yellow_cards: acc.yellow_cards + (h.yellow_cards || 0),
    red_cards: acc.red_cards + (h.red_cards || 0),
  }), { matches_played: 0, goals_scored: 0, yellow_cards: 0, red_cards: 0 });

  // Total stats = current + accumulated
  const totalStats = {
    matches_played: (player?.matches_played || 0) + accumulatedStats.matches_played,
    goals_scored: (player?.goals_scored || 0) + accumulatedStats.goals_scored,
    yellow_cards: (player?.yellow_cards || 0) + accumulatedStats.yellow_cards,
    red_cards: (player?.red_cards || 0) + accumulatedStats.red_cards,
  };

  useEffect(() => {
    loadPlayerData();
  }, [id]);

  const loadPlayerData = async () => {
    if (!id) return;

    try {
      // Fetch player data
      const { data: playerData, error: playerError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) {
        setLoading(false);
        return;
      }

      setPlayer(playerData);

      // Fetch current team
      if (playerData.team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', playerData.team_id)
          .maybeSingle();
        setCurrentTeam(teamData);
      }

      // Fetch history with team details
      const historyData = await playerHistoryService.getByPlayer(id);
      
      // Fetch team details for each history entry
      const historyWithTeams: TeamHistoryWithDetails[] = await Promise.all(
        historyData.map(async (h) => {
          const { data: team } = await supabase
            .from('teams')
            .select('*')
            .eq('id', h.team_id)
            .maybeSingle();
          return { ...h, team: team || undefined };
        })
      );
      setHistory(historyWithTeams);

      // Fetch player goals
      const { data: goalsData } = await supabase
        .from('match_goals')
        .select(`
          *,
          match:matches(
            id, phase, group_name, match_date, status,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            event:events(title)
          )
        `)
        .eq('player_id', id)
        .order('created_at', { ascending: false });
      setGoals(goalsData || []);

      // Fetch FEMD tournament participation via team_rosters → event_teams → events
      const { data: rosterData } = await supabase
        .from('team_rosters')
        .select('event_team_id')
        .eq('participant_id', id);

      if (rosterData && rosterData.length > 0) {
        const etIds = [...new Set(rosterData.map(r => r.event_team_id))];
        const { data: etData } = await supabase
          .from('event_teams')
          .select('event_id')
          .in('id', etIds);

        if (etData && etData.length > 0) {
          const eventIds = [...new Set(etData.map(e => e.event_id))];
          const { data: eventsData } = await supabase
            .from('events')
            .select('id, title, date')
            .in('id', eventIds)
            .order('date', { ascending: false });
          setPlayerEvents(eventsData || []);
        }
      }

    } catch (error) {
      console.error('Error loading player:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del jugador',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <User className="w-12 h-12 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando datos del jugador...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <User className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-xl text-muted-foreground">Jugador no encontrado</p>
          <Button onClick={() => navigate('/equipos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a equipos
          </Button>
        </div>
      </div>
    );
  }

  const teamsCount = new Set([...history.map(h => h.team_id), player.team_id].filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-16">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        {/* Player Header */}
        <Card className="mb-8 overflow-hidden border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Player Photo */}
              <div className="flex-shrink-0">
                {player.photo_url ? (
                  <div className="w-40 h-40 rounded-full bg-background flex items-center justify-center overflow-hidden ring-4 ring-background shadow-xl">
                    <img 
                      src={player.photo_url} 
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-4 ring-background shadow-xl">
                    <User className="w-20 h-20 text-primary" />
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                  {player.number && (
                    <span className="text-5xl font-bold text-primary">#{player.number}</span>
                  )}
                  <CardTitle className="text-4xl">{player.name}</CardTitle>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-4">
                  {player.position && (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      <Shield className="w-4 h-4 mr-1" />
                      {player.position}
                    </Badge>
                  )}
                  {currentTeam && (
                    <Link to={`/equipos/${currentTeam.id}`}>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-sm px-3 py-1">
                        <Users className="w-4 h-4 mr-1" />
                        {currentTeam.name}
                      </Badge>
                    </Link>
                  )}
                  {player.age && (
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      {player.age} años
                    </Badge>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{totalStats.matches_played}</p>
                    <p className="text-xs text-muted-foreground">Partidos</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{totalStats.goals_scored}</p>
                    <p className="text-xs text-muted-foreground">Goles</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-500">{totalStats.yellow_cards}</p>
                    <p className="text-xs text-muted-foreground">T. Amarillas</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{totalStats.red_cards}</p>
                    <p className="text-xs text-muted-foreground">T. Rojas</p>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="trayectoria" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto mb-8">
            <TabsTrigger value="trayectoria" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Trayectoria
            </TabsTrigger>
            <TabsTrigger value="estadisticas" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger value="goles" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Goles
            </TabsTrigger>
          </TabsList>

          {/* Trayectoria Tab */}
          <TabsContent value="trayectoria">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Team History Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-emerald-600" />
                    Historial de Equipos
                  </CardTitle>
                  <CardDescription>
                    {teamsCount} equipo{teamsCount !== 1 ? 's' : ''} en su trayectoria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {history.length === 0 && !currentTeam ? (
                    <p className="text-muted-foreground text-center py-4">
                      Sin historial registrado
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Current Team */}
                      {currentTeam && (
                        <div className="relative pl-6 pb-4 border-l-2 border-emerald-500">
                          <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-500" />
                          <Link to={`/equipos/${currentTeam.id}`} className="block hover:bg-muted/50 rounded-lg p-3 -ml-3 transition-colors">
                            <div className="flex items-center gap-3 mb-1">
                              {currentTeam.logo_url && (
                                <img src={currentTeam.logo_url} alt={currentTeam.name} className="w-8 h-8 object-contain" />
                              )}
                              <span className="font-semibold">{currentTeam.name}</span>
                              <Badge className="bg-emerald-500 text-white text-xs">Actual</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              PJ: {player.matches_played || 0} | 
                              Goles: {player.goals_scored || 0} | 
                              TA: {player.yellow_cards || 0} | 
                              TR: {player.red_cards || 0}
                            </p>
                          </Link>
                        </div>
                      )}

                      {/* History */}
                      {history.map((entry, index) => (
                        <div 
                          key={entry.id} 
                          className={`relative pl-6 pb-4 ${index < history.length - 1 ? 'border-l-2 border-muted' : ''}`}
                        >
                          <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-muted" />
                          <Link 
                            to={`/equipos/${entry.team_id}`} 
                            className="block hover:bg-muted/50 rounded-lg p-3 -ml-3 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-1">
                              {entry.team?.logo_url && (
                                <img src={entry.team.logo_url} alt={entry.team.name} className="w-8 h-8 object-contain" />
                              )}
                              <span className="font-semibold">{entry.team?.name || 'Equipo desconocido'}</span>
                              {entry.category && (
                                <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(entry.start_date), 'MMM yyyy', { locale: es })}
                              {entry.end_date && (
                                <>
                                  <span>→</span>
                                  {format(new Date(entry.end_date), 'MMM yyyy', { locale: es })}
                                </>
                              )}
                              {entry.season && (
                                <Badge variant="secondary" className="text-xs ml-2">{entry.season}</Badge>
                              )}
                            </div>
                            {(entry.matches_played > 0 || entry.goals_scored > 0) && (
                              <p className="text-sm text-muted-foreground">
                                PJ: {entry.matches_played} | 
                                Goles: {entry.goals_scored} | 
                                TA: {entry.yellow_cards} | 
                                TR: {entry.red_cards}
                              </p>
                            )}
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    Estadísticas Acumuladas
                  </CardTitle>
                  <CardDescription>
                    Total de toda su trayectoria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/10 rounded-lg p-4 text-center">
                        <p className="text-4xl font-bold text-primary">{totalStats.matches_played}</p>
                        <p className="text-sm text-muted-foreground">Partidos Jugados</p>
                      </div>
                      <div className="bg-emerald-500/10 rounded-lg p-4 text-center">
                        <p className="text-4xl font-bold text-emerald-600">{totalStats.goals_scored}</p>
                        <p className="text-sm text-muted-foreground">Goles Totales</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
                        <p className="text-4xl font-bold text-yellow-600">{totalStats.yellow_cards}</p>
                        <p className="text-sm text-muted-foreground">Tarjetas Amarillas</p>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-4 text-center">
                        <p className="text-4xl font-bold text-red-600">{totalStats.red_cards}</p>
                        <p className="text-sm text-muted-foreground">Tarjetas Rojas</p>
                      </div>
                    </div>

                    {totalStats.matches_played > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Promedios</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Goles por partido</span>
                            <span className="font-semibold">
                              {(totalStats.goals_scored / totalStats.matches_played).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tarjetas por partido</span>
                            <span className="font-semibold">
                              {((totalStats.yellow_cards + totalStats.red_cards) / totalStats.matches_played).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* FEMD Tournament History */}
              <FEMDTournamentHistory
                events={playerEvents}
                title="Participación en Torneos FEMD"
                description={`Historial de participación de ${player.name} en competiciones FEMD`}
              />
            </div>
          </TabsContent>

          {/* Estadísticas Tab */}
          <TabsContent value="estadisticas" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Goals by Team */}
              <Card>
                <CardHeader>
                  <CardTitle>Goles por Equipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      ...(currentTeam ? [{
                        name: currentTeam.name.slice(0, 15),
                        goles: player.goals_scored || 0,
                        partidos: player.matches_played || 0
                      }] : []),
                      ...history.map(h => ({
                        name: h.team?.name?.slice(0, 15) || 'N/A',
                        goles: h.goals_scored || 0,
                        partidos: h.matches_played || 0
                      }))
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                      <Bar dataKey="goles" fill="hsl(var(--primary))" name="Goles" />
                      <Bar dataKey="partidos" fill="hsl(142, 76%, 36%)" name="Partidos" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cards Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Tarjetas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Amarillas', value: totalStats.yellow_cards },
                          { name: 'Rojas', value: totalStats.red_cards }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="hsl(45, 93%, 47%)" />
                        <Cell fill="hsl(var(--destructive))" />
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Goles Tab */}
          <TabsContent value="goles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Registro de Goles
                </CardTitle>
                <CardDescription>
                  {goals.length} gol{goals.length !== 1 ? 'es' : ''} registrado{goals.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {goals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay goles registrados
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Torneo</TableHead>
                        <TableHead>Partido</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead className="text-center">Minuto</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goals.map((goal) => (
                        <TableRow key={goal.id}>
                          <TableCell>{goal.match?.event?.title || '-'}</TableCell>
                          <TableCell>
                            {goal.match?.home_team?.name} vs {goal.match?.away_team?.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{goal.match?.phase}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {goal.minute ? `${goal.minute}'` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {goal.is_own_goal ? (
                              <Badge variant="destructive">Propia</Badge>
                            ) : (
                              <Badge className="bg-emerald-500">Gol</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
