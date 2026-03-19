import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Trophy, ArrowLeft, Medal, Target, AlertTriangle, Users, ChevronDown, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TournamentGalleryDisplay } from "@/components/TournamentGalleryDisplay";

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
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
  poster_url: string | null;
}

interface CalculatedTeamStats {
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

const PHASE_ORDER = ['Fase de Grupos', 'Fase Oro', 'Fase Plata', 'Fase Bronce'];
const PHASE_LABELS: Record<string, string> = {
  'Fase de Grupos': 'Fase de Grupos',
  'Fase Oro': 'Fase Oro',
  'Fase Plata': 'Fase Plata',
  'Fase Bronce': 'Fase Bronce',
  'group': 'Fase de Grupos'
};

const isCompletedStatus = (status: string | null | undefined) =>
  status === 'finished' || status === 'completed';

const isGroupStagePhase = (phase: string | null | undefined) => {
  const p = (phase ?? '').toLowerCase();
  return phase === 'group' || phase === 'Fase de Grupos' || p.includes('grupo') || p.startsWith('jornada');
};
export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [selectedBracketGroup, setSelectedBracketGroup] = useState<string>("all");
  const [selectedJornada, setSelectedJornada] = useState<string>("all");

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
          .eq("event_id", id);

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

  // Calculate team statistics from match results
  const calculatedStandings = useMemo(() => {
    // Filter group stage matches (grupo/jornada) that are already finalizados
    const groupMatches = matches.filter(m => isGroupStagePhase(m.phase) && isCompletedStatus(m.status));
    
    // Initialize stats for each team
    const statsMap = new Map<string, CalculatedTeamStats>();
    eventTeams.forEach(et => {
      statsMap.set(et.team_id, {
        team_id: et.team_id,
        group_name: et.group_name,
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
        yellow_cards: 0,
        red_cards: 0,
        teams: et.teams
      });
    });

    // Calculate stats from matches
    groupMatches.forEach(match => {
      const homeStats = statsMap.get(match.home_team_id);
      const awayStats = statsMap.get(match.away_team_id);

      if (!homeStats || !awayStats) return;
      if (match.home_score === null || match.away_score === null) return;

      homeStats.matches_played++;
      awayStats.matches_played++;

      homeStats.goals_for += match.home_score;
      homeStats.goals_against += match.away_score;
      awayStats.goals_for += match.away_score;
      awayStats.goals_against += match.home_score;

      homeStats.yellow_cards += match.home_yellow_cards || 0;
      homeStats.red_cards += match.home_red_cards || 0;
      awayStats.yellow_cards += match.away_yellow_cards || 0;
      awayStats.red_cards += match.away_red_cards || 0;

      if (match.home_score > match.away_score) {
        homeStats.wins++;
        homeStats.points += 3;
        awayStats.losses++;
      } else if (match.home_score < match.away_score) {
        awayStats.wins++;
        awayStats.points += 3;
        homeStats.losses++;
      } else {
        homeStats.draws++;
        awayStats.draws++;
        homeStats.points += 1;
        awayStats.points += 1;
      }

      homeStats.goal_difference = homeStats.goals_for - homeStats.goals_against;
      awayStats.goal_difference = awayStats.goals_for - awayStats.goals_against;
    });

    return Array.from(statsMap.values());
  }, [eventTeams, matches]);

  // Helper function to get head-to-head result between two teams
  const getHeadToHeadResult = (teamAId: string, teamBId: string, groupMatches: Match[]): number => {
    // Find direct matches between the two teams
    const directMatches = groupMatches.filter(m => 
      (m.home_team_id === teamAId && m.away_team_id === teamBId) ||
      (m.home_team_id === teamBId && m.away_team_id === teamAId)
    );

    if (directMatches.length === 0) return 0;

    let teamAGoals = 0;
    let teamBGoals = 0;
    let teamAPoints = 0;
    let teamBPoints = 0;

    directMatches.forEach(match => {
      if (match.home_score === null || match.away_score === null) return;

      if (match.home_team_id === teamAId) {
        teamAGoals += match.home_score;
        teamBGoals += match.away_score;
        if (match.home_score > match.away_score) teamAPoints += 3;
        else if (match.home_score < match.away_score) teamBPoints += 3;
        else { teamAPoints += 1; teamBPoints += 1; }
      } else {
        teamBGoals += match.home_score;
        teamAGoals += match.away_score;
        if (match.home_score > match.away_score) teamBPoints += 3;
        else if (match.home_score < match.away_score) teamAPoints += 3;
        else { teamAPoints += 1; teamBPoints += 1; }
      }
    });

    // First compare points in head-to-head
    if (teamAPoints !== teamBPoints) return teamBPoints - teamAPoints;
    // Then compare goal difference in head-to-head
    return (teamBGoals - teamAGoals) - (teamAGoals - teamBGoals);
  };

