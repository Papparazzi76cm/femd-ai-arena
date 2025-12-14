import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, MapPin, Trophy, ArrowLeft, Medal, Target, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EventTeam {
  id: string;
  team_id: string;
  group_name: string | null;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  yellow_cards: number;
  red_cards: number;
  teams: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

interface Match {
  id: string;
  match_number: number | null;
  match_date: string | null;
  phase: string;
  group_name: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_yellow_cards: number;
  home_red_cards: number;
  away_yellow_cards: number;
  away_red_cards: number;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
  poster_url: string | null;
}

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadTournamentData = async () => {
      try {
        // Load event
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .single();

        if (eventError) throw eventError;
        setEvent(eventData);

        // Load event teams with team details
        const { data: teamsData, error: teamsError } = await supabase
          .from("event_teams")
          .select(`
            *,
            teams:team_id (
              id,
              name,
              logo_url
            )
          `)
          .eq("event_id", id)
          .order("points", { ascending: false })
          .order("goal_difference", { ascending: false });

        if (teamsError) throw teamsError;
        setEventTeams(teamsData || []);

        // Load matches
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select(`
            *,
            home_team:teams!matches_home_team_id_fkey (
              id,
              name,
              logo_url
            ),
            away_team:teams!matches_away_team_id_fkey (
              id,
              name,
              logo_url
            )
          `)
          .eq("event_id", id)
          .order("match_number", { ascending: true });

        if (matchesError) throw matchesError;
        setMatches(matchesData || []);
      } catch (error) {
        console.error("Error loading tournament data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTournamentData();

    // Subscribe to real-time updates
    const teamsChannel = supabase
      .channel('event-teams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_teams',
          filter: `event_id=eq.${id}`
        },
        () => {
          loadTournamentData();
        }
      )
      .subscribe();

    const matchesChannel = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `event_id=eq.${id}`
        },
        () => {
          loadTournamentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando torneo...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Torneo no encontrado</p>
      </div>
    );
  }

  // Group teams by group_name
  const groupedTeams = eventTeams.reduce((acc, team) => {
    const groupName = team.group_name || "General";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(team);
    return acc;
  }, {} as Record<string, EventTeam[]>);

  // Group matches by phase
  const groupedMatches = matches.reduce((acc, match) => {
    const phase = match.phase || "Fase de Grupos";
    if (!acc[phase]) {
      acc[phase] = [];
    }
    acc[phase].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Top scorers (mock data - would need a goals table in real implementation)
  const topScorers = eventTeams
    .flatMap(team => [{
      team: team.teams.name,
      goals: team.goals_for
    }])
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link to="/torneos">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Torneos
          </Button>
        </Link>

        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          {event.poster_url && (
            <div className="mb-6 rounded-lg overflow-hidden max-w-3xl mx-auto">
              <img
                src={event.poster_url}
                alt={event.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {event.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>
                  {format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="teams">
              <Users className="h-4 w-4 mr-2" />
              Equipos participantes
            </TabsTrigger>
            <TabsTrigger value="standings">
              <Trophy className="h-4 w-4 mr-2" />
              Posiciones
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Calendar className="h-4 w-4 mr-2" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="stats">
              <Medal className="h-4 w-4 mr-2" />
              Estadísticas
            </TabsTrigger>
          </TabsList>

          {/* Participating Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Equipos participantes ({eventTeams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {eventTeams.map((eventTeam) => (
                    <Link
                      key={eventTeam.id}
                      to={`/equipos/${eventTeam.team_id}`}
                      className="flex flex-col items-center p-4 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all group"
                    >
                      <div className="w-16 h-16 mb-3 flex items-center justify-center">
                        {eventTeam.teams.logo_url ? (
                          <img
                            src={eventTeam.teams.logo_url}
                            alt={eventTeam.teams.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
                        {eventTeam.teams.name}
                      </span>
                      {eventTeam.group_name && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {eventTeam.group_name}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Standings Tab */}
          <TabsContent value="standings" className="space-y-6">
            {Object.entries(groupedTeams).map(([groupName, teams]) => (
              <Card key={groupName} className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    {groupName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead className="text-center">PJ</TableHead>
                          <TableHead className="text-center">G</TableHead>
                          <TableHead className="text-center">E</TableHead>
                          <TableHead className="text-center">P</TableHead>
                          <TableHead className="text-center">GF</TableHead>
                          <TableHead className="text-center">GC</TableHead>
                          <TableHead className="text-center">DG</TableHead>
                          <TableHead className="text-center font-bold">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((team, index) => (
                          <TableRow key={team.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {team.teams.logo_url && (
                                  <img
                                    src={team.teams.logo_url}
                                    alt={team.teams.name}
                                    className="h-6 w-6 object-contain"
                                  />
                                )}
                                <span className="font-medium">{team.teams.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{team.matches_played}</TableCell>
                            <TableCell className="text-center">{team.wins}</TableCell>
                            <TableCell className="text-center">{team.draws}</TableCell>
                            <TableCell className="text-center">{team.losses}</TableCell>
                            <TableCell className="text-center">{team.goals_for}</TableCell>
                            <TableCell className="text-center">{team.goals_against}</TableCell>
                            <TableCell className="text-center">{team.goal_difference}</TableCell>
                            <TableCell className="text-center font-bold">{team.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            {Object.entries(groupedMatches).map(([phase, phaseMatches]) => (
              <Card key={phase} className="animate-fade-in">
                <CardHeader>
                  <CardTitle>{phase}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {phaseMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            {match.home_team.logo_url && (
                              <img
                                src={match.home_team.logo_url}
                                alt={match.home_team.name}
                                className="h-8 w-8 object-contain"
                              />
                            )}
                            <span className="font-medium">{match.home_team.name}</span>
                          </div>
                          {match.status === "completed" ? (
                            <span className="text-2xl font-bold mx-4">{match.home_score}</span>
                          ) : (
                            <span className="text-muted-foreground mx-4">vs</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {match.away_team.logo_url && (
                              <img
                                src={match.away_team.logo_url}
                                alt={match.away_team.name}
                                className="h-8 w-8 object-contain"
                              />
                            )}
                            <span className="font-medium">{match.away_team.name}</span>
                          </div>
                          {match.status === "completed" && (
                            <span className="text-2xl font-bold mx-4">{match.away_score}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {match.match_date && (
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(match.match_date), "d MMM, HH:mm", { locale: es })}
                          </p>
                        )}
                        {match.group_name && (
                          <Badge variant="outline" className="mt-1">
                            {match.group_name}
                          </Badge>
                        )}
                        <Badge
                          variant={match.status === "completed" ? "default" : "secondary"}
                          className="mt-1 ml-2"
                        >
                          {match.status === "completed" ? "Finalizado" : "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Scoring Teams */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Equipos Goleadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topScorers.map((scorer, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-primary">{index + 1}</span>
                          <span className="font-medium">{scorer.team}</span>
                        </div>
                        <Badge variant="secondary">{scorer.goals} goles</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Discipline Stats */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Tarjetas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {eventTeams
                      .sort((a, b) => (b.yellow_cards + b.red_cards * 2) - (a.yellow_cards + a.red_cards * 2))
                      .slice(0, 5)
                      .map((team, index) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-primary">{index + 1}</span>
                            <span className="font-medium">{team.teams.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              {team.yellow_cards} 🟨
                            </Badge>
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                              {team.red_cards} 🟥
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
