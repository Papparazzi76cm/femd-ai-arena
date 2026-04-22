import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Trophy, ArrowLeft, Medal, Target, AlertTriangle, Users, ChevronDown, Crown, Star, Goal, Image as ImageIcon, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TournamentGalleryDisplay } from "@/components/TournamentGalleryDisplay";
import { TournamentGalleryManager } from "@/components/admin/TournamentGalleryManager";
import { TeamLogo } from "@/components/TeamLogo";

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
  field_id: string | null;
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
  field: {
    id: string;
    name: string;
    facility_id: string;
    facilities: {
      id: string;
      name: string;
    } | null;
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

// Numeric priority for sorting phases in the correct tournament order
const getPhaseOrderIndex = (phase: string): number => {
  if (isGroupStagePhase(phase)) return 0;
  // Gold phases
  if (phase === 'gold_round_of_16') return 10;
  if (phase === 'gold_round_of_8') return 11;
  if (phase === 'gold_quarter_final') return 12;
  if (phase === 'gold_semi_final') return 13;
  if (phase === 'gold_third_place') return 14;
  if (phase === 'gold_final') return 15;
  // Silver phases
  if (phase === 'silver_round_of_16') return 20;
  if (phase === 'silver_round_of_8') return 21;
  if (phase === 'silver_quarter_final') return 22;
  if (phase === 'silver_semi_final') return 23;
  if (phase === 'silver_third_place') return 24;
  if (phase === 'silver_final') return 25;
  // Bronze phases
  if (phase === 'bronze_round_of_16') return 30;
  if (phase === 'bronze_round_of_8') return 31;
  if (phase === 'bronze_quarter_final') return 32;
  if (phase === 'bronze_semi_final') return 33;
  if (phase === 'bronze_third_place') return 34;
  if (phase === 'bronze_final') return 35;
  // Generic (no tier prefix)
  if (phase === 'round_of_16') return 10;
  if (phase === 'round_of_8') return 11;
  if (phase === 'quarter_final') return 12;
  if (phase === 'semi_final') return 13;
  if (phase === 'third_place') return 14;
  if (phase === 'final') return 15;
  return 99;
};

const getPhaseDisplayLabel = (phase: string): string => {
  if (isGroupStagePhase(phase)) return 'Fase de Grupos';
  const tierPrefix = phase.startsWith('gold_') ? 'Fase Oro' : phase.startsWith('silver_') ? 'Fase Plata' : phase.startsWith('bronze_') ? 'Fase Bronce' : '';
  const base = phase.replace(/^(gold_|silver_|bronze_)/, '');
  const roundLabels: Record<string, string> = {
    'round_of_16': '1/16 de Final',
    'round_of_8': '1/8 de Final',
    'quarter_final': '1/4 de Final',
    'semi_final': 'Semifinales',
    'third_place': '3er y 4º puesto',
    'final': 'Final',
  };
  const roundLabel = roundLabels[base] || base;
  return tierPrefix ? `${tierPrefix} - ${roundLabel}` : roundLabel;
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
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<Match | null>(null);
  const [topGoalScorers, setTopGoalScorers] = useState<any[]>([]);
  const [mvpRanking, setMvpRanking] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

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
            ),
            field:fields!matches_field_id_fkey (
              id,
              name,
              facility_id,
              facilities:facility_id (
                id,
                name
              )
            )
          `)
          .eq("event_id", id)
          .order("match_number", { ascending: true });

        if (matchesError) throw matchesError;
        setMatches(matchesData || []);

        // Load top goal scorers
        const { data: goalsData } = await supabase
          .from('match_goals')
          .select('player_id, team_id, player:participants(name, number), team:teams(name, logo_url)')
          .in('match_id', (matchesData || []).map((m: any) => m.id));

        if (goalsData && goalsData.length > 0) {
          const scorerMap = new Map<string, { name: string; team: string; teamLogo: string | null; goals: number }>();
          goalsData.forEach((g: any) => {
            const key = g.player_id || 'unknown';
            const existing = scorerMap.get(key);
            if (existing) {
              existing.goals++;
            } else {
              scorerMap.set(key, {
                name: g.player?.name || 'Desconocido',
                team: g.team?.name || '',
                teamLogo: g.team?.logo_url || null,
                goals: 1
              });
            }
          });
          setTopGoalScorers(Array.from(scorerMap.values()).sort((a, b) => b.goals - a.goals));
        }

        // Load MVP ranking
        const { data: mvpsData } = await supabase
          .from('match_mvps')
          .select('player_id, player:participants(name, number, team_id)')
          .in('match_id', (matchesData || []).map((m: any) => m.id));

        if (mvpsData && mvpsData.length > 0) {
          // Get team info for MVPs
          const playerTeamIds = new Set<string>();
          mvpsData.forEach((m: any) => { if (m.player?.team_id) playerTeamIds.add(m.player.team_id); });
          const { data: mvpTeams } = await supabase.from('teams').select('id, name, logo_url').in('id', Array.from(playerTeamIds));
          const teamMap = new Map((mvpTeams || []).map((t: any) => [t.id, t]));
          
          const mvpMap = new Map<string, { name: string; team: string; teamLogo: string | null; count: number }>();
          mvpsData.forEach((m: any) => {
            const key = m.player_id;
            const team = teamMap.get(m.player?.team_id);
            const existing = mvpMap.get(key);
            if (existing) {
              existing.count++;
            } else {
              mvpMap.set(key, {
                name: m.player?.name || 'Desconocido',
                team: team?.name || '',
                teamLogo: team?.logo_url || null,
                count: 1
              });
            }
          });
          setMvpRanking(Array.from(mvpMap.values()).filter(m => m.count >= 1).sort((a, b) => b.count - a.count));
        }

        // Check admin role
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
          setIsAdmin(!!roleData);
        }
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

    // 1. Points in head-to-head
    if (teamAPoints !== teamBPoints) return teamBPoints - teamAPoints;
    // 2. Goal difference in head-to-head
    const teamAGD = teamAGoals - teamBGoals;
    const teamBGD = teamBGoals - teamAGoals;
    if (teamAGD !== teamBGD) return teamBGD - teamAGD;
    // 3. Goals scored in head-to-head
    if (teamAGoals !== teamBGoals) return teamBGoals - teamAGoals;
    return 0;
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

    // Sort each group by FIFA-style within-group criteria:
    // 1. Points, 2. Head-to-head, 3. Goal difference, 4. Goals for
    Object.keys(grouped).forEach(groupName => {
      grouped[groupName].sort((a, b) => {
        // 1. Points
        if (b.points !== a.points) return b.points - a.points;
        // 2. Head-to-head result (h2h points → h2h GD → h2h GF)
        const h2h = getHeadToHeadResult(a.team_id, b.team_id, groupMatches);
        if (h2h !== 0) return h2h;
        // 3. Goal difference
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        // 4. Goals for
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
        // 5. Number of wins
        if (b.wins !== a.wins) return b.wins - a.wins;
        return 0;
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


  return (
    <div className="min-h-screen py-12 sm:py-20">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Back Button */}
        <Link to="/torneos">
          <Button variant="ghost" size="sm" className="mb-4 sm:mb-6 h-9">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm">Volver a Torneos</span>
          </Button>
        </Link>

        {/* Tournament Winner Banner */}
        {tournamentWinner && (
          <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 border-yellow-500/50 animate-fade-in">
            <CardContent className="py-4 sm:py-6 px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Crown className="h-7 w-7 sm:h-10 sm:w-10 text-yellow-500 flex-shrink-0" />
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground">Campeón del Torneo</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-1 justify-center sm:justify-start">
                    {tournamentWinner.logo_url && (
                      <img
                        src={tournamentWinner.logo_url}
                        alt={tournamentWinner.name}
                        className="h-9 w-9 sm:h-12 sm:w-12 object-contain"
                      />
                    )}
                    <h2 className="text-lg sm:text-2xl font-bold text-foreground">{tournamentWinner.name}</h2>
                  </div>
                </div>
                <Crown className="hidden sm:block h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 animate-fade-in">
          {event.poster_url && (
            <div className="mb-4 sm:mb-6 rounded-lg overflow-hidden max-w-3xl mx-auto">
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
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
              {event.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span>
                  {format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span className="text-center">{event.location}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-sm sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bracket" className="w-full">
          <TabsList className="grid w-full grid-cols-5 gap-0.5 sm:gap-1 h-auto p-1 mb-6 sm:mb-8">
            <TabsTrigger value="bracket" className="flex-col sm:flex-row text-[10px] sm:text-sm py-2 px-1 sm:px-4 gap-0.5 sm:gap-0 min-h-[48px]">
              <Trophy className="h-4 w-4 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Cuadro</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex-col sm:flex-row text-[10px] sm:text-sm py-2 px-1 sm:px-4 gap-0.5 sm:gap-0 min-h-[48px]">
              <Users className="h-4 w-4 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Equipos</span>
            </TabsTrigger>
            <TabsTrigger value="standings" className="flex-col sm:flex-row text-[10px] sm:text-sm py-2 px-1 sm:px-4 gap-0.5 sm:gap-0 min-h-[48px]">
              <Target className="h-4 w-4 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Clasif.</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-col sm:flex-row text-[10px] sm:text-sm py-2 px-1 sm:px-4 gap-0.5 sm:gap-0 min-h-[48px]">
              <Medal className="h-4 w-4 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-col sm:flex-row text-[10px] sm:text-sm py-2 px-1 sm:px-4 gap-0.5 sm:gap-0 min-h-[48px]">
              <ImageIcon className="h-4 w-4 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Galería</span>
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
                          <Select value={selectedPhase} onValueChange={(v) => { setSelectedPhase(v); setSelectedJornada("all"); }}>
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder="Seleccionar fase" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">Todas las fases</SelectItem>
                              {(() => {
                                const existingPhases = new Set(matches.map(m => m.phase));
                                const hasGroups = matches.some(m => isGroupStagePhase(m.phase));
                                const hasGold = matches.some(m => m.phase?.startsWith('gold_'));
                                const hasSilver = matches.some(m => m.phase?.startsWith('silver_'));
                                const hasBronze = matches.some(m => m.phase?.startsWith('bronze_'));
                                return (
                                  <>
                                    {hasGroups && <SelectItem value="Fase de Grupos">Fase de Grupos</SelectItem>}
                                    {hasGold && <SelectItem value="Fase Oro">Fase Oro</SelectItem>}
                                    {hasSilver && <SelectItem value="Fase Plata">Fase Plata</SelectItem>}
                                    {hasBronze && <SelectItem value="Fase Bronce">Fase Bronce</SelectItem>}
                                  </>
                                );
                              })()}
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
                              ) : (selectedPhase === "Fase Oro" || selectedPhase === "Fase Plata" || selectedPhase === "Fase Bronce") ? (
                                // Only show rounds that actually exist in this tournament for the selected phase
                                (() => {
                                  const prefix = selectedPhase === "Fase Oro" ? "gold_" : selectedPhase === "Fase Plata" ? "silver_" : "bronze_";
                                  const roundMap: { key: string; label: string; phases: string[] }[] = [
                                    { key: '1/16 de final', label: '1/16 de Final', phases: [`${prefix}round_of_16`, 'round_of_16'] },
                                    { key: '1/8 de final', label: '1/8 de Final', phases: [`${prefix}round_of_8`, 'round_of_8'] },
                                    { key: '1/4 de final', label: '1/4 de Final', phases: [`${prefix}quarter_final`, 'quarter_final'] },
                                    { key: 'Semifinal', label: 'Semifinales', phases: [`${prefix}semi_final`, 'semi_final'] },
                                    { key: 'Final', label: 'Final', phases: [`${prefix}final`, `${prefix}third_place`, 'final', 'third_place'] },
                                  ];
                                  const existingPhases = new Set(matches.map(m => m.phase));
                                  return roundMap
                                    .filter(r => r.phases.some(p => existingPhases.has(p)))
                                    .map(r => (
                                      <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                                    ));
                                })()
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
                              const isGold = match.phase?.startsWith("gold_");
                              const isSilver = match.phase?.startsWith("silver_");
                              const isBronze = match.phase?.startsWith("bronze_");
                              
                              let phaseMatch = selectedPhase === "all";
                              if (!phaseMatch) {
                                if (selectedPhase === "Fase de Grupos") phaseMatch = isGroupPhase;
                                else if (selectedPhase === "Fase Oro") phaseMatch = isGold;
                                else if (selectedPhase === "Fase Plata") phaseMatch = isSilver;
                                else if (selectedPhase === "Fase Bronce") phaseMatch = isBronze;
                                else phaseMatch = match.phase === selectedPhase;
                              }
                              
                              // Group filter
                              const groupMatch = selectedBracketGroup === "all" || 
                                (isGroupPhase ? match.group_name === selectedBracketGroup : true);
                              
                              // Jornada/Round filter
                              let jornadaMatch = true;
                              if (selectedJornada !== "all") {
                                if (isGroupPhase) {
                                  jornadaMatch = match.phase === `Jornada ${selectedJornada}`;
                                } else {
                                  // Map round filter to DB phase
                                  const roundMap: Record<string, string[]> = {
                                    '1/16 de final': ['round_of_16', 'gold_round_of_16', 'silver_round_of_16', 'bronze_round_of_16'],
                                    '1/8 de final': ['round_of_8', 'gold_round_of_8', 'silver_round_of_8', 'bronze_round_of_8'],
                                    '1/4 de final': ['quarter_final', 'gold_quarter_final', 'silver_quarter_final', 'bronze_quarter_final'],
                                    'Semifinal': ['semi_final', 'gold_semi_final', 'silver_semi_final', 'bronze_semi_final'],
                                    'Final': ['final', 'gold_final', 'silver_final', 'bronze_final', 'third_place', 'gold_third_place', 'silver_third_place', 'bronze_third_place'],
                                  };
                                  const matchingPhases = roundMap[selectedJornada] || [];
                                  jornadaMatch = matchingPhases.includes(match.phase);
                                }
                              }
                              
                              return phaseMatch && groupMatch && jornadaMatch;
                            })
                            .sort((a, b) => {
                              // Sort by phase order first (groups → gold knockout → silver → bronze)
                              const phaseOrderA = getPhaseOrderIndex(a.phase);
                              const phaseOrderB = getPhaseOrderIndex(b.phase);
                              if (phaseOrderA !== phaseOrderB) return phaseOrderA - phaseOrderB;
                              // Within same phase, sort by group_name
                              if (a.group_name && b.group_name && a.group_name !== b.group_name) {
                                return a.group_name.localeCompare(b.group_name);
                              }
                              // Then by match date
                              if (a.match_date && b.match_date && a.match_date !== b.match_date) {
                                return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
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

                          // Group matches by phase+group for display
                          const matchesBySectionKey: { key: string; label: string; matches: Match[] }[] = [];
                          const sectionMap = new Map<string, Match[]>();

                          filteredMatches.forEach(match => {
                            let sectionKey: string;
                            if (isGroupStagePhase(match.phase)) {
                              sectionKey = `group_${match.group_name || 'General'}`;
                            } else {
                              sectionKey = `phase_${match.phase}_${match.group_name || 'none'}`;
                            }
                            if (!sectionMap.has(sectionKey)) sectionMap.set(sectionKey, []);
                            sectionMap.get(sectionKey)!.push(match);
                          });

                          // Build sorted section list
                          const sectionEntries = Array.from(sectionMap.entries()).map(([key, sectionMatches]) => {
                            const firstMatch = sectionMatches[0];
                            let label: string;
                            if (key.startsWith('group_')) {
                              label = `Grupo ${key.replace('group_', '')}`;
                            } else {
                              const phaseLabel = getPhaseDisplayLabel(firstMatch.phase);
                              label = firstMatch.group_name ? `${phaseLabel} - ${firstMatch.group_name}` : phaseLabel;
                            }
                            return { key, label, matches: sectionMatches, orderIndex: getPhaseOrderIndex(firstMatch.phase), groupName: firstMatch.group_name || '' };
                          });

                          sectionEntries.sort((a, b) => {
                            if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
                            return a.groupName.localeCompare(b.groupName);
                          });

                          return sectionEntries.map(({ key, label, matches: sectionMatches }) => (
                            <div key={key} className="space-y-3">
                              <div className="flex items-center gap-2 border-l-4 border-primary pl-3 py-1 bg-muted/30 rounded-r">
                                <h4 className="font-bold text-base">{label}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {sectionMatches.length} partidos
                                </Badge>
                              </div>
                              <div className="space-y-2 pl-4">
                                {sectionMatches.map((match) => (
                                  <ResultRow key={match.id} match={match} onClick={() => setSelectedMatchDetail(match)} />
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
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    CLASIFICACIÓN
                  </CardTitle>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                      <SelectTrigger className="w-full sm:w-[180px] bg-background">
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
                <CardContent className="space-y-6 px-2 sm:px-6">
                  {Object.entries(groupedCalculatedStandings)
                    .filter(([groupName]) => selectedGroup === "all" || groupName === selectedGroup)
                    .map(([groupName, teams]) => (
                      <div key={groupName} className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-primary pl-3">
                          <h3 className="text-lg font-bold">GRUPO {groupName}</h3>
                        </div>
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-8 px-1 sm:px-4 text-center">#</TableHead>
                                <TableHead className="font-bold px-2 sm:px-4">EQUIPO</TableHead>
                                <TableHead className="text-center font-bold px-1 sm:px-4">PTS</TableHead>
                                <TableHead className="text-center px-1 sm:px-4">PJ</TableHead>
                                <TableHead className="text-center px-1 sm:px-4">G</TableHead>
                                <TableHead className="text-center px-1 sm:px-4 hidden sm:table-cell">E</TableHead>
                                <TableHead className="text-center px-1 sm:px-4">P</TableHead>
                                <TableHead className="text-center px-1 sm:px-4 hidden md:table-cell">GF</TableHead>
                                <TableHead className="text-center px-1 sm:px-4 hidden md:table-cell">GC</TableHead>
                                <TableHead className="text-center px-1 sm:px-4 hidden sm:table-cell">DG</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teams.map((team, index) => (
                                <TableRow 
                                  key={team.team_id}
                                  className={index === 0 ? "border-l-4 border-l-primary bg-primary/5" : ""}
                                >
                                  <TableCell className="font-bold text-muted-foreground px-1 sm:px-4 text-center text-xs sm:text-sm">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 max-w-[140px] sm:max-w-none">
                                    <Link to={`/equipos/${team.team_id}`} className="flex items-center gap-2 hover:text-primary transition-colors min-w-0">
                                      {team.teams.logo_url && (
                                        <img
                                          src={team.teams.logo_url}
                                          alt={team.teams.name}
                                          className="h-5 w-5 sm:h-6 sm:w-6 object-contain shrink-0"
                                        />
                                      )}
                                      <span className="font-medium text-xs sm:text-sm truncate">{team.teams.name}</span>
                                    </Link>
                                  </TableCell>
                                  <TableCell className="text-center font-bold px-1 sm:px-4">{team.points}</TableCell>
                                  <TableCell className="text-center px-1 sm:px-4">{team.matches_played}</TableCell>
                                  <TableCell className="text-center px-1 sm:px-4">{team.wins}</TableCell>
                                  <TableCell className="text-center text-muted-foreground px-1 sm:px-4 hidden sm:table-cell">{team.draws}</TableCell>
                                  <TableCell className="text-center text-destructive px-1 sm:px-4">{team.losses}</TableCell>
                                  <TableCell className="text-center text-primary px-1 sm:px-4 hidden md:table-cell">{team.goals_for}</TableCell>
                                  <TableCell className="text-center text-destructive px-1 sm:px-4 hidden md:table-cell">{team.goals_against}</TableCell>
                                  <TableCell className={`text-center font-medium px-1 sm:px-4 hidden sm:table-cell ${team.goal_difference > 0 ? 'text-green-600' : team.goal_difference < 0 ? 'text-red-600' : ''}`}>
                                    {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <p className="text-[10px] text-muted-foreground sm:hidden px-2">
                          Vista reducida. Gira el dispositivo para ver E, GF, GC y DG.
                        </p>
                      </div>
                    ))}
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
                  {(() => {
                    const teamGoals = calculatedStandings
                      .map(team => ({
                        team: team.teams.name,
                        logo: team.teams.logo_url,
                        goals: team.goals_for
                      }))
                      .sort((a, b) => b.goals - a.goals)
                      .slice(0, 10);
                    return teamGoals.length > 0 ? (
                      <div className="space-y-3">
                        {teamGoals.map((scorer, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-primary">{index + 1}</span>
                              {scorer.logo && (
                                <img src={scorer.logo} alt={scorer.team} className="h-6 w-6 object-contain" />
                              )}
                              <span className="font-medium">{scorer.team}</span>
                            </div>
                            <Badge variant="secondary">
                              {scorer.goals} goles
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Sin datos disponibles</p>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Top Goal Scorers (Players) */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Goal className="h-5 w-5 text-primary" />
                    Máximos goleadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topGoalScorers.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {topGoalScorers.slice(0, 20).map((scorer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-primary">{index + 1}</span>
                            {scorer.teamLogo && (
                              <img src={scorer.teamLogo} alt={scorer.team} className="h-6 w-6 object-contain" />
                            )}
                            <div>
                              <span className="font-medium">{scorer.name}</span>
                              <p className="text-xs text-muted-foreground">{scorer.team}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {scorer.goals} {scorer.goals === 1 ? 'gol' : 'goles'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Sin datos disponibles</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* MVP Ranking */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Ranking de MVP's
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mvpRanking.length > 0 ? (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {mvpRanking.map((mvp, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-primary">{index + 1}</span>
                          {mvp.teamLogo && (
                            <img src={mvp.teamLogo} alt={mvp.team} className="h-6 w-6 object-contain" />
                          )}
                          <div>
                            <span className="font-medium">{mvp.name}</span>
                            <p className="text-xs text-muted-foreground">{mvp.team}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500">
                          {mvp.count} MVP{mvp.count > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Sin datos de MVP disponibles</p>
                )}
              </CardContent>
            </Card>

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

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="space-y-6">
            {isAdmin && (
              <Card className="animate-fade-in">
                <CardContent className="pt-6">
                  <TournamentGalleryManager eventId={id!} />
                </CardContent>
              </Card>
            )}
            <TournamentGalleryDisplay eventId={id!} />
          </TabsContent>
        </Tabs>


        {/* Match Detail Dialog */}
        <MatchDetailDialog 
          match={selectedMatchDetail} 
          onClose={() => setSelectedMatchDetail(null)} 
        />
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

// Result Row Component - Mobile-first: collapsed card on mobile (tap to expand),
// horizontal row on md+. Expanded view shows phase/date/venue + button to open match sheet.
function ResultRow({ match, onClick }: { match: Match; onClick?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompleted = isCompletedStatus(match.status);
  const hasHomeWon = isCompleted && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score;
  const hasAwayWon = isCompleted && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;
  const homeName = getMatchSideName(match, 'home');
  const awayName = getMatchSideName(match, 'away');
  const homeLogo = getMatchSideLogo(match, 'home');
  const awayLogo = getMatchSideLogo(match, 'away');
  const homeIsPlaceholder = isPlaceholder(match, 'home');
  const awayIsPlaceholder = isPlaceholder(match, 'away');

  const phaseLabel = getPhaseDisplayLabel(match.phase);
  const facilityName = match.field?.facilities?.name || '';
  const fieldName = match.field?.name || '';
  const matchDate = match.match_date ? new Date(match.match_date) : null;

  const ScoreDisplay = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeCls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';
    if (isCompleted) {
      return (
        <span className={`${sizeCls} font-bold whitespace-nowrap`}>
          <span className={hasHomeWon ? 'text-primary' : ''}>{match.home_score}</span>
          <span className="mx-1.5 text-muted-foreground">-</span>
          <span className={hasAwayWon ? 'text-primary' : ''}>{match.away_score}</span>
        </span>
      );
    }
    return <span className={`${sizeCls} font-bold text-muted-foreground whitespace-nowrap`}>vs</span>;
  };

  return (
    <div className="border-b last:border-b-0 rounded transition-colors hover:bg-accent/30">
      {/* ===== MOBILE LAYOUT (< md): collapsed card with expand toggle ===== */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="w-full flex items-center gap-2 py-3 px-2 text-left"
          aria-expanded={isExpanded}
        >
          {/* Home */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {homeLogo ? (
              <img src={homeLogo} alt={homeName} className="h-9 w-9 object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted" />
            )}
            <span
              className={`text-[11px] leading-tight text-center line-clamp-2 break-words ${hasHomeWon ? 'font-bold text-primary' : ''} ${homeIsPlaceholder ? 'italic text-muted-foreground' : ''}`}
            >
              {homeName}
            </span>
          </div>

          {/* Score + time */}
          <div className="flex flex-col items-center justify-center px-1 shrink-0">
            <ScoreDisplay size="md" />
            {matchDate && (
              <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                {format(matchDate, "HH:mm", { locale: es })}
              </span>
            )}
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {awayLogo ? (
              <img src={awayLogo} alt={awayName} className="h-9 w-9 object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted" />
            )}
            <span
              className={`text-[11px] leading-tight text-center line-clamp-2 break-words ${hasAwayWon ? 'font-bold text-primary' : ''} ${awayIsPlaceholder ? 'italic text-muted-foreground' : ''}`}
            >
              {awayName}
            </span>
          </div>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 space-y-2 text-xs animate-fade-in">
            {phaseLabel && (
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-primary font-medium">{phaseLabel}</span>
              </div>
            )}
            {matchDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{format(matchDate, "dd MMM yyyy", { locale: es })}</span>
                <Clock className="h-3.5 w-3.5 ml-2 shrink-0" />
                <span>{format(matchDate, "HH:mm", { locale: es })}</span>
              </div>
            )}
            {(facilityName || fieldName) && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="break-words">
                  {facilityName}{facilityName && fieldName ? ' · ' : ''}{fieldName}
                </span>
              </div>
            )}
            {onClick && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2 min-h-[40px]"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Ficha del partido
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ===== DESKTOP LAYOUT (md+): original horizontal row ===== */}
      <div
        className={`hidden md:flex items-center justify-between py-3 px-2 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        {/* Home Team */}
        <div className={`flex items-center gap-3 flex-1 justify-start min-w-0 ${hasHomeWon ? 'font-bold' : ''}`}>
          {homeLogo && (
            <img src={homeLogo} alt={homeName} className="h-8 w-8 object-contain shrink-0" />
          )}
          <span className={`text-sm truncate ${hasHomeWon ? 'text-primary' : ''} ${homeIsPlaceholder ? 'italic text-muted-foreground' : ''}`}>{homeName}</span>
        </div>

        {/* Score, Phase and Date */}
        <div className="flex flex-col items-center px-4 min-w-[220px] shrink-0">
          {isCompleted ? (
            <span className="text-xl font-bold">
              <span className={hasHomeWon ? 'text-primary' : ''}>{match.home_score}</span>
              <span className="mx-2 text-muted-foreground">-</span>
              <span className={hasAwayWon ? 'text-primary' : ''}>{match.away_score}</span>
            </span>
          ) : (
            <span className="text-xl font-bold text-muted-foreground">- vs -</span>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            {phaseLabel && (
              <span className="text-xs text-primary font-medium">{phaseLabel}</span>
            )}
            {matchDate && (
              <span className="text-xs text-muted-foreground">
                {format(matchDate, "dd.MM.yyyy HH:mm", { locale: es })}
              </span>
            )}
            {(facilityName || fieldName) && (
              <span className="text-xs text-muted-foreground">
                📍 {facilityName}{facilityName && fieldName ? ' - ' : ''}{fieldName}
              </span>
            )}
          </div>
        </div>

        {/* Away Team */}
        <div className={`flex items-center gap-3 flex-1 justify-end min-w-0 ${hasAwayWon ? 'font-bold' : ''}`}>
          <span className={`text-sm truncate ${hasAwayWon ? 'text-primary' : ''} ${awayIsPlaceholder ? 'italic text-muted-foreground' : ''}`}>{awayName}</span>
          {awayLogo && (
            <img src={awayLogo} alt={awayName} className="h-8 w-8 object-contain shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

// Phase display label helper (using the one defined at module level)

// Match Detail Dialog
function MatchDetailDialog({ match, onClose }: { match: Match | null; onClose: () => void }) {
  const [goals, setGoals] = useState<any[]>([]);
  const [mvp, setMvp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match?.id) { setGoals([]); setMvp(null); return; }
    setLoading(true);
    Promise.all([
      supabase.from('match_goals').select('*, player:participants(name, number)').eq('match_id', match.id).order('minute'),
      supabase.from('match_mvps').select('*, player:participants(name, number, photo_url)').eq('match_id', match.id).maybeSingle(),
    ]).then(([goalsRes, mvpRes]) => {
      setGoals(goalsRes.data || []);
      setMvp(mvpRes.data || null);
    }).finally(() => setLoading(false));
  }, [match?.id]);

  if (!match) return null;

  const isCompleted = isCompletedStatus(match.status);
  const homeName = getMatchSideName(match, 'home');
  const awayName = getMatchSideName(match, 'away');
  const homeLogo = getMatchSideLogo(match, 'home');
  const awayLogo = getMatchSideLogo(match, 'away');
  const homeGoals = goals.filter(g => g.team_id === match.home_team?.id);
  const awayGoals = goals.filter(g => g.team_id === match.away_team?.id);
  const phaseLabel = getPhaseDisplayLabel(match.phase);

  return (
    <Dialog open={!!match} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            <span className="text-sm text-muted-foreground">{phaseLabel}</span>
            {match.group_name && match.phase === 'group' && <span className="text-sm text-muted-foreground"> · Grupo {match.group_name}</span>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><span className="text-muted-foreground">Cargando...</span></div>
        ) : (
          <div className="space-y-4">
            {/* Score header */}
            <div className="grid grid-cols-3 items-center text-center">
              <div className="flex flex-col items-center">
                {homeLogo && <img src={homeLogo} alt={homeName} className="h-12 w-12 object-contain mb-1" />}
                <span className="font-bold text-sm">{homeName}</span>
              </div>
              <div>
                {isCompleted ? (
                  <span className="text-3xl font-bold">{match.home_score} - {match.away_score}</span>
                ) : (
                  <span className="text-xl text-muted-foreground">vs</span>
                )}
                {match.match_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(match.match_date), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                )}
                {match.field && (
                  <p className="text-xs text-muted-foreground">
                    📍 {match.field.facilities?.name ? `${match.field.facilities.name} - ` : ''}{match.field.name}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center">
                {awayLogo && <img src={awayLogo} alt={awayName} className="h-12 w-12 object-contain mb-1" />}
                <span className="font-bold text-sm">{awayName}</span>
              </div>
            </div>

            {/* Goal scorers */}
            {goals.length > 0 && (
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Goal className="w-4 h-4" /> Goleadores</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    {homeGoals.map((g: any) => (
                      <div key={g.id} className="text-sm">
                        ⚽ {g.player?.name || 'Desconocido'}
                        {g.minute != null && <span className="text-muted-foreground ml-1">({g.minute}')</span>}
                      </div>
                    ))}
                    {homeGoals.length === 0 && <p className="text-xs text-muted-foreground">-</p>}
                  </div>
                  <div className="space-y-1">
                    {awayGoals.map((g: any) => (
                      <div key={g.id} className="text-sm">
                        ⚽ {g.player?.name || 'Desconocido'}
                        {g.minute != null && <span className="text-muted-foreground ml-1">({g.minute}')</span>}
                      </div>
                    ))}
                    {awayGoals.length === 0 && <p className="text-xs text-muted-foreground">-</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Cards */}
            {isCompleted && (match.home_yellow_cards > 0 || match.home_red_cards > 0 || match.away_yellow_cards > 0 || match.away_red_cards > 0) && (
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">Tarjetas</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex gap-3">
                    <span>🟨 {match.home_yellow_cards}</span>
                    <span>🟥 {match.home_red_cards}</span>
                  </div>
                  <div className="flex gap-3">
                    <span>🟨 {match.away_yellow_cards}</span>
                    <span>🟥 {match.away_red_cards}</span>
                  </div>
                </div>
              </div>
            )}

            {/* MVP */}
            {mvp && (
              <div className="border rounded-lg p-3 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /> MVP del Partido</h4>
                <div className="flex items-center gap-3">
                  {mvp.photo_url && (
                    <img src={mvp.photo_url} alt="MVP" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="font-bold">{mvp.player?.name}</p>
                    {mvp.player?.number && <p className="text-sm text-muted-foreground">Dorsal #{mvp.player.number}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Match Card Component (kept for other uses)
function MatchCard({ match, isFinal = false }: { match: Match; isFinal?: boolean }) {
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
    <div
      className={`flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors ${isFinal ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}
    >
      <div className="flex-1">
        {/* Home Team */}
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-3 flex-1 ${hasHomeWon ? 'font-bold' : ''}`}>
            {homeLogo && (
              <img src={homeLogo} alt={homeName} className="h-8 w-8 object-contain" />
            )}
            <span className={`${hasHomeWon ? 'text-primary' : ''} ${homeIsPlaceholder ? 'italic text-muted-foreground' : ''}`}>{homeName}</span>
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
            {awayLogo && (
              <img src={awayLogo} alt={awayName} className="h-8 w-8 object-contain" />
            )}
            <span className={`${hasAwayWon ? 'text-primary' : ''} ${awayIsPlaceholder ? 'italic text-muted-foreground' : ''}`}>{awayName}</span>
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
