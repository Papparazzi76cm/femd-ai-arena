import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Trophy, Users, BarChart3, Radio, Bell, BellOff, Goal, MapPin, Clock, Calendar } from 'lucide-react';
import { Match } from '@/types/tournament';
import { MatchTimer } from '@/components/referee/MatchTimer';
import { Team, Participant } from '@/types/database';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import { useGoalSound } from '@/hooks/useGoalSound';

interface EventTeam {
  id: string;
  event_id: string;
  team_id: string;
  group_name: string | null;
  points: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  yellow_cards: number;
  red_cards: number;
}

interface MatchGoal {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string | null;
  minute: number | null;
  is_own_goal: boolean;
}

interface TopScorer {
  player: Participant;
  team: Team | null;
  goals: number;
}

export const LiveTournamentPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [isLiveEvent, setIsLiveEvent] = useState(false);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [liveTeamIds, setLiveTeamIds] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);

  const { requestPermission, notifyMatchStarted, notifyMatchEnded, notifyGoal } = useMatchNotifications();
  const { playGoalSound } = useGoalSound();

  // Track previous match states for notifications
  const prevMatchesRef = useRef<Map<string, { status: string; homeScore: number; awayScore: number }>>(new Map());
  const teamsRef = useRef<Team[]>([]);

  const getTeamNameById = useCallback((teamId: string) => {
    return teamsRef.current.find(t => t.id === teamId)?.name || 'Equipo';
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    setNotificationsEnabled(granted);
  };

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription for matches
    const matchChannel = supabase
      .channel('live-matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          handleMatchChange(payload);
          loadData();
        }
      )
      .subscribe();

    // Set up real-time subscription for event_teams
    const teamsChannel = supabase
      .channel('live-standings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_teams' },
        () => {
          loadData();
        }
      )
      .subscribe();

    // Set up real-time subscription for goals
    const goalsChannel = supabase
      .channel('live-goals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_goals' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(goalsChannel);
    };
  }, []);

  const handleMatchChange = (payload: any) => {
    if (!notificationsEnabled) return;

    const newMatch = payload.new as Match;
    if (!newMatch) return;

    const prevState = prevMatchesRef.current.get(newMatch.id);
    const homeTeam = getTeamNameById(newMatch.home_team_id);
    const awayTeam = getTeamNameById(newMatch.away_team_id);

    if (prevState) {
      // Check for status changes
      if (prevState.status !== newMatch.status) {
        if (newMatch.status === 'in_progress') {
          notifyMatchStarted(homeTeam, awayTeam);
        } else if (newMatch.status === 'finished') {
          notifyMatchEnded(homeTeam, awayTeam, newMatch.home_score ?? 0, newMatch.away_score ?? 0);
        }
      }

      // Check for goals (only in live matches)
      if (newMatch.status === 'in_progress') {
        const newHomeScore = newMatch.home_score ?? 0;
        const newAwayScore = newMatch.away_score ?? 0;

        if (newHomeScore > prevState.homeScore) {
          playGoalSound();
          notifyGoal(homeTeam, newHomeScore, newAwayScore);
        }
        if (newAwayScore > prevState.awayScore) {
          playGoalSound();
          notifyGoal(awayTeam, newHomeScore, newAwayScore);
        }
      }
    }

    // Update tracked state
    prevMatchesRef.current.set(newMatch.id, {
      status: newMatch.status,
      homeScore: newMatch.home_score ?? 0,
      awayScore: newMatch.away_score ?? 0,
    });
  };

  const loadData = async () => {
    try {
      // Find active event (most recent event with in_progress matches or upcoming)
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (!events || events.length === 0) {
        setLoading(false);
        return;
      }

      // 1) Check if any event has in_progress matches → that's the live event
      const { data: liveMatchesCheck } = await supabase
        .from('matches')
        .select('event_id')
        .eq('status', 'in_progress')
        .limit(1);

      let selectedEvent: any = null;
      let isLive = false;

      if (liveMatchesCheck && liveMatchesCheck.length > 0) {
        // There's a live event
        selectedEvent = events.find(e => e.id === liveMatchesCheck[0].event_id) || null;
        isLive = true;
      }

      if (!selectedEvent) {
        // 2) No live event → find the next upcoming event (date >= now)
        const now = new Date().toISOString();
        const upcoming = events
          .filter(e => e.date >= now)
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (upcoming.length > 0) {
          selectedEvent = upcoming[0];
        }
        isLive = false;
      }

      if (!selectedEvent) {
        // No live and no upcoming events
        setActiveEvent(null);
        setIsLiveEvent(false);
        setLoading(false);
        return;
      }

      setActiveEvent(selectedEvent);
      setIsLiveEvent(isLive);
      const activeEventId = selectedEvent.id;

      // Load matches for the active event
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('event_id', activeEventId)
        .order('match_date', { ascending: true });

      const typedMatches = (matchesData || []) as Match[];
      setAllMatches(typedMatches);
      
      const live = typedMatches.filter(m => m.status === 'in_progress');
      setLiveMatches(live);

      // Get IDs of teams currently playing
      const playingTeamIds = new Set<string>();
      live.forEach(m => {
        playingTeamIds.add(m.home_team_id);
        playingTeamIds.add(m.away_team_id);
      });
      setLiveTeamIds(playingTeamIds);

      // Load teams
      const { data: teamsData } = await supabase.from('teams').select('*');
      const loadedTeams = (teamsData || []) as Team[];
      setTeams(loadedTeams);
      teamsRef.current = loadedTeams;

      // Initialize match tracking for notifications
      typedMatches.forEach(m => {
        if (!prevMatchesRef.current.has(m.id)) {
          prevMatchesRef.current.set(m.id, {
            status: m.status,
            homeScore: m.home_score ?? 0,
            awayScore: m.away_score ?? 0,
          });
        }
      });

      // Load event teams for standings
      const { data: eventTeamsData } = await supabase
        .from('event_teams')
        .select('*')
        .eq('event_id', activeEventId)
        .order('group_name')
        .order('points', { ascending: false });

      setEventTeams((eventTeamsData || []) as EventTeam[]);

      // Load goals for top scorers
      const matchIds = typedMatches.map(m => m.id);
      if (matchIds.length > 0) {
        const { data: goalsData } = await supabase
          .from('match_goals')
          .select('*')
          .in('match_id', matchIds);

        if (goalsData && goalsData.length > 0) {
          // Count goals per player
          const goalCounts = new Map<string, number>();
          (goalsData as MatchGoal[]).forEach(goal => {
            if (goal.player_id) {
              goalCounts.set(goal.player_id, (goalCounts.get(goal.player_id) || 0) + 1);
            }
          });

          // Get unique player IDs
          const playerIds = Array.from(goalCounts.keys());
          
          if (playerIds.length > 0) {
            const { data: playersData } = await supabase
              .from('participants')
              .select('*')
              .in('id', playerIds);

            if (playersData) {
              const scorers: TopScorer[] = (playersData as Participant[]).map(player => ({
                player,
                team: loadedTeams.find(t => t.id === player.team_id) || null,
                goals: goalCounts.get(player.id) || 0,
              }));

              // Sort by goals descending
              scorers.sort((a, b) => b.goals - a.goals);
              setTopScorers(scorers);
            }
          }
        } else {
          setTopScorers([]);
        }
      }
    } catch (error) {
      console.error('Error loading live data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Equipo';
  };

  const getTeamLogo = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.logo_url;
  };

  // Group event teams by group_name
  const groupedStandings = eventTeams.reduce((acc, et) => {
    const group = et.group_name || 'Sin Grupo';
    if (!acc[group]) acc[group] = [];
    acc[group].push(et);
    return acc;
  }, {} as Record<string, EventTeam[]>);

  // Calculate stats
  const totalGoals = allMatches.reduce((sum, m) => sum + (m.home_score || 0) + (m.away_score || 0), 0);
  const finishedMatches = allMatches.filter(m => m.status === 'finished').length;
  const totalYellowCards = eventTeams.reduce((sum, et) => sum + (et.yellow_cards || 0), 0);
  const totalRedCards = eventTeams.reduce((sum, et) => sum + (et.red_cards || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando torneo en vivo...</p>
        </div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Card className="p-12 text-center max-w-md">
          <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No hay torneos activos</h2>
          <p className="text-muted-foreground">
            En este momento no hay ningún torneo en curso. Vuelve más tarde.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pt-20">
      {/* Hero Header */}
      <div className={`${isLiveEvent ? 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500' : 'bg-gradient-to-r from-primary via-primary/80 to-primary/60'} text-white py-8 px-4`}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {isLiveEvent ? (
                <>
                  <div className="relative">
                    <Radio className="w-8 h-8" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse-live" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-1">
                    EN VIVO
                  </Badge>
                </>
              ) : (
                <>
                  <Calendar className="w-8 h-8" />
                  <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-1">
                    PRÓXIMO EVENTO
                  </Badge>
                </>
              )}
            </div>
            {isLiveEvent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEnableNotifications}
                className={`text-white hover:bg-white/20 ${notificationsEnabled ? 'bg-white/20' : ''}`}
              >
                {notificationsEnabled ? (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Notificaciones activas
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    Activar notificaciones
                  </>
                )}
              </Button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">{activeEvent.title}</h1>
          <p className="text-white/80 mt-2">{activeEvent.location}</p>
          {!isLiveEvent && activeEvent.date && (
            <p className="text-white/70 mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {new Date(activeEvent.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Live Matches Section */}
        {liveMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse-live" />
              Partidos en Juego
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {liveMatches.map((match) => (
                <Card key={match.id} className="p-6 border-2 border-red-500/50 bg-gradient-to-br from-red-500/5 to-orange-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-red-500 text-white animate-pulse-live">EN JUEGO</Badge>
                    <span className="text-sm text-muted-foreground">{match.group_name}</span>
                  </div>

                  {/* Real-time Timer */}
                  <MatchTimer
                    isLive={true}
                    matchDurationMinutes={match.match_duration_minutes || 40}
                    matchHalves={match.match_halves || 1}
                    startedAt={match.started_at}
                    readOnly={true}
                  />

                  <div className="grid grid-cols-3 items-center gap-4 mt-4">
                    <div className="text-center">
                      {getTeamLogo(match.home_team_id) && (
                        <img 
                          src={getTeamLogo(match.home_team_id)} 
                          alt="" 
                          className="w-16 h-16 object-contain mx-auto mb-2"
                        />
                      )}
                      <p className="font-semibold text-sm">{getTeamName(match.home_team_id)}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold">
                        <span className="text-primary">{match.home_score ?? 0}</span>
                        <span className="text-muted-foreground mx-2">-</span>
                        <span className="text-primary">{match.away_score ?? 0}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      {getTeamLogo(match.away_team_id) && (
                        <img 
                          src={getTeamLogo(match.away_team_id)} 
                          alt="" 
                          className="w-16 h-16 object-contain mx-auto mb-2"
                        />
                      )}
                      <p className="font-semibold text-sm">{getTeamName(match.away_team_id)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="standings" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Clasificación
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Resultados
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Estadísticas
            </TabsTrigger>
          </TabsList>

          {/* Standings Tab */}
          <TabsContent value="standings">
            <div className="space-y-6">
              {Object.entries(groupedStandings).map(([groupName, groupTeams]) => (
                <Card key={groupName} className="overflow-hidden">
                  <div className="bg-primary/10 px-4 py-2 border-b">
                    <h3 className="font-bold">{groupName}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3">Equipo</th>
                          <th className="text-center p-3">PJ</th>
                          <th className="text-center p-3">G</th>
                          <th className="text-center p-3">E</th>
                          <th className="text-center p-3">P</th>
                          <th className="text-center p-3">GF</th>
                          <th className="text-center p-3">GC</th>
                          <th className="text-center p-3">DG</th>
                          <th className="text-center p-3 font-bold">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupTeams.map((et, idx) => {
                          const isLive = liveTeamIds.has(et.team_id);
                          return (
                            <tr 
                              key={et.id} 
                              className={`border-b hover:bg-muted/30 ${isLive ? 'animate-heartbeat bg-red-500/10' : ''}`}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    {idx + 1}
                                  </span>
                                  {getTeamLogo(et.team_id) && (
                                    <img src={getTeamLogo(et.team_id)} alt="" className="w-6 h-6 object-contain" />
                                  )}
                                  <span className={`font-medium ${isLive ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
                                    {getTeamName(et.team_id)}
                                  </span>
                                  {isLive && (
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
                                  )}
                                </div>
                              </td>
                              <td className="text-center p-3">{et.matches_played || 0}</td>
                              <td className="text-center p-3">{et.wins || 0}</td>
                              <td className="text-center p-3">{et.draws || 0}</td>
                              <td className="text-center p-3">{et.losses || 0}</td>
                              <td className="text-center p-3">{et.goals_for || 0}</td>
                              <td className="text-center p-3">{et.goals_against || 0}</td>
                              <td className="text-center p-3">{et.goal_difference || 0}</td>
                              <td className="text-center p-3 font-bold text-primary">{et.points || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <div className="space-y-4">
              {allMatches.filter(m => m.status === 'finished' || m.status === 'in_progress').map((match) => (
                <Card key={match.id} className={`p-4 ${match.status === 'in_progress' ? 'border-2 border-red-500/50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{match.group_name || match.phase}</span>
                    {match.status === 'in_progress' ? (
                      <Badge className="bg-red-500 text-white animate-pulse-live">EN JUEGO</Badge>
                    ) : (
                      <Badge variant="outline">Finalizado</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {getTeamLogo(match.home_team_id) && (
                        <img src={getTeamLogo(match.home_team_id)} alt="" className="w-8 h-8 object-contain" />
                      )}
                      <span className={`font-medium ${liveTeamIds.has(match.home_team_id) ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {getTeamName(match.home_team_id)}
                      </span>
                    </div>
                    <div className="text-2xl font-bold px-4">
                      {match.home_score ?? 0} - {match.away_score ?? 0}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className={`font-medium ${liveTeamIds.has(match.away_team_id) ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {getTeamName(match.away_team_id)}
                      </span>
                      {getTeamLogo(match.away_team_id) && (
                        <img src={getTeamLogo(match.away_team_id)} alt="" className="w-8 h-8 object-contain" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {allMatches.filter(m => m.status === 'finished' || m.status === 'in_progress').length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Aún no hay resultados disponibles</p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Partidos Jugados</p>
                <p className="text-4xl font-bold text-primary">{finishedMatches}</p>
              </Card>
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Goles Totales</p>
                <p className="text-4xl font-bold text-primary">{totalGoals}</p>
              </Card>
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Tarjetas Amarillas</p>
                <p className="text-4xl font-bold text-yellow-500">🟨 {totalYellowCards}</p>
              </Card>
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Tarjetas Rojas</p>
                <p className="text-4xl font-bold text-red-500">🟥 {totalRedCards}</p>
              </Card>
            </div>

            {/* Top Scorers - Players */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Goal className="w-5 h-5 text-primary" />
                  Máximos Goleadores
                </h3>
                <div className="space-y-3">
                  {topScorers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aún no hay goles registrados</p>
                  ) : (
                    topScorers.slice(0, 10).map((scorer, idx) => (
                      <div key={scorer.player.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-amber-600 text-amber-100' :
                            'bg-primary/10'
                          }`}>
                            {idx + 1}
                          </span>
                          {scorer.player.photo_url && (
                            <img src={scorer.player.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          )}
                          <div>
                            <p className="font-medium">
                              {scorer.player.number && <span className="text-muted-foreground mr-1">#{scorer.player.number}</span>}
                              {scorer.player.name}
                            </p>
                            {scorer.team && (
                              <p className="text-xs text-muted-foreground">{scorer.team.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-2xl font-bold text-primary">{scorer.goals}</span>
                          <span className="text-sm text-muted-foreground">⚽</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Team Scorers */}
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Equipos Más Goleadores</h3>
                <div className="space-y-3">
                  {[...eventTeams]
                    .sort((a, b) => (b.goals_for || 0) - (a.goals_for || 0))
                    .slice(0, 5)
                    .map((et, idx) => (
                      <div key={et.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </span>
                          {getTeamLogo(et.team_id) && (
                            <img src={getTeamLogo(et.team_id)} alt="" className="w-8 h-8 object-contain" />
                          )}
                          <span className={liveTeamIds.has(et.team_id) ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                            {getTeamName(et.team_id)}
                          </span>
                        </div>
                        <span className="font-bold text-primary">{et.goals_for || 0} goles</span>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