  // Group calculated standings by group_name and sort
  const groupedCalculatedStandings = useMemo(() => {
    const groupMatches = matches.filter(m => isGroupStagePhase(m.phase) && isCompletedStatus(m.status));
    const grouped = calculatedStandings.reduce((acc, team) => {
      const groupName = team.group_name || "General";
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(team);
      return acc;
    }, {} as Record<string, CalculatedTeamStats[]>);

    // Sort each group by standings criteria with head-to-head
    Object.keys(grouped).forEach(groupName => {
      grouped[groupName].sort((a, b) => {
        // 1. Points
        if (b.points !== a.points) return b.points - a.points;
        // 2. Head-to-head result (when points are equal)
        const h2h = getHeadToHeadResult(a.team_id, b.team_id, groupMatches);
        if (h2h !== 0) return h2h;
        // 3. Goal difference
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        // 4. Goals for
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
        // 5. Goals against (fewer is better)
        if (a.goals_against !== b.goals_against) return a.goals_against - b.goals_against;
        // 6. Red cards (fewer is better)
        if (a.red_cards !== b.red_cards) return a.red_cards - b.red_cards;
        // 7. Yellow cards (fewer is better)
        return a.yellow_cards - b.yellow_cards;
      });
    });

    // Sort groups alphabetically
    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
    );
  }, [calculatedStandings, matches]);

  // Group matches by phase with proper ordering
  const groupedMatchesByPhase = useMemo(() => {
    const grouped = matches.reduce((acc, match) => {
      const phase = match.phase || "group";
      if (!acc[phase]) {
        acc[phase] = [];
      }
      acc[phase].push(match);
      return acc;
    }, {} as Record<string, Match[]>);

    // Sort phases by defined order
    const sortedPhases = Object.entries(grouped).sort(([a], [b]) => {
      const indexA = PHASE_ORDER.indexOf(a);
      const indexB = PHASE_ORDER.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return sortedPhases;
  }, [matches]);

  // Get tournament winner
  const tournamentWinner = useMemo(() => {
    const finalMatch = matches.find(m => m.phase === 'final' && isCompletedStatus(m.status));
    if (!finalMatch || finalMatch.home_score === null || finalMatch.away_score === null) return null;
    
    if (finalMatch.home_score > finalMatch.away_score) {
      return finalMatch.home_team;
    } else if (finalMatch.away_score > finalMatch.home_score) {
      return finalMatch.away_team;
    }
    return null;
  }, [matches]);

  // Toggle phase visibility
  const togglePhase = (phase: string) => {
    setOpenPhases(prev => ({
      ...prev,
      [phase]: !prev[phase]
    }));
  };

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

  // Top scorers (mock data - would need a goals table in real implementation)
  const topScorers = calculatedStandings
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

        {/* Tournament Winner Banner */}
        {tournamentWinner && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 border-yellow-500/50 animate-fade-in">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Crown className="h-10 w-10 text-yellow-500" />
                <div className="text-center sm:text-left">
                  <p className="text-sm text-muted-foreground">Campeón del Torneo</p>
                  <div className="flex items-center gap-3 mt-1">
                    {tournamentWinner.logo_url && (
                      <img
                        src={tournamentWinner.logo_url}
                        alt={tournamentWinner.name}
                        className="h-12 w-12 object-contain"
                      />
                    )}
                    <h2 className="text-2xl font-bold text-foreground">{tournamentWinner.name}</h2>
                  </div>
                </div>
                <Crown className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          {event.poster_url && (
            <div className="mb-6 rounded-lg overflow-hidden max-w-3xl mx-auto">
              <img
                src={event.poster_url}
                alt={event.title}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
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
        <Tabs defaultValue="bracket" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1 mb-8">
            <TabsTrigger value="bracket" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              <Trophy className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Cuadro del Torneo</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              <Users className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Equipos</span>
            </TabsTrigger>
            <TabsTrigger value="standings" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              <Target className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Clasificación</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              <Medal className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Estadísticas</span>
            </TabsTrigger>
          </TabsList>

          {/* Tournament Bracket Tab with Filters */}
          <TabsContent value="bracket" className="space-y-4">
            {matches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay partidos registrados para este torneo.
                </CardContent>
              </Card>
            ) : (
              <Card className="animate-fade-in">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[280px_1fr]">
                    {/* Left Sidebar - Filters */}
                    <div className="border-r bg-muted/30 p-6 space-y-6">
                      <h3 className="font-bold text-lg">GRUPOS</h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">FASE</label>
                          <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder="Seleccionar fase" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">Todas las fases</SelectItem>
                              <SelectItem value="Fase de Grupos">Fase de Grupos</SelectItem>
                              <SelectItem value="Fase Oro">Fase Oro</SelectItem>
                              <SelectItem value="Fase Plata">Fase Plata</SelectItem>
                              <SelectItem value="Fase Bronce">Fase Bronce</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">GRUPO</label>
                          <Select value={selectedBracketGroup} onValueChange={setSelectedBracketGroup}>
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder="Seleccionar grupo" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">Todos los grupos</SelectItem>
                              {selectedPhase === "Fase de Grupos" || selectedPhase === "all" ? (
                                // Show group letters for group phase
                                Array.from(new Set(matches
                                  .filter(m => m.group_name && (m.phase === "group" || m.phase === "Fase de Grupos" || m.phase?.toLowerCase().includes("grupo") || m.phase?.startsWith("Jornada")))
                                  .map(m => m.group_name)))
                                  .sort()
                                  .map((group) => (
                                    <SelectItem key={group} value={group || ""}>
                                      {group}
                                    </SelectItem>
                                  ))
                              ) : (
                                // For knockout phases, show the phase name as the only group
                                <SelectItem value={selectedPhase}>{selectedPhase}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">JORNADA</label>
                          <Select value={selectedJornada} onValueChange={setSelectedJornada}>
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder="Seleccionar jornada" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">Todas</SelectItem>
                              {selectedPhase === "Fase de Grupos" || selectedPhase === "all" ? (
                                // Show jornadas for group phase
                                <>
                                  <SelectItem value="1">Jornada 1</SelectItem>
                                  <SelectItem value="2">Jornada 2</SelectItem>
                                  <SelectItem value="3">Jornada 3</SelectItem>
                                </>
                              ) : selectedPhase === "Fase Oro" ? (
                                <>
                                  <SelectItem value="1/8 de final">1/8 de final</SelectItem>
                                  <SelectItem value="1/4 de final">1/4 de final</SelectItem>
                                  <SelectItem value="Semifinal">Semifinal</SelectItem>
                                  <SelectItem value="Final">Final</SelectItem>
                                </>
                              ) : selectedPhase === "Fase Plata" ? (
                                <>
                                  <SelectItem value="1/4 de final">1/4 de final</SelectItem>
                                  <SelectItem value="Semifinal">Semifinal</SelectItem>
                                  <SelectItem value="Final">Final</SelectItem>
                                </>
                              ) : selectedPhase === "Fase Bronce" ? (
                                <>
                                  <SelectItem value="Semifinal">Semifinal</SelectItem>
                                  <SelectItem value="Final">Final</SelectItem>
                                </>
                              ) : null}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Main Content - Results */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg">RESULTADOS</h3>
                      </div>

                      <div className="space-y-6">
                        {(() => {
                          // Helper function to determine jornada from phase field
                          const getMatchJornada = (match: Match): string => {
                            if (match.phase?.startsWith("Jornada")) {
                              return match.phase;
                            }
                            return "";
                          };

                          const filteredMatches = matches
                            .filter(match => {
                              const isGroupPhase = match.phase === "group" || match.phase === "Fase de Grupos" || match.phase?.toLowerCase().includes("grupo") || match.phase?.startsWith("Jornada");
                              const phaseMatch = selectedPhase === "all" || 
                                match.phase === selectedPhase || 
                                (selectedPhase === "Fase de Grupos" && isGroupPhase);
                              
                              // Group filter
                              const groupMatch = selectedBracketGroup === "all" || 
                                (isGroupPhase ? match.group_name === selectedBracketGroup : true);
                              
                              // Jornada filter
                              let jornadaMatch = true;
                              if (selectedJornada !== "all") {
                                if (isGroupPhase) {
                                  jornadaMatch = match.phase === `Jornada ${selectedJornada}`;
                                } else {
                                  jornadaMatch = match.group_name === selectedJornada;
                                }
                              }
                              
                              return phaseMatch && groupMatch && jornadaMatch;
                            })
                            .sort((a, b) => {
                              // Sort by group first, then by phase/jornada
                              if (a.group_name && b.group_name && a.group_name !== b.group_name) {
                                return a.group_name.localeCompare(b.group_name);
                              }
                              if (a.phase && b.phase && a.phase !== b.phase) {
                                return a.phase.localeCompare(b.phase);
                              }
                              return (a.match_number || 0) - (b.match_number || 0);
                            });

                          if (filteredMatches.length === 0) {
                            return (
                              <p className="text-center text-muted-foreground py-8">
                                No hay partidos con los filtros seleccionados.
                              </p>
                            );
                          }

                          // Group matches by group_name for display
                          const matchesByGroup = filteredMatches.reduce((acc, match) => {
                            const groupName = match.group_name || "Sin grupo";
                            if (!acc[groupName]) {
                              acc[groupName] = [];
                            }
                            acc[groupName].push(match);
                            return acc;
                          }, {} as Record<string, Match[]>);

                          // Sort groups alphabetically
                          const sortedGroups = Object.keys(matchesByGroup).sort();

                          return sortedGroups.map((groupName) => (
                            <div key={groupName} className="space-y-3">
                              <div className="flex items-center gap-2 border-l-4 border-primary pl-3 py-1 bg-muted/30 rounded-r">
                                <h4 className="font-bold text-base">{groupName}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {matchesByGroup[groupName].length} partidos
                                </Badge>
                              </div>
                              <div className="space-y-2 pl-4">
                                {matchesByGroup[groupName].map((match) => (
                                  <ResultRow key={match.id} match={match} />
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

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
                          Grupo {eventTeam.group_name}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Standings Tab - Calculated from match results */}
          <TabsContent value="standings" className="space-y-6">
            {Object.entries(groupedCalculatedStandings).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay datos de clasificación disponibles.
                </CardContent>
              </Card>
            ) : (
              <Card className="animate-fade-in">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    CLASIFICACIÓN
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                      <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder="Seleccionar grupo" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="all">TODOS LOS GRUPOS</SelectItem>
                        {Object.keys(groupedCalculatedStandings).map((groupName) => (
                          <SelectItem key={groupName} value={groupName}>
                            GRUPO {groupName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(groupedCalculatedStandings)
                    .filter(([groupName]) => selectedGroup === "all" || groupName === selectedGroup)
                    .map(([groupName, teams]) => (
                      <div key={groupName} className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-primary pl-3">
                          <h3 className="text-lg font-bold">GRUPO {groupName}</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-10"></TableHead>
                                <TableHead className="font-bold">EQUIPOS</TableHead>
                                <TableHead className="text-center font-bold">PTS</TableHead>
                                <TableHead className="text-center">J</TableHead>
                                <TableHead className="text-center">G</TableHead>
                                <TableHead className="text-center">E</TableHead>
                                <TableHead className="text-center">P</TableHead>
                                <TableHead className="text-center">GF</TableHead>
                                <TableHead className="text-center">GC</TableHead>
                                <TableHead className="text-center">DG</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teams.map((team, index) => (
                                <TableRow 
                                  key={team.team_id}
                                  className={index < 2 ? "border-l-4 border-l-primary bg-primary/5" : ""}
                                >
                                  <TableCell className="font-bold text-muted-foreground">
                                    {String(index + 1).padStart(2, '0')}
                                  </TableCell>
                                  <TableCell>
                                    <Link to={`/equipos/${team.team_id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                      {team.teams.logo_url && (
                                        <img
                                          src={team.teams.logo_url}
                                          alt={team.teams.name}
                                          className="h-6 w-6 object-contain"
                                        />
                                      )}
                                      <span className="font-medium">{team.teams.name}</span>
                                    </Link>
                                  </TableCell>
                                  <TableCell className="text-center font-bold">{team.points}</TableCell>
                                  <TableCell className="text-center">{team.matches_played}</TableCell>
                                  <TableCell className="text-center">{team.wins}</TableCell>
                                  <TableCell className="text-center text-muted-foreground">{team.draws}</TableCell>
                                  <TableCell className="text-center text-destructive">{team.losses}</TableCell>
                                  <TableCell className="text-center text-primary">{team.goals_for}</TableCell>
                                  <TableCell className="text-center text-destructive">{team.goals_against}</TableCell>
                                  <TableCell className={`text-center font-medium ${team.goal_difference > 0 ? 'text-green-600' : team.goal_difference < 0 ? 'text-red-600' : ''}`}>
                                    {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  <p className="text-xs text-muted-foreground mt-3">
                    <Badge variant="default" className="mr-1 bg-primary text-[10px]">C</Badge>
                    = Clasificado a siguiente fase
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Scoring Teams */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Equipos más goleadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topScorers.length > 0 ? (
                    <div className="space-y-3">
                      {topScorers.map((scorer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-primary">{index + 1}</span>
                            <span className="font-medium">{scorer.team}</span>
                          </div>
                          <Badge variant="secondary">
                            {scorer.goals} goles
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Sin datos disponibles
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Cards Statistics */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Tarjetas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calculatedStandings.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                        <span className="font-medium">Tarjetas amarillas</span>
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-500">
                          {calculatedStandings.reduce((sum, t) => sum + t.yellow_cards, 0)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
                        <span className="font-medium">Tarjetas rojas</span>
                        <Badge variant="outline" className="bg-red-500/20 text-red-700 border-red-500">
                          {calculatedStandings.reduce((sum, t) => sum + t.red_cards, 0)}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Sin datos disponibles
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tournament Summary */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-primary" />
                  Resumen del Torneo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-accent/50">
                    <p className="text-3xl font-bold text-primary">{eventTeams.length}</p>
                    <p className="text-sm text-muted-foreground">Equipos</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-accent/50">
                    <p className="text-3xl font-bold text-primary">{matches.length}</p>
                    <p className="text-sm text-muted-foreground">Partidos</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-accent/50">
                    <p className="text-3xl font-bold text-primary">
                      {matches.filter(m => isCompletedStatus(m.status)).reduce((sum, m) => sum + (m.home_score || 0) + (m.away_score || 0), 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Goles</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-accent/50">
                    <p className="text-3xl font-bold text-primary">
                      {Object.keys(groupedCalculatedStandings).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Grupos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tournament Gallery */}
        <div className="mt-12">
          <TournamentGalleryDisplay eventId={id!} />
        </div>
      </div>
    </div>
  );
}

// Helper to get display name for a match side
function getMatchSideName(match: Match, side: 'home' | 'away'): string {
  const team = side === 'home' ? match.home_team : match.away_team;
  const placeholder = side === 'home' ? match.home_placeholder : match.away_placeholder;
  if (team) return team.name;
  if (placeholder) return placeholder;
  return 'Por determinar';
}

function getMatchSideLogo(match: Match, side: 'home' | 'away'): string | null {
  const team = side === 'home' ? match.home_team : match.away_team;
  return team?.logo_url || null;
}

function isPlaceholder(match: Match, side: 'home' | 'away'): boolean {
  const team = side === 'home' ? match.home_team : match.away_team;
  return !team;
}

// Result Row Component - New horizontal design
function ResultRow({ match }: { match: Match }) {
  const isCompleted = isCompletedStatus(match.status);
  const hasHomeWon = isCompleted && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score;
  const hasAwayWon = isCompleted && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;
  const homeName = getMatchSideName(match, 'home');
  const awayName = getMatchSideName(match, 'away');
  const homeLogo = getMatchSideLogo(match, 'home');
  const awayLogo = getMatchSideLogo(match, 'away');
  const homeIsPlaceholder = isPlaceholder(match, 'home');
  const awayIsPlaceholder = isPlaceholder(match, 'away');

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors px-2 rounded">
      {/* Home Team */}
      <div className={`flex items-center gap-3 flex-1 justify-start ${hasHomeWon ? 'font-bold' : ''}`}>
        {homeLogo && (
          <img src={homeLogo} alt={homeName} className="h-8 w-8 object-contain" />
        )}
        <span className={`text-sm ${hasHomeWon ? 'text-primary' : ''} ${homeIsPlaceholder ? 'italic text-muted-foreground' : ''}`}>{homeName}</span>
      </div>

      {/* Score, Phase and Date */}
      <div className="flex flex-col items-center px-4 min-w-[200px]">
        {isCompleted ? (
          <span className="text-xl font-bold">
            <span className={hasHomeWon ? 'text-primary' : ''}>{match.home_score}</span>
            <span className="mx-2 text-muted-foreground">-</span>
            <span className={hasAwayWon ? 'text-primary' : ''}>{match.away_score}</span>
          </span>
        ) : (
          <span className="text-xl font-bold text-muted-foreground">- vs -</span>
        )}
        <div className="flex items-center gap-2 mt-1">
          {match.phase && (
            <span className="text-xs text-primary font-medium">{match.phase}</span>
          )}
          {match.match_date && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(match.match_date), "dd.MM.yyyy", { locale: es })}
            </span>
          )}
        </div>
      </div>

      {/* Away Team */}
      <div className={`flex items-center gap-3 flex-1 justify-end ${hasAwayWon ? 'font-bold' : ''}`}>
        <span className={`text-sm ${hasAwayWon ? 'text-primary' : ''} ${awayIsPlaceholder ? 'italic text-muted-foreground' : ''}`}>{awayName}</span>
        {awayLogo && (
          <img src={awayLogo} alt={awayName} className="h-8 w-8 object-contain" />
        )}
      </div>
    </div>
  );
}

// Match Card Component (kept for other uses)
function MatchCard({ match, isFinal = false }: { match: Match; isFinal?: boolean }) {
  const isCompleted = isCompletedStatus(match.status);
  const hasHomeWon = isCompleted && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score;
  const hasAwayWon = isCompleted && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors ${isFinal ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}
    >
      <div className="flex-1">
        {/* Home Team */}
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-3 flex-1 ${hasHomeWon ? 'font-bold' : ''}`}>
            {match.home_team.logo_url && (
              <img
                src={match.home_team.logo_url}
                alt={match.home_team.name}
                className="h-8 w-8 object-contain"
              />
            )}
            <span className={hasHomeWon ? 'text-primary' : ''}>{match.home_team.name}</span>
            {hasHomeWon && isFinal && <Crown className="h-4 w-4 text-yellow-500" />}
          </div>
          {isCompleted ? (
            <span className={`text-2xl font-bold mx-4 ${hasHomeWon ? 'text-primary' : 'text-muted-foreground'}`}>
              {match.home_score}
            </span>
          ) : (
            <span className="text-muted-foreground mx-4">-</span>
          )}
        </div>
        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 flex-1 ${hasAwayWon ? 'font-bold' : ''}`}>
            {match.away_team.logo_url && (
              <img
                src={match.away_team.logo_url}
                alt={match.away_team.name}
                className="h-8 w-8 object-contain"
              />
            )}
            <span className={hasAwayWon ? 'text-primary' : ''}>{match.away_team.name}</span>
            {hasAwayWon && isFinal && <Crown className="h-4 w-4 text-yellow-500" />}
          </div>
          {isCompleted ? (
            <span className={`text-2xl font-bold mx-4 ${hasAwayWon ? 'text-primary' : 'text-muted-foreground'}`}>
              {match.away_score}
            </span>
          ) : (
            <span className="text-muted-foreground mx-4">-</span>
          )}
        </div>
      </div>
      <div className="text-right ml-4 flex flex-col items-end gap-1">
        {match.match_date && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(match.match_date), "d MMM, HH:mm", { locale: es })}
          </p>
        )}
        <Badge
          variant={isCompleted ? "default" : "secondary"}
          className="text-xs"
        >
          {isCompleted ? "Finalizado" : "Pendiente"}
        </Badge>
      </div>
    </div>
  );
}

export default TournamentDetailPage;
