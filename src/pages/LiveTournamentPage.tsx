import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trophy, Users, BarChart3, Radio, Bell, BellOff, Goal, MapPin, Clock, Calendar, Building2, FileText } from 'lucide-react';
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
  category_id: string | null;
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

interface MatchCard {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string | null;
  card_type: string;
  minute: number | null;
}

interface MatchMvp {
  id: string;
  match_id: string;
  player_id: string;
  photo_url: string | null;
  player?: { name: string; number: number | null };
}

interface TopScorer {
  player: Participant;
  team: Team | null;
  goals: number;
}

interface CategoryInfo {
  id: string;
  name: string;
  age_group: string | null;
}

interface FieldInfo {
  id: string;
  name: string;
  facility_id: string;
}

interface FacilityInfo {
  id: string;
  name: string;
}

interface EventOption {
  id: string;
  title: string;
  date: string;
  end_date?: string | null;
  location: string | null;
  poster_url: string | null;
  hasLiveMatches?: boolean;
}

type MatchGoalMap = Map<string, MatchGoal[]>;
type MatchCardMap = Map<string, MatchCard[]>;
type MatchMvpMap = Map<string, MatchMvp>;
type PlayerNameMap = Map<string, { name: string; number: number | null }>;

const getPhaseLabel = (phase: string, groupName: string | null): string => {
  const labels: Record<string, string> = {
    'group': 'Fase de Grupos',
    'round_of_16': 'Dieciseisavos de Final',
    'round_of_8': 'Octavos de Final',
    'quarter_final': 'Cuartos de Final',
    'semi_final': 'Semifinales',
    'final': 'Final',
    'third_place': 'Tercer Puesto',
    'gold_round_of_16': 'Fase Oro: Dieciseisavos',
    'gold_round_of_8': 'Fase Oro: 1/8 de Final',
    'gold_quarter_final': 'Fase Oro: 1/4 de Final',
    'gold_semi_final': 'Fase Oro: Semifinales',
    'gold_third_place': 'Fase Oro: 3er Puesto',
    'gold_final': 'Fase Oro: Final',
    'silver_round_of_16': 'Fase Plata: Dieciseisavos',
    'silver_round_of_8': 'Fase Plata: 1/8 de Final',
    'silver_quarter_final': 'Fase Plata: 1/4 de Final',
    'silver_semi_final': 'Fase Plata: Semifinales',
    'silver_third_place': 'Fase Plata: 3er Puesto',
    'silver_final': 'Fase Plata: Final',
    'bronze_round_of_16': 'Fase Bronce: Dieciseisavos',
    'bronze_round_of_8': 'Fase Bronce: 1/8 de Final',
    'bronze_quarter_final': 'Fase Bronce: 1/4 de Final',
    'bronze_semi_final': 'Fase Bronce: Semifinales',
    'bronze_third_place': 'Fase Bronce: 3er Puesto',
    'bronze_final': 'Fase Bronce: Final',
  };
  const base = labels[phase] || phase;
  if (phase === 'group' && groupName) return `${base} - Grupo ${groupName}`;
  if (phase !== 'group' && groupName) return `${base} - ${groupName}`;
  return base;
};

