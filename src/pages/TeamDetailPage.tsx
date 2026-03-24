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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Trophy, Calendar, Palette, Loader2, Image, TrendingUp, Target, Shield, MapPin, ChevronDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TournamentRoster {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  players: {
    participant: Participant;
    jersey_number: number | null;
    is_captain: boolean;
    roster_role: string;
    staff_position: string | null;
  }[];
}

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
  const [tournamentRosters, setTournamentRosters] = useState<TournamentRoster[]>([]);
  const [openRosters, setOpenRosters] = useState<Record<string, boolean>>({});
  const [matchFilter, setMatchFilter] = useState<string>('all');
  const [statsFilter, setStatsFilter] = useState<string>('all');

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

      // Load tournament rosters
      // Find event_teams for this team
      const { data: eventTeamsData } = await supabase
        .from('event_teams')
        .select('id, event_id')
        .eq('team_id', id);

      if (eventTeamsData && eventTeamsData.length > 0) {
        const eventTeamIds = eventTeamsData.map(et => et.id);
        
        const { data: rostersData } = await supabase
          .from('team_rosters')
          .select('*, participant:participants(*)')
          .in('event_team_id', eventTeamIds);

        // Group by event
        const rostersByEvent: Record<string, TournamentRoster> = {};
        
        for (const et of eventTeamsData) {
          const eventData = eventsData.find(e => e.id === et.event_id);
          if (!eventData) continue;
          
          const rosterEntries = (rostersData || []).filter(r => r.event_team_id === et.id);
          if (rosterEntries.length === 0) continue;
          
          rostersByEvent[et.event_id] = {
            eventId: et.event_id,
            eventTitle: eventData.title,
            eventDate: eventData.date,
            players: rosterEntries.map((r: any) => ({
              participant: r.participant,
              jersey_number: r.jersey_number,
              is_captain: r.is_captain,
              roster_role: r.roster_role,
              staff_position: r.staff_position,
            })),
          };
        }
        
        setTournamentRosters(
          Object.values(rostersByEvent).sort((a, b) => 
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
          )
        );
      }
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

  // Get unique events from matches for filter dropdowns
  const matchEvents = Array.from(
    new Map(
      matches
        .filter(m => m.event)
        .map(m => [m.event.id, { id: m.event.id, title: m.event.title }])
    ).values()
  );

  const filteredMatches = matchFilter === 'all' 
    ? matches 
    : matches.filter(m => m.event?.id === matchFilter);

  const statsMatches = statsFilter === 'all'
    ? matches
    : matches.filter(m => m.event?.id === statsFilter);

  const getLocationString = (t: Team) => {
    const parts = [t.city, t.province, t.country].filter(Boolean);
    return parts.join(', ');
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

  const location = getLocationString(team);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-16">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <div className="flex gap-2 mb-6">
          <Button variant="ghost" onClick={() => navigate('/equipos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a clubes
          </Button>
          {team.parent_team_id && (
            <Button variant="outline" onClick={() => navigate(`/equipos/${team.parent_team_id}`)}>
              <Shield className="w-4 h-4 mr-2" />
              Ver club principal
            </Button>
          )}
        </div>

        {/* Team Header */}
        <Card className="mb-8 overflow-hidden border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                {team.logo_url ? (
                  <div className="w-32 h-32 rounded-full bg-background flex items-center justify-center overflow-hidden ring-4 ring-background shadow-xl">
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-4" />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-4 ring-background shadow-xl">
                    <Users className="w-16 h-16 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <CardTitle className="text-4xl mb-1">{team.name}</CardTitle>
                {location && (
                  <p className="text-muted-foreground text-sm mb-3 flex items-center gap-1 justify-center md:justify-start">
                    <MapPin className="w-3.5 h-3.5" />
                    {location}
                  </p>
                )}
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

        {/* Tabs */}
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
            <TabsTrigger value="plantillas" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Plantillas
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
                    {childTeams.map((child) => (
                      <Card key={child.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/equipos/${child.id}`)}>
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

          {/* Plantillas Tab - Grouped by tournament */}
          <TabsContent value="plantillas">
            <Card>
              <CardHeader>
                <CardTitle>Plantillas por Torneo</CardTitle>
                <CardDescription>Plantillas específicas de cada torneo en el que ha participado {team.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {tournamentRosters.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay plantillas registradas para este equipo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tournamentRosters.map((roster) => {
                      const players = roster.players.filter(p => p.roster_role === 'player').sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99));
                      const staff = roster.players.filter(p => p.roster_role === 'staff');
                      const headCoach = staff.find(s => s.staff_position === 'Primer Entrenador');
                      const otherStaff = staff.filter(s => s.staff_position !== 'Primer Entrenador');

                      return (
                        <Collapsible
                          key={roster.eventId}
                          open={openRosters[roster.eventId]}
                          onOpenChange={(open) => setOpenRosters(prev => ({ ...prev, [roster.eventId]: open }))}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-4 h-auto border rounded-lg hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <Trophy className="w-5 h-5 text-primary" />
                                <div className="text-left">
                                  <p className="font-semibold">{roster.eventTitle}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(roster.eventDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
                                    {' · '}{players.length} jugadores
                                    {staff.length > 0 && `, ${staff.length} cuerpo técnico`}
                                  </p>
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 transition-transform ${openRosters[roster.eventId] ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="border rounded-lg overflow-hidden">
                              {/* Players table with stats */}
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="w-12">N°</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="hidden sm:table-cell">Posición</TableHead>
                                    <TableHead className="text-center w-10" title="Partidos Jugados">PJ</TableHead>
                                    <TableHead className="text-center w-10" title="Victorias">G</TableHead>
                                    <TableHead className="text-center w-10" title="Empates">E</TableHead>
                                    <TableHead className="text-center w-10" title="Derrotas">P</TableHead>
                                    <TableHead className="text-center w-10" title="Goles">⚽</TableHead>
                                    <TableHead className="text-center w-10" title="Tarjetas Amarillas">🟨</TableHead>
                                    <TableHead className="text-center w-10" title="Tarjetas Rojas">🟥</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {players.map(({ participant, jersey_number, is_captain }) => (
                                    <TableRow key={participant.id}>
                                      <TableCell className="font-bold">{jersey_number || '-'}</TableCell>
                                      <TableCell>
                                        <Link to={`/jugador/${participant.id}`} className="flex items-center gap-2 hover:text-primary">
                                          {participant.photo_url ? (
                                            <img src={participant.photo_url} alt={participant.name} className="w-8 h-8 rounded-full object-cover" />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                              <Users className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                          )}
                                          <span className="hover:underline">{participant.name}</span>
                                          {is_captain && <Badge variant="secondary" className="text-xs ml-1">C</Badge>}
                                        </Link>
                                      </TableCell>
                                      <TableCell className="hidden sm:table-cell">
                                        {participant.position ? <Badge variant="outline">{participant.position}</Badge> : '-'}
                                      </TableCell>
                                      <TableCell className="text-center text-sm">{participant.matches_played || 0}</TableCell>
                                      <TableCell className="text-center text-sm">-</TableCell>
                                      <TableCell className="text-center text-sm">-</TableCell>
                                      <TableCell className="text-center text-sm">-</TableCell>
                                      <TableCell className="text-center text-sm font-medium text-primary">{participant.goals_scored || 0}</TableCell>
                                      <TableCell className="text-center text-sm">{participant.yellow_cards || 0}</TableCell>
                                      <TableCell className="text-center text-sm">{participant.red_cards || 0}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>

                              {/* Staff section - styled prominently */}
                              {staff.length > 0 && (
                                <div className="border-t bg-muted/20 p-4">
                                  <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Cuerpo Técnico</p>
                                  
                                  {/* Head Coach - Featured */}
                                  {headCoach && (
                                    <div className="flex items-center gap-4 p-4 mb-3 rounded-lg bg-primary/10 border border-primary/20">
                                      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/30">
                                        {headCoach.participant.photo_url ? (
                                          <img src={headCoach.participant.photo_url} alt={headCoach.participant.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                          <Shield className="w-7 h-7 text-primary" />
                                        )}
                                      </div>
                                      <div>
                                        <Link to={`/jugador/${headCoach.participant.id}`} className="font-bold text-lg hover:text-primary hover:underline">
                                          {headCoach.participant.name}
                                        </Link>
                                        <p className="text-sm text-primary font-semibold">Primer Entrenador</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Other Staff */}
                                  {otherStaff.length > 0 && (
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                      {otherStaff.map(({ participant, staff_position }) => (
                                        <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border">
                                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                            {participant.photo_url ? (
                                              <img src={participant.photo_url} alt={participant.name} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                              <Users className="w-5 h-5 text-muted-foreground" />
                                            )}
                                          </div>
                                          <div>
                                            <Link to={`/jugador/${participant.id}`} className="font-medium text-sm hover:text-primary hover:underline">
                                              {participant.name}
                                            </Link>
                                            {staff_position && <p className="text-xs text-muted-foreground">{staff_position}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estadísticas Tab */}
          <TabsContent value="estadisticas" className="space-y-6">
            {/* Filter */}
            {matchEvents.length > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Filtrar por torneo:</span>
                <Select value={statsFilter} onValueChange={setStatsFilter}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Todos los torneos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los torneos</SelectItem>
                    {matchEvents.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Evolución de Resultados</CardTitle>
                  <CardDescription>Resultados por partido</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={statsMatches.slice(0, 10).map((match, idx) => {
                      const isHome = match.home_team_id === id;
                      const teamScore = isHome ? match.home_score : match.away_score;
                      const opponentScore = isHome ? match.away_score : match.home_score;
                      let result = 'Empate';
                      if (match.status === 'finished' && teamScore !== undefined && opponentScore !== undefined) {
                        if (teamScore > opponentScore) result = 'Victoria';
                        else if (teamScore < opponentScore) result = 'Derrota';
                      }
                      return { partido: `P${idx + 1}`, resultado: result === 'Victoria' ? 3 : result === 'Empate' ? 1 : 0, label: result };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="partido" className="text-xs" />
                      <YAxis domain={[0, 3]} ticks={[0, 1, 3]} className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: any, name: any, props: any) => [props.payload.label, 'Resultado']} />
                      <Line type="monotone" dataKey="resultado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Goles por Partido</CardTitle>
                  <CardDescription>A favor y en contra</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statsMatches.slice(0, 10).map((match, idx) => {
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
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                      <Bar dataKey="aFavor" fill="hsl(var(--primary))" name="A favor" />
                      <Bar dataKey="enContra" fill="hsl(var(--destructive))" name="En contra" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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
                        {statsMatches.length > 0
                          ? (statsMatches.reduce((sum, m) => {
                              const isHome = m.home_team_id === id;
                              return sum + (isHome ? (m.home_score || 0) : (m.away_score || 0));
                            }, 0) / statsMatches.length).toFixed(2)
                          : '0.00'}
                      </p>
                    </div>
                    <div className="p-4 bg-destructive/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Goles en Contra</p>
                      <p className="text-3xl font-bold text-destructive">
                        {statsMatches.length > 0
                          ? (statsMatches.reduce((sum, m) => {
                              const isHome = m.home_team_id === id;
                              return sum + (isHome ? (m.away_score || 0) : (m.home_score || 0));
                            }, 0) / statsMatches.length).toFixed(2)
                          : '0.00'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                {/* Filter */}
                {matchEvents.length > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-medium">Torneo:</span>
                    <Select value={matchFilter} onValueChange={setMatchFilter}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los torneos</SelectItem>
                        {matchEvents.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {filteredMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay partidos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMatches.map(match => {
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
                                    <Badge variant="outline" className="text-xs">{match.event.title}</Badge>
                                  )}
                                  <Badge variant={
                                    result === 'win' ? 'default' : result === 'loss' ? 'destructive' : result === 'draw' ? 'secondary' : 'outline'
                                  }>
                                    {result === 'win' ? 'Victoria' : result === 'loss' ? 'Derrota' : result === 'draw' ? 'Empate' : 'Programado'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="flex items-center gap-2 flex-1">
                                    {team.logo_url && <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />}
                                    <span className="font-semibold">{team.name}</span>
                                  </div>
                                  <div className="text-center px-4">
                                    {teamScore !== null && opponentScore !== null ? (
                                      <span className="text-2xl font-bold">{teamScore} - {opponentScore}</span>
                                    ) : (
                                      <span className="text-xl text-muted-foreground">vs</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-1 justify-end">
                                    <span className="font-semibold">{opponent?.name}</span>
                                    {opponent?.logo_url && <img src={opponent.logo_url} alt={opponent.name} className="w-8 h-8 object-contain" />}
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
                <CardDescription>Fotos y momentos destacados de {team.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {team.logo_url && (
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2">
                      <img src={team.logo_url} alt={`Logo ${team.name}`} className="w-full h-full object-contain p-4" />
                    </div>
                  )}
                  {participants.filter(p => p.photo_url).map(player => (
                    <div key={player.id} className="aspect-square rounded-lg overflow-hidden bg-muted border-2 group relative">
                      <img src={player.photo_url!} alt={player.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <div className="text-white">
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-sm">#{player.number} - {player.position}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {events.filter(e => e.poster_url).map(event => (
                    <div key={event.id} className="aspect-square rounded-lg overflow-hidden bg-muted border-2 group relative">
                      <img src={event.poster_url!} alt={event.title} className="w-full h-full object-cover" />
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
