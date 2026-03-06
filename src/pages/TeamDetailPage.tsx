import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { teamService } from '@/services/teamService';
import { participantService } from '@/services/participantService';
import { eventService } from '@/services/eventService';
import { supabase } from '@/integrations/supabase/client';
import { Team, Participant, Event } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Trophy, Calendar, Palette, Loader2, Image, TrendingUp, Target, Shield } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const TeamDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [childTeams, setChildTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, [id]);

  const loadTeamData = async () => {
    if (!id) return;
    
    try {
      const [teamData, participantsData, eventsData, childTeamsData] = await Promise.all([
        teamService.getById(id),
        participantService.getByTeam(id),
        eventService.getAll(),
        teamService.getChildTeams(id)
      ]);

      setTeam(teamData);
      setChildTeams(childTeamsData);
      setParticipants(participantsData);
      
      // Filter events that include this team
      const teamEvents = eventsData.filter(event => 
        event.team_ids?.includes(id)
      );
      setEvents(teamEvents);

      // Load matches for this team
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
          event:events(id, title)
        `)
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .order('match_date', { ascending: false });

      setMatches(matchesData || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del equipo',
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
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando datos del equipo...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Users className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-xl text-muted-foreground">Equipo no encontrado</p>
          <Button onClick={() => navigate('/equipos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a equipos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-16">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/equipos')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a equipos
        </Button>

        {/* Team Header */}
        <Card className="mb-8 overflow-hidden border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Team Logo */}
              <div className="flex-shrink-0">
                {team.logo_url ? (
                  <div className="w-32 h-32 rounded-full bg-background flex items-center justify-center overflow-hidden ring-4 ring-background shadow-xl">
                    <img 
                      src={team.logo_url} 
                      alt={team.name}
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-4 ring-background shadow-xl">
                    <Users className="w-16 h-16 text-primary" />
                  </div>
                )}
              </div>

              {/* Team Info */}
              <div className="flex-1 text-center md:text-left">
                <CardTitle className="text-4xl mb-4">{team.name}</CardTitle>
                {team.description && (
                  <p className="text-muted-foreground text-lg mb-4">{team.description}</p>
                )}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {team.founded_year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Fundado en {team.founded_year}</span>
                    </div>
                  )}
                  {team.colors && (
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Colores: {team.colors}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue={childTeams.length > 0 ? "equipos" : "estadisticas"} className="w-full">
          <TabsList className={`grid w-full ${childTeams.length > 0 ? 'grid-cols-5' : 'grid-cols-4'} lg:w-auto mb-8`}>
            {childTeams.length > 0 && (
              <TabsTrigger value="equipos" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Equipos
              </TabsTrigger>
            )}
            <TabsTrigger value="estadisticas" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger value="partidos" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="plantilla" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Plantilla
            </TabsTrigger>
            <TabsTrigger value="galeria" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Galería
            </TabsTrigger>
          </TabsList>

          {/* Equipos del Club Tab */}
          {childTeams.length > 0 && (
            <TabsContent value="equipos">
              <Card>
                <CardHeader>
                  <CardTitle>Equipos del Club</CardTitle>
                  <CardDescription>Todos los equipos que pertenecen a {team.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Main team card */}
                    <Card className="border-2 border-primary/30 bg-primary/5">
                      <CardContent className="flex items-center gap-4 p-4">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt={team.name} className="w-16 h-16 object-contain" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <Shield className="w-8 h-8 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-lg">{team.name}</p>
                          <Badge variant="default">Equipo Principal</Badge>
                        </div>
                      </CardContent>
                    </Card>
                    {/* Child team cards */}
                    {childTeams.map((child) => (
                      <Card 
                        key={child.id} 
                        className="hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/equipos/${child.id}`)}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          {child.logo_url || team.logo_url ? (
                            <img src={child.logo_url || team.logo_url} alt={child.name} className="w-16 h-16 object-contain" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                              <Shield className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-lg">{child.name}</p>
                            <Badge variant="outline">Filial</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Plantilla Tab */}
          <TabsContent value="plantilla">
            <Card>
              <CardHeader>
                <CardTitle>Plantilla del Equipo</CardTitle>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay jugadores registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">N°</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Posición</TableHead>
                          <TableHead className="text-center">Edad</TableHead>
                          <TableHead className="text-center">PJ</TableHead>
                          <TableHead className="text-center">Goles</TableHead>
                          <TableHead className="text-center">TA</TableHead>
                          <TableHead className="text-center">TR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((participant) => (
                          <TableRow key={participant.id}>
                            <TableCell className="font-bold">
                              {participant.number || '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              <Link 
                                to={`/jugador/${participant.id}`}
                                className="flex items-center gap-3 hover:text-primary transition-colors"
                              >
                                {participant.photo_url ? (
                                  <img 
                                    src={participant.photo_url} 
                                    alt={participant.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                    <Users className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="hover:underline">{participant.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              {participant.position ? (
                                <Badge variant="outline">{participant.position}</Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {participant.age || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {participant.matches_played || 0}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {participant.goals_scored || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                                {participant.yellow_cards || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-red-500/20 text-red-700 dark:text-red-400">
                                {participant.red_cards || 0}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estadísticas Detalladas Tab */}
          <TabsContent value="estadisticas" className="space-y-6">
            {/* Gráficos de Rendimiento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evolución de Resultados */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolución de Resultados</CardTitle>
                  <CardDescription>Resultados por partido</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={matches.slice(0, 10).map((match, idx) => {
                      const isHome = match.home_team_id === id;
                      const teamScore = isHome ? match.home_score : match.away_score;
                      const opponentScore = isHome ? match.away_score : match.home_score;
                      let result = 'Empate';
                      if (match.status === 'finished' && teamScore !== undefined && opponentScore !== undefined) {
                        if (teamScore > opponentScore) result = 'Victoria';
                        else if (teamScore < opponentScore) result = 'Derrota';
                      }
                      return {
                        partido: `P${idx + 1}`,
                        resultado: result === 'Victoria' ? 3 : result === 'Empate' ? 1 : 0,
                        label: result
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="partido" className="text-xs" />
                      <YAxis domain={[0, 3]} ticks={[0, 1, 3]} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: any, name: any, props: any) => [props.payload.label, 'Resultado']}
                      />
                      <Line type="monotone" dataKey="resultado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Goles por Partido */}
              <Card>
                <CardHeader>
                  <CardTitle>Goles por Partido</CardTitle>
                  <CardDescription>A favor y en contra</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={matches.slice(0, 10).map((match, idx) => {
                      const isHome = match.home_team_id === id;
                      return {
                        partido: `P${idx + 1}`,
                        aFavor: isHome ? (match.home_score || 0) : (match.away_score || 0),
                        enContra: isHome ? (match.away_score || 0) : (match.home_score || 0)
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="partido" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Bar dataKey="aFavor" fill="hsl(var(--primary))" name="A favor" />
                      <Bar dataKey="enContra" fill="hsl(var(--destructive))" name="En contra" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Distribución de Tarjetas */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Tarjetas</CardTitle>
                  <CardDescription>Total de la temporada</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Amarillas', 
                            value: participants.reduce((sum, p) => sum + (p.yellow_cards || 0), 0),
                            color: 'hsl(45, 93%, 47%)'
                          },
                          { 
                            name: 'Rojas', 
                            value: participants.reduce((sum, p) => sum + (p.red_cards || 0), 0),
                            color: 'hsl(var(--destructive))'
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Amarillas', value: participants.reduce((sum, p) => sum + (p.yellow_cards || 0), 0) },
                          { name: 'Rojas', value: participants.reduce((sum, p) => sum + (p.red_cards || 0), 0) }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(45, 93%, 47%)' : 'hsl(var(--destructive))'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Promedio de Goles */}
              <Card>
                <CardHeader>
                  <CardTitle>Promedio de Goles</CardTitle>
                  <CardDescription>Por partido jugado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Goles a Favor</p>
                      <p className="text-3xl font-bold text-primary">
                        {matches.length > 0 
                          ? (matches.reduce((sum, m) => {
                              const isHome = m.home_team_id === id;
                              return sum + (isHome ? (m.home_score || 0) : (m.away_score || 0));
                            }, 0) / matches.length).toFixed(2)
                          : '0.00'
                        }
                      </p>
                    </div>
                    <div className="p-4 bg-destructive/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Goles en Contra</p>
                      <p className="text-3xl font-bold text-destructive">
                        {matches.length > 0 
                          ? (matches.reduce((sum, m) => {
                              const isHome = m.home_team_id === id;
                              return sum + (isHome ? (m.away_score || 0) : (m.home_score || 0));
                            }, 0) / matches.length).toFixed(2)
                          : '0.00'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Jugadores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-primary" />
                    Goles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {participants
                      .filter(p => (p.goals_scored || 0) > 0)
                      .sort((a, b) => (b.goals_scored || 0) - (a.goals_scored || 0))
                      .slice(0, 5)
                      .map(player => (
                        <div key={player.id} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{player.name}</span>
                          <Badge variant="secondary">{player.goals_scored}</Badge>
                        </div>
                      ))}
                    {participants.filter(p => (p.goals_scored || 0) > 0).length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin goleadores aún</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5 text-yellow-500" />
                    Tarjetas Amarillas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {participants
                      .filter(p => (p.yellow_cards || 0) > 0)
                      .sort((a, b) => (b.yellow_cards || 0) - (a.yellow_cards || 0))
                      .slice(0, 5)
                      .map(player => (
                        <div key={player.id} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{player.name}</span>
                          <Badge variant="outline" className="bg-yellow-500/10">{player.yellow_cards}</Badge>
                        </div>
                      ))}
                    {participants.filter(p => (p.yellow_cards || 0) > 0).length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin tarjetas amarillas</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5 text-red-500" />
                    Tarjetas Rojas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {participants
                      .filter(p => (p.red_cards || 0) > 0)
                      .sort((a, b) => (b.red_cards || 0) - (a.red_cards || 0))
                      .slice(0, 5)
                      .map(player => (
                        <div key={player.id} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{player.name}</span>
                          <Badge variant="outline" className="bg-red-500/10">{player.red_cards}</Badge>
                        </div>
                      ))}
                    {participants.filter(p => (p.red_cards || 0) > 0).length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin tarjetas rojas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Estadísticas por Jugador</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map(player => (
                    <Card key={player.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            {player.photo_url ? (
                              <img 
                                src={player.photo_url} 
                                alt={player.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold">{player.name}</h4>
                              <p className="text-sm text-muted-foreground">#{player.number}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-muted-foreground">Partidos</p>
                              <p className="font-semibold">{player.matches_played || 0}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-muted-foreground">Goles</p>
                              <p className="font-semibold">{player.goals_scored || 0}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-muted-foreground">T. Amarillas</p>
                              <p className="font-semibold">{player.yellow_cards || 0}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-muted-foreground">T. Rojas</p>
                              <p className="font-semibold">{player.red_cards || 0}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historial de Partidos Tab */}
          <TabsContent value="partidos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Historial de Partidos
                </CardTitle>
                <CardDescription>
                  Todos los partidos jugados por {team.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay partidos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map(match => {
                      const isHome = match.home_team_id === id;
                      const teamScore = isHome ? match.home_score : match.away_score;
                      const opponentScore = isHome ? match.away_score : match.home_score;
                      const opponent = isHome ? match.away_team : match.home_team;
                      
                      const result = 
                        teamScore === null || opponentScore === null 
                          ? 'pending'
                          : teamScore > opponentScore 
                            ? 'win' 
                            : teamScore < opponentScore 
                              ? 'loss' 
                              : 'draw';

                      return (
                        <Card key={match.id} className="border-2">
                          <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex flex-col items-center gap-2">
                                  {match.event?.title && (
                                    <Badge variant="outline" className="text-xs">
                                      {match.event.title}
                                    </Badge>
                                  )}
                                  <Badge variant={
                                    result === 'win' ? 'default' : 
                                    result === 'loss' ? 'destructive' : 
                                    result === 'draw' ? 'secondary' : 
                                    'outline'
                                  }>
                                    {result === 'win' ? 'Victoria' : 
                                     result === 'loss' ? 'Derrota' : 
                                     result === 'draw' ? 'Empate' : 
                                     match.status === 'completed' ? 'Finalizado' : 'Programado'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="flex items-center gap-2 flex-1">
                                    {team.logo_url && (
                                      <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />
                                    )}
                                    <span className="font-semibold">{team.name}</span>
                                  </div>
                                  
                                  <div className="text-center px-4">
                                    {teamScore !== null && opponentScore !== null ? (
                                      <span className="text-2xl font-bold">
                                        {teamScore} - {opponentScore}
                                      </span>
                                    ) : (
                                      <span className="text-xl text-muted-foreground">vs</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 flex-1 justify-end">
                                    <span className="font-semibold">{opponent?.name}</span>
                                    {opponent?.logo_url && (
                                      <img src={opponent.logo_url} alt={opponent.name} className="w-8 h-8 object-contain" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                                {match.match_date && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(match.match_date).toLocaleDateString('es-ES')}
                                  </div>
                                )}
                                {match.phase && (
                                  <Badge variant="outline">{match.phase}</Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Galería Tab */}
          <TabsContent value="galeria" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Galería del Equipo
                </CardTitle>
                <CardDescription>
                  Fotos y momentos destacados de {team.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {team.logo_url && (
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2">
                      <img 
                        src={team.logo_url} 
                        alt={`Logo ${team.name}`}
                        className="w-full h-full object-contain p-4"
                      />
                    </div>
                  )}
                  {participants
                    .filter(p => p.photo_url)
                    .map(player => (
                      <div key={player.id} className="aspect-square rounded-lg overflow-hidden bg-muted border-2 group relative">
                        <img 
                          src={player.photo_url!} 
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <div className="text-white">
                            <p className="font-semibold">{player.name}</p>
                            <p className="text-sm">#{player.number} - {player.position}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  {events
                    .filter(e => e.poster_url)
                    .map(event => (
                      <div key={event.id} className="aspect-square rounded-lg overflow-hidden bg-muted border-2 group relative">
                        <img 
                          src={event.poster_url!} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <div className="text-white">
                            <p className="font-semibold">{event.title}</p>
                            <p className="text-sm">{new Date(event.date).toLocaleDateString('es-ES')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                {!team.logo_url && participants.filter(p => p.photo_url).length === 0 && events.filter(e => e.poster_url).length === 0 && (
                  <div className="text-center py-12">
                    <Image className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay imágenes disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