export const LiveTournamentPage = () => {
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [allEvents, setAllEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [isLiveEvent, setIsLiveEvent] = useState(false);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [liveTeamIds, setLiveTeamIds] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [matchGoals, setMatchGoals] = useState<MatchGoalMap>(new Map());
  const [matchCards, setMatchCards] = useState<MatchCardMap>(new Map());
  const [matchMvps, setMatchMvps] = useState<MatchMvpMap>(new Map());
  const [playerNames, setPlayerNames] = useState<PlayerNameMap>(new Map());
  const [categories, setCategories] = useState<Map<string, CategoryInfo>>(new Map());
  const [fields, setFields] = useState<Map<string, FieldInfo>>(new Map());
  const [facilities, setFacilities] = useState<Map<string, FacilityInfo>>(new Map());
  const [matchDetailOpen, setMatchDetailOpen] = useState(false);
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<Match | null>(null);
  const { requestPermission, notifyMatchStarted, notifyMatchEnded, notifyGoal } = useMatchNotifications();
  const { playGoalSound } = useGoalSound();

  const prevMatchesRef = useRef<Map<string, { status: string; homeScore: number; awayScore: number }>>(new Map());
  const teamsRef = useRef<Team[]>([]);

  const getTeamNameById = useCallback((teamId: string) => {
    return teamsRef.current.find(t => t.id === teamId)?.name || 'Equipo';
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    setNotificationsEnabled(granted);
  };

  // Load all events for selector
  useEffect(() => {
    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const { data: events } = await supabase.from('events').select('*').order('date', { ascending: false });
        if (!events || events.length === 0) {
          setAllEvents([]);
          setEventsLoading(false);
          setLoading(false);
          return;
        }

        // Check which events have live matches
        const { data: liveMatchesCheck } = await supabase.from('matches').select('event_id').eq('status', 'in_progress');
        const liveEventIds = new Set((liveMatchesCheck || []).map(m => m.event_id));

        const eventOptions: EventOption[] = events.map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          end_date: (e as any).end_date,
          location: e.location,
          poster_url: e.poster_url,
          hasLiveMatches: liveEventIds.has(e.id),
        }));

        setAllEvents(eventOptions);

        // Restore selection from sessionStorage or don't auto-select
        const savedEventId = sessionStorage.getItem('liveEventSelectedId');
        if (savedEventId && eventOptions.some(e => e.id === savedEventId)) {
          setSelectedEventId(savedEventId);
        }
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setEventsLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Load event data when selection changes
  useEffect(() => {
    if (!selectedEventId) {
      setLoading(false);
      setActiveEvent(null);
      return;
    }
    sessionStorage.setItem('liveEventSelectedId', selectedEventId);
    loadEventData(selectedEventId);

    const matchChannel = supabase
      .channel('live-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => { handleMatchChange(payload); loadEventData(selectedEventId); })
      .subscribe();

    const teamsChannel = supabase
      .channel('live-standings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_teams' }, () => { loadEventData(selectedEventId); })
      .subscribe();

    const goalsChannel = supabase
      .channel('live-goals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_goals' }, () => { loadEventData(selectedEventId); })
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(goalsChannel);
    };
  }, [selectedEventId]);

  const handleMatchChange = (payload: any) => {
    if (!notificationsEnabled) return;
    const newMatch = payload.new as Match;
    if (!newMatch) return;
    const prevState = prevMatchesRef.current.get(newMatch.id);
    const homeTeam = getTeamNameById(newMatch.home_team_id);
    const awayTeam = getTeamNameById(newMatch.away_team_id);
    if (prevState) {
      if (prevState.status !== newMatch.status) {
        if (newMatch.status === 'in_progress') notifyMatchStarted(homeTeam, awayTeam);
        else if (newMatch.status === 'finished') notifyMatchEnded(homeTeam, awayTeam, newMatch.home_score ?? 0, newMatch.away_score ?? 0);
      }
      if (newMatch.status === 'in_progress') {
        const newHomeScore = newMatch.home_score ?? 0;
        const newAwayScore = newMatch.away_score ?? 0;
        if (newHomeScore > prevState.homeScore) { playGoalSound(); notifyGoal(homeTeam, newHomeScore, newAwayScore); }
        if (newAwayScore > prevState.awayScore) { playGoalSound(); notifyGoal(awayTeam, newHomeScore, newAwayScore); }
      }
    }
    prevMatchesRef.current.set(newMatch.id, { status: newMatch.status, homeScore: newMatch.home_score ?? 0, awayScore: newMatch.away_score ?? 0 });
  };

  const loadEventData = async (eventId: string) => {
    setLoading(true);
    try {
      const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (!eventData) { setActiveEvent(null); setLoading(false); return; }

      setActiveEvent(eventData);
      const { data: liveCheck } = await supabase.from('matches').select('id').eq('event_id', eventId).eq('status', 'in_progress').limit(1);
      setIsLiveEvent((liveCheck || []).length > 0);

      const { data: matchesData } = await supabase.from('matches').select('*').eq('event_id', eventId).order('match_date', { ascending: true });
      const typedMatches = (matchesData || []) as Match[];
      setAllMatches(typedMatches);
      const live = typedMatches.filter(m => m.status === 'in_progress');
      setLiveMatches(live);

      const playingTeamIds = new Set<string>();
      live.forEach(m => { if (m.home_team_id) playingTeamIds.add(m.home_team_id); if (m.away_team_id) playingTeamIds.add(m.away_team_id); });
      setLiveTeamIds(playingTeamIds);

      const { data: teamsData } = await supabase.from('teams').select('*');
      const loadedTeams = (teamsData || []) as Team[];
      setTeams(loadedTeams);
      teamsRef.current = loadedTeams;

      typedMatches.forEach(m => {
        if (!prevMatchesRef.current.has(m.id)) {
          prevMatchesRef.current.set(m.id, { status: m.status, homeScore: m.home_score ?? 0, awayScore: m.away_score ?? 0 });
        }
      });

      const { data: eventTeamsData } = await supabase.from('event_teams').select('*').eq('event_id', eventId).order('group_name').order('points', { ascending: false });
      setEventTeams((eventTeamsData || []) as EventTeam[]);

      const { data: eventCatsData } = await supabase.from('event_categories').select('id, category_id').eq('event_id', eventId);
      if (eventCatsData && eventCatsData.length > 0) {
        const catIds = [...new Set(eventCatsData.map(ec => ec.category_id))];
        const { data: catsData } = await supabase.from('categories').select('*').in('id', catIds);
        const catMap = new Map<string, CategoryInfo>();
        eventCatsData.forEach(ec => {
          const cat = catsData?.find(c => c.id === ec.category_id);
          if (cat) catMap.set(ec.id, cat);
        });
        setCategories(catMap);
      }

      const fieldIds = [...new Set(typedMatches.map(m => m.field_id).filter(Boolean))];
      if (fieldIds.length > 0) {
        const { data: fieldsData } = await supabase.from('fields').select('id, name, facility_id').in('id', fieldIds as string[]);
        const fieldMap = new Map<string, FieldInfo>();
        const facilityIds = new Set<string>();
        (fieldsData || []).forEach(f => { fieldMap.set(f.id, f); facilityIds.add(f.facility_id); });
        setFields(fieldMap);

        if (facilityIds.size > 0) {
          const { data: facilData } = await supabase.from('facilities').select('id, name').in('id', [...facilityIds]);
          const facMap = new Map<string, FacilityInfo>();
          (facilData || []).forEach(f => facMap.set(f.id, f));
          setFacilities(facMap);
        }
      }

      const matchIds = typedMatches.map(m => m.id);
      if (matchIds.length > 0) {
        const { data: goalsData } = await supabase.from('match_goals').select('*').in('match_id', matchIds);
        if (goalsData && goalsData.length > 0) {
          const typedGoals = goalsData as MatchGoal[];
          const goalsMap: MatchGoalMap = new Map();
          typedGoals.forEach(goal => {
            const existing = goalsMap.get(goal.match_id) || [];
            existing.push(goal);
            goalsMap.set(goal.match_id, existing);
          });
          setMatchGoals(goalsMap);

          const goalCounts = new Map<string, number>();
          typedGoals.forEach(goal => { if (goal.player_id) goalCounts.set(goal.player_id, (goalCounts.get(goal.player_id) || 0) + 1); });
          const playerIds = Array.from(goalCounts.keys());
          if (playerIds.length > 0) {
            const { data: playersData } = await supabase.from('participants').select('*').in('id', playerIds);
            if (playersData) {
              const typedPlayers = playersData as Participant[];
              const namesMap: PlayerNameMap = new Map();
              typedPlayers.forEach(p => namesMap.set(p.id, { name: p.name, number: p.number }));
              setPlayerNames(namesMap);
              const scorers: TopScorer[] = typedPlayers.map(player => ({ player, team: loadedTeams.find(t => t.id === player.team_id) || null, goals: goalCounts.get(player.id) || 0 }));
              scorers.sort((a, b) => b.goals - a.goals);
              setTopScorers(scorers);
            }
          }
        } else {
          setTopScorers([]);
          setMatchGoals(new Map());
        }
      }
    } catch (error) {
      console.error('Error loading live data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId: string | null) => teamId ? teams.find(t => t.id === teamId)?.name || 'Equipo' : 'Por definir';
  const getTeamLogo = (teamId: string | null) => teamId ? teams.find(t => t.id === teamId)?.logo_url : undefined;

  const getMatchVenueInfo = (match: Match) => {
    const field = match.field_id ? fields.get(match.field_id) : null;
    const facility = field ? facilities.get(field.facility_id) : null;
    return { facility: facility?.name || null, field: field?.name || null };
  };

  const getMatchCategoryName = (match: Match) => {
    if (!match.category_id) return null;
    const cat = categories.get(match.category_id);
    if (!cat) return null;
    return cat.age_group ? `${cat.name} (${cat.age_group})` : cat.name;
  };

  const groupedStandings = eventTeams.reduce((acc, et) => {
    const group = et.group_name || 'Sin Grupo';
    if (!acc[group]) acc[group] = [];
    acc[group].push(et);
    return acc;
  }, {} as Record<string, EventTeam[]>);

  const totalGoals = allMatches.reduce((sum, m) => sum + (m.home_score || 0) + (m.away_score || 0), 0);
  const finishedMatches = allMatches.filter(m => m.status === 'finished').length;
  const totalYellowCards = eventTeams.reduce((sum, et) => sum + (et.yellow_cards || 0), 0);
  const totalRedCards = eventTeams.reduce((sum, et) => sum + (et.red_cards || 0), 0);

  const openMatchDetail = (match: Match) => {
    setSelectedMatchDetail(match);
    setMatchDetailOpen(true);
  };

  // Event selector view (no event selected)
  if (eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  if (allEvents.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Card className="p-12 text-center max-w-md">
          <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No hay eventos disponibles</h2>
          <p className="text-muted-foreground">No se han creado eventos todavía.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pt-20">
      {/* Event Selector Bar */}
      <div className="bg-muted/50 border-b py-4 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <Radio className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm whitespace-nowrap">Eventos en vivo:</span>
            <Select
              value={selectedEventId || ''}
              onValueChange={(val) => setSelectedEventId(val)}
            >
              <SelectTrigger className="w-full max-w-md bg-background">
                <SelectValue placeholder="Selecciona un evento para visualizar" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {allEvents.map(ev => (
                  <SelectItem key={ev.id} value={ev.id}>
                    <div className="flex items-center gap-2">
                      {ev.hasLiveMatches && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live flex-shrink-0" />}
                      <span>{ev.title}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({new Date(ev.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!selectedEventId ? (
        <div className="container mx-auto px-4 py-16 text-center">
          <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Selecciona un evento</h2>
          <p className="text-muted-foreground">Elige un evento del selector superior para ver los partidos, clasificación y estadísticas en vivo.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Cargando torneo...</p>
          </div>
        </div>
      ) : !activeEvent ? (
        <div className="flex items-center justify-center py-20">
          <Card className="p-12 text-center max-w-md">
            <p className="text-muted-foreground">Evento no encontrado.</p>
          </Card>
        </div>
      ) : (
        <>
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
                      <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-1">EN VIVO</Badge>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-8 h-8" />
                      <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-1">EVENTO</Badge>
                    </>
                  )}
                </div>
                {isLiveEvent && (
                  <Button variant="ghost" size="sm" onClick={handleEnableNotifications} className={`text-white hover:bg-white/20 ${notificationsEnabled ? 'bg-white/20' : ''}`}>
                    {notificationsEnabled ? (<><Bell className="w-4 h-4 mr-2" />Notificaciones activas</>) : (<><BellOff className="w-4 h-4 mr-2" />Activar notificaciones</>)}
                  </Button>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{activeEvent.title}</h1>
              <p className="text-white/80 mt-2">{activeEvent.location}</p>
              <p className="text-white/70 mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {new Date(activeEvent.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {activeEvent.end_date && activeEvent.end_date !== activeEvent.date && (
                  <> – {new Date(activeEvent.end_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</>
                )}
              </p>
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
                  {liveMatches.map((match) => {
                    const venue = getMatchVenueInfo(match);
                    const catName = getMatchCategoryName(match);
                    return (
                      <Card key={match.id} className="p-6 border-2 border-red-500/50 bg-gradient-to-br from-red-500/5 to-orange-500/5">
                        <div className="flex flex-col gap-1 mb-2">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-red-500 text-white animate-pulse-live">EN JUEGO</Badge>
                            {catName && <Badge variant="secondary" className="text-xs">{catName}</Badge>}
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {getPhaseLabel(match.phase, match.group_name)}
                          </p>
                          {(venue.facility || venue.field) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{venue.facility}{venue.field ? ` · ${venue.field}` : ''}
                            </p>
                          )}
                        </div>

                        <MatchTimer isLive={true} matchDurationMinutes={match.match_duration_minutes || 40} matchHalves={match.match_halves || 1} startedAt={match.started_at} readOnly={true} />

                        <div className="grid grid-cols-3 items-center gap-4 mt-4">
                          <div className="text-center">
                            {getTeamLogo(match.home_team_id) && <img src={getTeamLogo(match.home_team_id)!} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />}
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
                            {getTeamLogo(match.away_team_id) && <img src={getTeamLogo(match.away_team_id)!} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />}
                            <p className="font-semibold text-sm">{getTeamName(match.away_team_id)}</p>
                          </div>
                        </div>

                        {matchGoals.get(match.id) && matchGoals.get(match.id)!.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                            <div className="space-y-1">
                              {matchGoals.get(match.id)!.filter(g => g.team_id === match.home_team_id).sort((a, b) => (a.minute || 0) - (b.minute || 0)).map(g => {
                                const p = g.player_id ? playerNames.get(g.player_id) : null;
                                return <p key={g.id} className="text-xs text-muted-foreground">⚽ {p ? `${p.number ? `#${p.number} ` : ''}${p.name}` : 'Gol'}{g.minute ? ` (${g.minute}')` : ''}</p>;
                              })}
                            </div>
                            <div className="space-y-1 text-right">
                              {matchGoals.get(match.id)!.filter(g => g.team_id === match.away_team_id).sort((a, b) => (a.minute || 0) - (b.minute || 0)).map(g => {
                                const p = g.player_id ? playerNames.get(g.player_id) : null;
                                return <p key={g.id} className="text-xs text-muted-foreground">{p ? `${p.number ? `#${p.number} ` : ''}${p.name}` : 'Gol'}{g.minute ? ` (${g.minute}')` : ''} ⚽</p>;
                              })}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <Tabs defaultValue="standings" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="standings" className="flex items-center gap-2"><Trophy className="w-4 h-4" />Clasificación</TabsTrigger>
                <TabsTrigger value="results" className="flex items-center gap-2"><Users className="w-4 h-4" />Resultados</TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Estadísticas</TabsTrigger>
              </TabsList>

              {/* Standings Tab */}
              <TabsContent value="standings">
                <div className="space-y-6">
                  {Object.entries(groupedStandings).map(([groupName, groupTeams]) => (
                    <Card key={groupName} className="overflow-hidden">
                      <div className="bg-primary/10 px-4 py-2 border-b"><h3 className="font-bold">{groupName}</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3">Equipo</th>
                              <th className="text-center p-3">PJ</th><th className="text-center p-3">G</th><th className="text-center p-3">E</th><th className="text-center p-3">P</th>
                              <th className="text-center p-3">GF</th><th className="text-center p-3">GC</th><th className="text-center p-3">DG</th><th className="text-center p-3 font-bold">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupTeams.map((et, idx) => {
                              const isLive = liveTeamIds.has(et.team_id);
                              return (
                                <tr key={et.id} className={`border-b hover:bg-muted/30 ${isLive ? 'animate-heartbeat bg-red-500/10' : ''}`}>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{idx + 1}</span>
                                      {getTeamLogo(et.team_id) && <img src={getTeamLogo(et.team_id)!} alt="" className="w-6 h-6 object-contain" />}
                                      <span className={`font-medium ${isLive ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>{getTeamName(et.team_id)}</span>
                                      {isLive && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />}
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

              {/* Results Tab - FULL INFO: date, time, venue, field + match sheet button */}
              <TabsContent value="results">
                <div className="space-y-4">
                  {allMatches.filter(m => m.status === 'finished' || m.status === 'in_progress').map((match) => {
                    const venue = getMatchVenueInfo(match);
                    return (
                      <Card key={match.id} className={`p-4 ${match.status === 'in_progress' ? 'border-2 border-red-500/50' : ''}`}>
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                          <span className="text-sm text-muted-foreground">{getPhaseLabel(match.phase, match.group_name)}</span>
                          {match.status === 'in_progress' ? (
                            <Badge className="bg-red-500 text-white animate-pulse-live">EN JUEGO</Badge>
                          ) : (
                            <Badge variant="outline">Finalizado</Badge>
                          )}
                        </div>
                        {/* Date + Time + Venue */}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                          {match.match_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(match.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {match.match_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(match.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {venue.facility && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {venue.facility}
                            </span>
                          )}
                          {venue.field && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {venue.field}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {getTeamLogo(match.home_team_id) && <img src={getTeamLogo(match.home_team_id)!} alt="" className="w-8 h-8 object-contain" />}
                            <span className={`font-medium ${match.home_team_id && liveTeamIds.has(match.home_team_id) ? 'text-red-600 dark:text-red-400' : ''}`}>{getTeamName(match.home_team_id)}</span>
                          </div>
                          <div className="text-2xl font-bold px-4">{match.home_score ?? 0} - {match.away_score ?? 0}</div>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className={`font-medium ${match.away_team_id && liveTeamIds.has(match.away_team_id) ? 'text-red-600 dark:text-red-400' : ''}`}>{getTeamName(match.away_team_id)}</span>
                            {getTeamLogo(match.away_team_id) && <img src={getTeamLogo(match.away_team_id)!} alt="" className="w-8 h-8 object-contain" />}
                          </div>
                        </div>
                        {/* Match sheet button */}
                        <div className="mt-3 pt-2 border-t flex justify-center">
                          <Button variant="ghost" size="sm" className="text-primary" onClick={() => openMatchDetail(match)}>
                            <FileText className="w-4 h-4 mr-1" />
                            Ver ficha del partido
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                  {allMatches.filter(m => m.status === 'finished' || m.status === 'in_progress').length === 0 && (
                    <Card className="p-8 text-center"><p className="text-muted-foreground">Aún no hay resultados disponibles</p></Card>
                  )}
                </div>
              </TabsContent>

              {/* Stats Tab */}
              <TabsContent value="stats">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <Card className="p-6 text-center"><p className="text-sm text-muted-foreground mb-1">Partidos Jugados</p><p className="text-4xl font-bold text-primary">{finishedMatches}</p></Card>
                  <Card className="p-6 text-center"><p className="text-sm text-muted-foreground mb-1">Goles Totales</p><p className="text-4xl font-bold text-primary">{totalGoals}</p></Card>
                  <Card className="p-6 text-center"><p className="text-sm text-muted-foreground mb-1">Tarjetas Amarillas</p><p className="text-4xl font-bold text-yellow-500">🟨 {totalYellowCards}</p></Card>
                  <Card className="p-6 text-center"><p className="text-sm text-muted-foreground mb-1">Tarjetas Rojas</p><p className="text-4xl font-bold text-red-500">🟥 {totalRedCards}</p></Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Goal className="w-5 h-5 text-primary" />Máximos Goleadores</h3>
                    <div className="space-y-3">
                      {topScorers.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Aún no hay goles registrados</p>
                      ) : (
                        topScorers.slice(0, 10).map((scorer, idx) => (
                          <div key={scorer.player.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-amber-600 text-amber-100' : 'bg-primary/10'}`}>{idx + 1}</span>
                              {scorer.player.photo_url && <img src={scorer.player.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
                              <div>
                                <p className="font-medium">{scorer.player.number && <span className="text-muted-foreground mr-1">#{scorer.player.number}</span>}{scorer.player.name}</p>
                                {scorer.team && <p className="text-xs text-muted-foreground">{scorer.team.name}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1"><span className="text-2xl font-bold text-primary">{scorer.goals}</span><span className="text-sm text-muted-foreground">⚽</span></div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4">Equipos Más Goleadores</h3>
                    <div className="space-y-3">
                      {[...eventTeams].sort((a, b) => (b.goals_for || 0) - (a.goals_for || 0)).slice(0, 5).map((et, idx) => (
                        <div key={et.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{idx + 1}</span>
                            {getTeamLogo(et.team_id) && <img src={getTeamLogo(et.team_id)!} alt="" className="w-8 h-8 object-contain" />}
                            <span className={liveTeamIds.has(et.team_id) ? 'text-red-600 dark:text-red-400 font-bold' : ''}>{getTeamName(et.team_id)}</span>
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

          {/* Match Detail Dialog */}
          <Dialog open={matchDetailOpen} onOpenChange={setMatchDetailOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Ficha del Partido
                </DialogTitle>
              </DialogHeader>
              {selectedMatchDetail && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">{getPhaseLabel(selectedMatchDetail.phase, selectedMatchDetail.group_name)}</p>
                  {/* Date/venue */}
                  {(() => {
                    const v = getMatchVenueInfo(selectedMatchDetail);
                    return (
                      <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                        {selectedMatchDetail.match_date && (
                          <span>{new Date(selectedMatchDetail.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} – {new Date(selectedMatchDetail.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        {v.facility && <span>{v.facility}</span>}
                        {v.field && <span>{v.field}</span>}
                      </div>
                    );
                  })()}
                  {/* Teams + score */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <div className="text-center">
                      {getTeamLogo(selectedMatchDetail.home_team_id) && <img src={getTeamLogo(selectedMatchDetail.home_team_id)!} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />}
                      <p className="font-semibold text-sm">{getTeamName(selectedMatchDetail.home_team_id)}</p>
                    </div>
                    <div className="text-center text-4xl font-bold">
                      {selectedMatchDetail.home_score ?? 0} - {selectedMatchDetail.away_score ?? 0}
                    </div>
                    <div className="text-center">
                      {getTeamLogo(selectedMatchDetail.away_team_id) && <img src={getTeamLogo(selectedMatchDetail.away_team_id)!} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />}
                      <p className="font-semibold text-sm">{getTeamName(selectedMatchDetail.away_team_id)}</p>
                    </div>
                  </div>
                  {/* Scorers */}
                  {matchGoals.get(selectedMatchDetail.id) && matchGoals.get(selectedMatchDetail.id)!.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-semibold mb-2">Goleadores</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          {matchGoals.get(selectedMatchDetail.id)!.filter(g => g.team_id === selectedMatchDetail.home_team_id).sort((a, b) => (a.minute || 0) - (b.minute || 0)).map(g => {
                            const p = g.player_id ? playerNames.get(g.player_id) : null;
                            return <p key={g.id} className="text-sm">⚽ {p ? `${p.number ? `#${p.number} ` : ''}${p.name}` : 'Gol'}{g.minute ? ` – min. ${g.minute}'` : ''}</p>;
                          })}
                        </div>
                        <div className="space-y-1 text-right">
                          {matchGoals.get(selectedMatchDetail.id)!.filter(g => g.team_id === selectedMatchDetail.away_team_id).sort((a, b) => (a.minute || 0) - (b.minute || 0)).map(g => {
                            const p = g.player_id ? playerNames.get(g.player_id) : null;
                            return <p key={g.id} className="text-sm">{p ? `${p.number ? `#${p.number} ` : ''}${p.name}` : 'Gol'}{g.minute ? ` – min. ${g.minute}'` : ''} ⚽</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
