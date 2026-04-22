import { useEffect, useState, useMemo } from 'react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Trophy, Calendar, Palette, Loader2, Image, TrendingUp, Target, Shield, MapPin, ChevronDown, Clock, Building2, FileText } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FEMDTournamentHistory } from '@/components/FEMDTournamentHistory';

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
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournamentRosters, setTournamentRosters] = useState<TournamentRoster[]>([]);
  const [openRosters, setOpenRosters] = useState<Record<string, boolean>>({});
  const [matchFilter, setMatchFilter] = useState<string>('all');
  const [statsFilter, setStatsFilter] = useState<string>('all');
  const [matchGoals, setMatchGoals] = useState<Record<string, any[]>>({});
  const [matchCards, setMatchCards] = useState<Record<string, any[]>>({});

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
      setAllEvents(eventsData);

      // Get events from event_teams (the real source of participation)
      const { data: eventTeamsData } = await supabase
        .from('event_teams')
        .select('id, event_id')
        .eq('team_id', id);

      const participatedEventIds = new Set((eventTeamsData || []).map(et => et.event_id));
      
      // Also include legacy team_ids approach
      eventsData.forEach(event => {
        if (event.team_ids?.includes(id)) {
          participatedEventIds.add(event.id);
        }
      });

      const teamEvents = eventsData.filter(e => participatedEventIds.has(e.id));
      setEvents(teamEvents);

      // Load matches with facility/field info
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
          event:events(id, title),
          field:fields!matches_field_id_fkey(id, name, facility:facilities(id, name))
        `)
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .order('match_date', { ascending: false });

      setMatches(matchesData || []);

      // Load goals and cards for all matches
      if (matchesData && matchesData.length > 0) {
        const matchIds = matchesData.map(m => m.id);
        const [goalsRes, cardsRes] = await Promise.all([
          supabase.from('match_goals').select('*, player:participants(id, name)').in('match_id', matchIds),
          supabase.from('match_cards').select('*, player:participants(id, name)').in('match_id', matchIds),
        ]);
        
        const goalsMap: Record<string, any[]> = {};
        (goalsRes.data || []).forEach(g => {
          if (!goalsMap[g.match_id]) goalsMap[g.match_id] = [];
          goalsMap[g.match_id].push(g);
        });
        setMatchGoals(goalsMap);

        const cardsMap: Record<string, any[]> = {};
        (cardsRes.data || []).forEach(c => {
          if (!cardsMap[c.match_id]) cardsMap[c.match_id] = [];
          cardsMap[c.match_id].push(c);
        });
        setMatchCards(cardsMap);
      }

      // Load tournament rosters
      if (eventTeamsData && eventTeamsData.length > 0) {
        const eventTeamIds = eventTeamsData.map(et => et.id);
        
        const { data: rostersData } = await supabase
          .from('team_rosters')
          .select('*, participant:participants(*)')
          .in('event_team_id', eventTeamIds);

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
    ? matches.filter(m => m.status === 'finished')
    : matches.filter(m => m.event?.id === statsFilter && m.status === 'finished');

  // ===== STATS COMPUTATIONS =====
  const statsData = useMemo(() => {
    const wins = statsMatches.filter(m => {
      const isHome = m.home_team_id === id;
      const ts = isHome ? m.home_score : m.away_score;
      const os = isHome ? m.away_score : m.home_score;
      return ts != null && os != null && ts > os;
    }).length;
    const draws = statsMatches.filter(m => {
      const isHome = m.home_team_id === id;
      const ts = isHome ? m.home_score : m.away_score;
      const os = isHome ? m.away_score : m.home_score;
      return ts != null && os != null && ts === os;
    }).length;
    const losses = statsMatches.filter(m => {
      const isHome = m.home_team_id === id;
      const ts = isHome ? m.home_score : m.away_score;
      const os = isHome ? m.away_score : m.home_score;
      return ts != null && os != null && ts < os;
    }).length;
    const goalsFor = statsMatches.reduce((s, m) => {
      const isHome = m.home_team_id === id;
      return s + (isHome ? (m.home_score || 0) : (m.away_score || 0));
    }, 0);
    const goalsAgainst = statsMatches.reduce((s, m) => {
      const isHome = m.home_team_id === id;
      return s + (isHome ? (m.away_score || 0) : (m.home_score || 0));
    }, 0);
    return { wins, draws, losses, total: wins + draws + losses, goalsFor, goalsAgainst };
  }, [statsMatches, id]);

  // Top scorers from match_goals filtered by statsFilter
  const topScorers = useMemo(() => {
    const relevantMatchIds = new Set(statsMatches.map(m => m.id));
    const scorerMap: Record<string, { name: string; playerId: string; goals: number }> = {};
    
    Object.entries(matchGoals).forEach(([matchId, goals]) => {
      if (!relevantMatchIds.has(matchId)) return;
      goals.forEach(g => {
        if (g.team_id !== id) return; // only count goals for this team
        const pId = g.player_id || 'unknown';
        const pName = g.player?.name || 'Desconocido';
        if (!scorerMap[pId]) scorerMap[pId] = { name: pName, playerId: pId, goals: 0 };
        scorerMap[pId].goals++;
      });
    });
    
    return Object.values(scorerMap).sort((a, b) => b.goals - a.goals);
  }, [statsMatches, matchGoals, id]);

  // Tournament performance chart data (only when "all" filter)
  const tournamentPerformanceData = useMemo(() => {
    if (statsFilter !== 'all') return [];
    
    // Group finished matches by event
    const byEvent: Record<string, { title: string; matches: any[] }> = {};
    matches.filter(m => m.status === 'finished' && m.event).forEach(m => {
      if (!byEvent[m.event.id]) byEvent[m.event.id] = { title: m.event.title, matches: [] };
      byEvent[m.event.id].matches.push(m);
    });

    // For each event, determine the max phase reached
    // We map phases to numeric levels
    const phaseLevel = (phase: string): number => {
      if (phase.includes('final') && !phase.includes('semi') && !phase.includes('quarter') && !phase.includes('third')) return 5;
      if (phase.includes('semi_final')) return 4;
      if (phase.includes('quarter_final')) return 3;
      if (phase.includes('round_of_8')) return 2;
      if (phase.includes('round_of_16')) return 1;
      return 0; // group
    };

    const phaseLabels = ['Fase de Grupos', '1/8 de Final', '1/4 de Final', 'Semifinales', 'Finalista', 'Campeón'];

    return Object.entries(byEvent).map(([eventId, { title, matches: eventMatches }]) => {
      // Separate by tier
      const tiers = { gold: 0, silver: 0, bronze: 0 };
      eventMatches.forEach(m => {
        const level = phaseLevel(m.phase);
        const phase = m.phase as string;
        // Determine if team won the final
        let adjustedLevel = level;
        if (level === 5) {
          const isHome = m.home_team_id === id;
          const ts = isHome ? m.home_score : m.away_score;
          const os = isHome ? m.away_score : m.home_score;
          if (ts != null && os != null && ts > os) adjustedLevel = 5; // Campeón
          else adjustedLevel = 4; // Finalista
        }

        if (phase.startsWith('gold_') || (!phase.startsWith('silver_') && !phase.startsWith('bronze_'))) {
          tiers.gold = Math.max(tiers.gold, phase === 'group' ? 0 : adjustedLevel);
        }
        if (phase.startsWith('silver_')) {
          tiers.silver = Math.max(tiers.silver, adjustedLevel);
        }
        if (phase.startsWith('bronze_')) {
          tiers.bronze = Math.max(tiers.bronze, adjustedLevel);
        }
      });

      // Shorten title
      const shortTitle = title.length > 25 ? title.substring(0, 22) + '...' : title;

      return { torneo: shortTitle, fullTitle: title, 'Fase Oro': tiers.gold, 'Fase Plata': tiers.silver, 'Fase Bronce': tiers.bronze };
    });
  }, [matches, id, statsFilter]);

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

  const PIE_COLORS = ['hsl(142, 71%, 45%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)'];
  const phaseLabels = ['Fase de Grupos', '1/8 de Final', '1/4 de Final', 'Semifinales', 'Finalista', 'Campeón'];

  const renderMatchSheet = (match: any) => {
    const goals = matchGoals[match.id] || [];
    const cards = matchCards[match.id] || [];
    const homeGoals = goals.filter(g => g.team_id === match.home_team_id).sort((a: any, b: any) => (a.minute || 0) - (b.minute || 0));
    const awayGoals = goals.filter(g => g.team_id === match.away_team_id).sort((a: any, b: any) => (a.minute || 0) - (b.minute || 0));
    const homeCards = cards.filter(c => c.team_id === match.home_team_id);
    const awayCards = cards.filter(c => c.team_id === match.away_team_id);

    return (
      <div className="space-y-6">
        {/* Event & Category */}
        {match.event?.title && (
          <div className="text-center">
            <Badge variant="outline" className="text-sm">{match.event.title}</Badge>
          </div>
        )}

        {/* Teams & Score */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            {match.home_team?.logo_url && <img src={match.home_team.logo_url} alt="" className="w-16 h-16 object-contain" />}
            <p className="font-semibold text-sm text-center">{match.home_team?.name || match.home_placeholder || '?'}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-4xl font-bold">
              {match.home_score ?? '-'} - {match.away_score ?? '-'}
            </p>
            <Badge variant={match.status === 'finished' ? 'default' : match.status === 'in_progress' ? 'destructive' : 'outline'} className="mt-1">
              {match.status === 'finished' ? 'Finalizado' : match.status === 'in_progress' ? 'En juego' : 'Programado'}
            </Badge>
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            {match.away_team?.logo_url && <img src={match.away_team.logo_url} alt="" className="w-16 h-16 object-contain" />}
            <p className="font-semibold text-sm text-center">{match.away_team?.name || match.away_placeholder || '?'}</p>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
          {match.match_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(match.match_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              {new Date(match.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {match.field?.facility?.name && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {match.field.facility.name} — {match.field.name}
            </div>
          )}
        </div>

        {/* Scorers */}
        {(homeGoals.length > 0 || awayGoals.length > 0) && (
          <div>
            <h4 className="font-semibold mb-2 text-sm">⚽ Goleadores</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                {homeGoals.map((g: any, i: number) => (
                  <p key={i} className="text-sm">
                    {g.player?.name || 'Desconocido'}
                    {g.minute ? ` (min ${g.minute})` : ''}
                    {g.is_own_goal ? ' (PP)' : ''}
                  </p>
                ))}
              </div>
              <div className="space-y-1 text-right">
                {awayGoals.map((g: any, i: number) => (
                  <p key={i} className="text-sm">
                    {g.player?.name || 'Desconocido'}
                    {g.minute ? ` (min ${g.minute})` : ''}
                    {g.is_own_goal ? ' (PP)' : ''}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cards */}
        {(homeCards.length > 0 || awayCards.length > 0) && (
          <div>
            <h4 className="font-semibold mb-2 text-sm">📋 Tarjetas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                {homeCards.map((c: any, i: number) => (
                  <p key={i} className="text-sm flex items-center gap-1">
                    <span className={`inline-block w-3 h-4 rounded-sm ${c.card_type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                    {c.player?.name || 'Desconocido'}
                    {c.minute ? ` (min ${c.minute})` : ''}
                  </p>
                ))}
              </div>
              <div className="space-y-1 text-right">
                {awayCards.map((c: any, i: number) => (
                  <p key={i} className="text-sm flex items-center gap-1 justify-end">
                    {c.player?.name || 'Desconocido'}
                    {c.minute ? ` (min ${c.minute})` : ''}
                    <span className={`inline-block w-3 h-4 rounded-sm ${c.card_type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8 sm:py-16">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Back Button */}
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/equipos')} className="h-9">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="text-sm">Volver a clubes</span>
          </Button>
          {team.parent_team_id && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/equipos/${team.parent_team_id}`)} className="h-9">
              <Shield className="w-4 h-4 mr-2" />
              <span className="text-sm">Ver club principal</span>
            </Button>
          )}
        </div>

        {/* Team Header */}
        <Card className="mb-6 sm:mb-8 overflow-hidden border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 sm:p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                {team.logo_url ? (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-background flex items-center justify-center overflow-hidden ring-4 ring-background shadow-xl">
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-3 sm:p-4" />
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-4 ring-background shadow-xl">
                    <Users className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left min-w-0">
                <CardTitle className="text-2xl sm:text-4xl mb-1 break-words">{team.name}</CardTitle>
                {location && (
                  <p className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-1 justify-center md:justify-start">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </p>
                )}
                {team.description && (
                  <p className="text-muted-foreground text-sm sm:text-lg mb-3 sm:mb-4">{team.description}</p>
                )}
                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center md:justify-start">
                  {team.founded_year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">Fundado en {team.founded_year}</span>
                    </div>
                  )}
                  {team.colors && (
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">Colores: {team.colors}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* FEMD Tournament History - now uses event_teams-based events */}
        {events.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <FEMDTournamentHistory
              events={events.map(e => ({ id: e.id, title: e.title, date: e.date }))}
              title="Participación en Torneos FEMD"
              description={`Historial de ${team.name} en competiciones FEMD`}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue={childTeams.length > 0 ? "equipos" : "estadisticas"} className="w-full">
          <TabsList className={`grid w-full ${childTeams.length > 0 ? 'grid-cols-5' : 'grid-cols-4'} gap-0.5 sm:gap-1 h-auto p-1 lg:w-auto mb-6 sm:mb-8`}>
            {childTeams.length > 0 && (
              <TabsTrigger value="equipos" className="flex-col sm:flex-row items-center gap-0.5 sm:gap-2 text-[10px] sm:text-sm py-2 px-1 sm:px-3 min-h-[48px]">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Equipos</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="estadisticas" className="flex-col sm:flex-row items-center gap-0.5 sm:gap-2 text-[10px] sm:text-sm py-2 px-1 sm:px-3 min-h-[48px]">
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="partidos" className="flex-col sm:flex-row items-center gap-0.5 sm:gap-2 text-[10px] sm:text-sm py-2 px-1 sm:px-3 min-h-[48px]">
              <Trophy className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Partidos</span>
            </TabsTrigger>
            <TabsTrigger value="plantillas" className="flex-col sm:flex-row items-center gap-0.5 sm:gap-2 text-[10px] sm:text-sm py-2 px-1 sm:px-3 min-h-[48px]">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Plantilla</span>
            </TabsTrigger>
            <TabsTrigger value="galeria" className="flex-col sm:flex-row items-center gap-0.5 sm:gap-2 text-[10px] sm:text-sm py-2 px-1 sm:px-3 min-h-[48px]">
              <Image className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Galería</span>
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

          {/* Plantillas Tab */}
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
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="w-12">N°</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="hidden sm:table-cell">Posición</TableHead>
                                    <TableHead className="text-center w-10" title="Partidos Jugados">PJ</TableHead>
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
                                      <TableCell className="text-center text-sm font-medium text-primary">{participant.goals_scored || 0}</TableCell>
                                      <TableCell className="text-center text-sm">{participant.yellow_cards || 0}</TableCell>
                                      <TableCell className="text-center text-sm">{participant.red_cards || 0}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>

                              {staff.length > 0 && (
                                <div className="border-t bg-muted/20 p-4">
                                  <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Cuerpo Técnico</p>
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

            {/* Tournament Performance Chart - only on "all" */}
            {statsFilter === 'all' && tournamentPerformanceData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Rendimiento en Torneos FEMD</CardTitle>
                  <CardDescription>Máxima fase alcanzada por torneo y fase eliminatoria</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={tournamentPerformanceData} margin={{ bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="torneo" 
                        className="text-xs" 
                        angle={-35} 
                        textAnchor="end" 
                        height={80}
                        interval={0}
                      />
                      <YAxis 
                        domain={[0, 5]} 
                        ticks={[0, 1, 2, 3, 4, 5]}
                        tickFormatter={(v) => phaseLabels[v] || ''}
                        className="text-xs"
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number, name: string) => [phaseLabels[value] || 'N/A', name]}
                        labelFormatter={(label) => {
                          const item = tournamentPerformanceData.find(d => d.torneo === label);
                          return item?.fullTitle || label;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Fase Oro" fill="hsl(48, 96%, 53%)" />
                      <Bar dataKey="Fase Plata" fill="hsl(0, 0%, 75%)" />
                      <Bar dataKey="Fase Bronce" fill="hsl(30, 67%, 50%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Balance del club - Pie chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Balance del Club</CardTitle>
                  <CardDescription>{statsData.total} partidos jugados</CardDescription>
                </CardHeader>
                <CardContent>
                  {statsData.total > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Victorias', value: statsData.wins },
                            { name: 'Empates', value: statsData.draws },
                            { name: 'Derrotas', value: statsData.losses },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {[0, 1, 2].map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Sin partidos finalizados</p>
                  )}
                </CardContent>
              </Card>

              {/* Promedio de goles + Top Scorers */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Promedio de Goles</CardTitle>
                    <CardDescription>Por partido jugado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Goles a Favor</p>
                        <p className="text-3xl font-bold text-primary">
                          {statsData.total > 0 ? (statsData.goalsFor / statsData.total).toFixed(2) : '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total: {statsData.goalsFor}</p>
                      </div>
                      <div className="p-4 bg-destructive/10 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Goles en Contra</p>
                        <p className="text-3xl font-bold text-destructive">
                          {statsData.total > 0 ? (statsData.goalsAgainst / statsData.total).toFixed(2) : '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total: {statsData.goalsAgainst}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Máximos Goleadores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topScorers.length > 0 ? (
                      <div className="space-y-2">
                        {topScorers.slice(0, 10).map((scorer, idx) => (
                          <div key={scorer.playerId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-orange-400 text-orange-900' : 'bg-muted text-muted-foreground'
                              }`}>
                                {idx + 1}
                              </span>
                              {scorer.playerId !== 'unknown' ? (
                                <Link to={`/jugador/${scorer.playerId}`} className="text-sm font-medium hover:text-primary hover:underline">
                                  {scorer.name}
                                </Link>
                              ) : (
                                <span className="text-sm font-medium">{scorer.name}</span>
                              )}
                            </div>
                            <Badge variant="default">{scorer.goals} ⚽</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4 text-sm">Sin goleadores registrados</p>
                    )}
                  </CardContent>
                </Card>
              </div>
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
                              <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground min-w-[200px]">
                                {match.match_date && (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3.5 h-3.5" />
                                      {new Date(match.match_date).toLocaleDateString('es-ES')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5" />
                                      {new Date(match.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </>
                                )}
                                {match.field?.facility?.name && (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span className="text-xs">{match.field.facility.name} — {match.field.name}</span>
                                  </div>
                                )}
                                <Sheet>
                                  <SheetTrigger asChild>
                                    <Button variant="outline" size="sm" className="mt-1">
                                      <FileText className="w-3.5 h-3.5 mr-1" />
                                      Ficha del partido
                                    </Button>
                                  </SheetTrigger>
                                  <SheetContent className="overflow-y-auto">
                                    <SheetHeader>
                                      <SheetTitle>Ficha del Partido</SheetTitle>
                                    </SheetHeader>
                                    {renderMatchSheet(match)}
                                  </SheetContent>
                                </Sheet>
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
