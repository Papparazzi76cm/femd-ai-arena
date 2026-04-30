import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Match } from '@/types/tournament';
import { Calendar, MapPin, Save, Play, Square, Check, Goal, RotateCcw, Star, Upload, CreditCard } from 'lucide-react';
import { MatchTimer } from './MatchTimer';
import { useGoalSound } from '@/hooks/useGoalSound';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import { GoalScorersDialog } from './GoalScorersDialog';
import { CardManagerDialog } from './CardManagerDialog';
import { supabase } from '@/integrations/supabase/client';

interface MatchCardProps {
  match: Match;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  onUpdate: (matchId: string, updates: Partial<Match>) => Promise<void>;
  readOnly?: boolean;
  eventId?: string;
}

export const MatchCard = ({ 
  match, 
  homeTeamName, 
  awayTeamName,
  homeTeamId,
  awayTeamId,
  onUpdate,
  readOnly = false,
  eventId 
}: MatchCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showGoalScorers, setShowGoalScorers] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mvpPlayers, setMvpPlayers] = useState<any[]>([]);
  const [selectedMvp, setSelectedMvp] = useState<string>('');
  const [currentMvp, setCurrentMvp] = useState<any>(null);
  const [mvpPhotoFile, setMvpPhotoFile] = useState<File | null>(null);
  const [mvpLoading, setMvpLoading] = useState(false);
  const [homeScore, setHomeScore] = useState(match.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(match.away_score ?? 0);
  const [homeYellow, setHomeYellow] = useState(match.home_yellow_cards ?? 0);
  const [homeRed, setHomeRed] = useState(match.home_red_cards ?? 0);
  const [awayYellow, setAwayYellow] = useState(match.away_yellow_cards ?? 0);
  const [awayRed, setAwayRed] = useState(match.away_red_cards ?? 0);
  const [saving, setSaving] = useState(false);

  const { playGoalSound } = useGoalSound();
  const { notifyMatchStarted, notifyMatchEnded, notifyGoal } = useMatchNotifications();
  
  const prevScoreRef = useRef({ home: match.home_score ?? 0, away: match.away_score ?? 0 });
  const isLive = match.status === 'in_progress';
  const isFinished = match.status === 'finished';
  const effectiveEventId = eventId || match.event_id;

  // Sync local state when match data changes
  useEffect(() => {
    setHomeScore(match.home_score ?? 0);
    setAwayScore(match.away_score ?? 0);
    setHomeYellow(match.home_yellow_cards ?? 0);
    setHomeRed(match.home_red_cards ?? 0);
    setAwayYellow(match.away_yellow_cards ?? 0);
    setAwayRed(match.away_red_cards ?? 0);
  }, [match]);

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      'group': 'Fase de Grupos',
      'round_of_16': 'Octavos de Final',
      'quarter_final': 'Cuartos de Final',
      'semi_final': 'Semifinales',
      'final': 'Final',
    };
    return labels[phase] || phase;
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">Programado</Badge>;
      case 'in_progress':
        return (
          <Badge className="bg-red-500 text-white animate-pulse-live flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full" />
            En Juego
          </Badge>
        );
      case 'finished':
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"><Check className="w-3 h-3 mr-1" />Finalizado</Badge>;
      default:
        return null;
    }
  };

  const handleStartMatch = async () => {
    setSaving(true);
    try {
      await onUpdate(match.id, {
        status: 'in_progress',
        home_score: homeScore,
        away_score: awayScore,
        started_at: new Date().toISOString(),
      });
      setIsEditing(true);
      notifyMatchStarted(homeTeamName, awayTeamName);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStartedAt = async () => {
    await onUpdate(match.id, {
      started_at: new Date().toISOString(),
    });
  };

  const handleEndMatch = async () => {
    setSaving(true);
    try {
      await onUpdate(match.id, {
        home_score: homeScore,
        away_score: awayScore,
        home_yellow_cards: homeYellow,
        home_red_cards: homeRed,
        away_yellow_cards: awayYellow,
        away_red_cards: awayRed,
        status: 'finished',
      });
      setIsEditing(false);
      notifyMatchEnded(homeTeamName, awayTeamName, homeScore, awayScore);
    } finally {
      setSaving(false);
    }
  };

  const handleResumeMatch = async () => {
    setSaving(true);
    try {
      await onUpdate(match.id, {
        status: 'in_progress',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestartMatch = async () => {
    if (!confirm('¿Seguro que quieres reiniciar el partido desde cero?')) return;
    setSaving(true);
    try {
      await onUpdate(match.id, {
        status: 'in_progress',
        home_score: 0,
        away_score: 0,
        home_yellow_cards: 0,
        home_red_cards: 0,
        away_yellow_cards: 0,
        away_red_cards: 0,
        started_at: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleScoreChange = (team: 'home' | 'away', newScore: number) => {
    const prevHome = prevScoreRef.current.home;
    const prevAway = prevScoreRef.current.away;
    
    if (team === 'home') {
      setHomeScore(newScore);
      if (newScore > prevHome && isLive) {
        playGoalSound();
        notifyGoal(homeTeamName, newScore, awayScore);
      }
      prevScoreRef.current.home = newScore;
    } else {
      setAwayScore(newScore);
      if (newScore > prevAway && isLive) {
        playGoalSound();
        notifyGoal(awayTeamName, homeScore, newScore);
      }
      prevScoreRef.current.away = newScore;
    }
  };

  const handleSaveLive = async () => {
    setSaving(true);
    try {
      await onUpdate(match.id, {
        home_score: homeScore,
        away_score: awayScore,
        home_yellow_cards: homeYellow,
        home_red_cards: homeRed,
        away_yellow_cards: awayYellow,
        away_red_cards: awayRed,
        status: 'in_progress',
      });
      prevScoreRef.current = { home: homeScore, away: awayScore };
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinishedEdit = async () => {
    setSaving(true);
    try {
      await onUpdate(match.id, {
        home_score: homeScore,
        away_score: awayScore,
        home_yellow_cards: homeYellow,
        home_red_cards: homeRed,
        away_yellow_cards: awayYellow,
        away_red_cards: awayRed,
        status: 'finished',
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setHomeScore(match.home_score ?? 0);
    setAwayScore(match.away_score ?? 0);
    setHomeYellow(match.home_yellow_cards ?? 0);
    setHomeRed(match.home_red_cards ?? 0);
    setAwayYellow(match.away_yellow_cards ?? 0);
    setAwayRed(match.away_red_cards ?? 0);
    setIsEditing(false);
  };

  // MVP functions
  const loadMvpData = async () => {
    setMvpLoading(true);
    try {
      // Load roster-filtered players (same logic as GoalScorersDialog)
      let homeRosterPlayers: any[] = [];
      let awayRosterPlayers: any[] = [];

      if (effectiveEventId) {
        const resolveEventTeamId = async (teamId: string, explicitId?: string | null) => {
          if (explicitId) return explicitId;
          const { data } = await supabase
            .from('event_teams')
            .select('id, category_id')
            .eq('event_id', effectiveEventId)
            .eq('team_id', teamId);

          if (!data || data.length === 0) return null;
          const exact = match.category_id ? data.find(et => et.category_id === match.category_id) : null;
          if (exact) return exact.id;
          const uncategorized = data.filter(et => !et.category_id);
          if (uncategorized.length === 1) return uncategorized[0].id;
          return data.length === 1 ? data[0].id : null;
        };

        const homeETId = await resolveEventTeamId(homeTeamId, (match as any).home_event_team_id);
        const awayETId = await resolveEventTeamId(awayTeamId, (match as any).away_event_team_id);

          if (homeETId) {
            const { data: rosters } = await supabase.from('team_rosters').select('participant_id, jersey_number').eq('event_team_id', homeETId).eq('roster_role', 'player');
            if (rosters && rosters.length > 0) {
              const { data } = await supabase.from('participants').select('*').in('id', rosters.map(r => r.participant_id));
              const jerseyMap = new Map(rosters.map(r => [r.participant_id, r.jersey_number]));
              homeRosterPlayers = (data || [])
                .map((p: any) => ({ ...p, number: jerseyMap.get(p.id) ?? null }))
                .sort((a: any, b: any) => (a.number ?? 9999) - (b.number ?? 9999));
            }
          }
          if (awayETId) {
            const { data: rosters } = await supabase.from('team_rosters').select('participant_id, jersey_number').eq('event_team_id', awayETId).eq('roster_role', 'player');
            if (rosters && rosters.length > 0) {
              const { data } = await supabase.from('participants').select('*').in('id', rosters.map(r => r.participant_id));
              const jerseyMap = new Map(rosters.map(r => [r.participant_id, r.jersey_number]));
              awayRosterPlayers = (data || [])
                .map((p: any) => ({ ...p, number: jerseyMap.get(p.id) ?? null }))
                .sort((a: any, b: any) => (a.number ?? 9999) - (b.number ?? 9999));
            }
          }
      }

      // No fallback by team_id: stick to the roster of this event + category to
      // avoid mixing players from previous tournaments or other categories.

      const { data: mvpData } = await supabase.from('match_mvps').select('*, player:participants(*)').eq('match_id', match.id).maybeSingle();

      setMvpPlayers([
        ...homeRosterPlayers.map((p: any) => ({ ...p, _teamName: homeTeamName })),
        ...awayRosterPlayers.map((p: any) => ({ ...p, _teamName: awayTeamName })),
      ]);
      if (mvpData) {
        setCurrentMvp(mvpData);
        setSelectedMvp(mvpData.player_id);
      } else {
        setCurrentMvp(null);
        setSelectedMvp('');
      }
    } finally {
      setMvpLoading(false);
    }
  };

  const handleSaveMvp = async () => {
    if (!selectedMvp) return;
    setMvpLoading(true);
    try {
      let photoUrl = currentMvp?.photo_url || null;
      if (mvpPhotoFile) {
        const ext = mvpPhotoFile.name.split('.').pop();
        const fileName = `mvp/${match.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('imagenes-torneos')
          .upload(fileName, mvpPhotoFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('imagenes-torneos').getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      if (currentMvp) {
        await supabase.from('match_mvps').update({ player_id: selectedMvp, photo_url: photoUrl }).eq('id', currentMvp.id);
      } else {
        await supabase.from('match_mvps').insert({ match_id: match.id, player_id: selectedMvp, photo_url: photoUrl });
      }
      setMvpOpen(false);
      setMvpPhotoFile(null);
    } finally {
      setMvpLoading(false);
    }
  };

  const canEdit = !readOnly;

  return (
    <Card className={`p-3 sm:p-6 ${isLive ? 'border-2 border-red-500 animate-heartbeat' : ''}`}>
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-semibold text-base sm:text-lg break-words">{getPhaseLabel(match.phase)}</h3>
            {match.group_name && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {match.group_name}
              </div>
            )}
            {match.match_date && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="break-words">
                  {new Date(match.match_date).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge()}
          </div>
        </div>

        {/* Match Timer for live matches */}
        {isLive && (
          <MatchTimer 
            isLive={isLive} 
            matchDurationMinutes={match.match_duration_minutes || 40}
            matchHalves={match.match_halves || 1}
            startedAt={match.started_at}
            onStartTimer={handleSaveStartedAt}
            readOnly={readOnly}
          />
        )}

        {/* Teams and Scores */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
          {/* Home Team */}
          <div className="text-right min-w-0">
            <div className={`font-bold text-sm sm:text-xl mb-2 break-words leading-tight ${isLive ? 'text-red-600 dark:text-red-400' : ''}`}>
              {homeTeamName}
            </div>
            {isEditing || isLive ? (
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={homeScore}
                onChange={(e) => handleScoreChange('home', Number(e.target.value))}
                className="w-16 sm:w-20 ml-auto text-center text-xl sm:text-2xl font-bold h-11"
              />
            ) : (
              <div className="text-3xl sm:text-4xl font-bold text-primary">
                {match.home_score ?? '-'}
              </div>
            )}
          </div>

          {/* VS */}
          <div className="text-center">
            <div className={`text-sm sm:text-2xl font-bold ${isLive ? 'text-red-500 animate-pulse-live' : 'text-muted-foreground'}`}>
              {isLive ? 'EN VIVO' : 'VS'}
            </div>
          </div>

          {/* Away Team */}
          <div className="text-left min-w-0">
            <div className={`font-bold text-sm sm:text-xl mb-2 break-words leading-tight ${isLive ? 'text-red-600 dark:text-red-400' : ''}`}>
              {awayTeamName}
            </div>
            {isEditing || isLive ? (
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={awayScore}
                onChange={(e) => handleScoreChange('away', Number(e.target.value))}
                className="w-16 sm:w-20 text-center text-xl sm:text-2xl font-bold h-11"
              />
            ) : (
              <div className="text-3xl sm:text-4xl font-bold text-primary">
                {match.away_score ?? '-'}
              </div>
            )}
          </div>
        </div>

        {/* Cards Statistics */}
        {(isEditing || isLive) && (
          <div className="border-t pt-3 sm:pt-4">
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Tarjetas</h4>
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              <div className="min-w-0">
                <Label className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 block truncate">{homeTeamName}</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <Label htmlFor="home-yellow" className="text-xs">🟨</Label>
                    <Input id="home-yellow" type="number" min="0" inputMode="numeric" value={homeYellow} onChange={(e) => setHomeYellow(Number(e.target.value))} className="mt-1 h-10 text-center" />
                  </div>
                  <div>
                    <Label htmlFor="home-red" className="text-xs">🟥</Label>
                    <Input id="home-red" type="number" min="0" inputMode="numeric" value={homeRed} onChange={(e) => setHomeRed(Number(e.target.value))} className="mt-1 h-10 text-center" />
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <Label className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 block truncate">{awayTeamName}</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <Label htmlFor="away-yellow" className="text-xs">🟨</Label>
                    <Input id="away-yellow" type="number" min="0" inputMode="numeric" value={awayYellow} onChange={(e) => setAwayYellow(Number(e.target.value))} className="mt-1 h-10 text-center" />
                  </div>
                  <div>
                    <Label htmlFor="away-red" className="text-xs">🟥</Label>
                    <Input id="away-red" type="number" min="0" inputMode="numeric" value={awayRed} onChange={(e) => setAwayRed(Number(e.target.value))} className="mt-1 h-10 text-center" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Read-only cards display */}
        {!isEditing && !isLive && (match.home_yellow_cards > 0 || match.home_red_cards > 0 || match.away_yellow_cards > 0 || match.away_red_cards > 0) && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">{homeTeamName}:</span>
                {match.home_yellow_cards > 0 && <span className="ml-2">🟨 {match.home_yellow_cards}</span>}
                {match.home_red_cards > 0 && <span className="ml-2">🟥 {match.home_red_cards}</span>}
              </div>
              <div>
                <span className="font-medium">{awayTeamName}:</span>
                {match.away_yellow_cards > 0 && <span className="ml-2">🟨 {match.away_yellow_cards}</span>}
                {match.away_red_cards > 0 && <span className="ml-2">🟥 {match.away_red_cards}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 border-t pt-3 sm:pt-4 sm:flex-wrap">
            {match.status === 'scheduled' && (
              <Button 
                onClick={handleStartMatch} 
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white col-span-2 h-11"
              >
                <Play className="w-4 h-4 mr-2" />
                {saving ? 'Iniciando...' : 'Iniciar Partido'}
              </Button>
            )}

            {isLive && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowGoalScorers(true)}
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 h-11"
                >
                  <Goal className="w-4 h-4 mr-2" />
                  Goleadores
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCards(true)}
                  className="h-11"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Tarjetas
                </Button>
                <Button variant="outline" onClick={handleSaveLive} disabled={saving} className="h-11">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button 
                  onClick={handleEndMatch} 
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white h-11"
                >
                  <Square className="w-4 h-4 mr-2" />
                  {saving ? 'Finalizando...' : 'Finalizar'}
                </Button>
              </>
            )}

            {isFinished && !isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleResumeMatch} disabled={saving} className="h-10">
                  <Play className="w-4 h-4 mr-1" />
                  Reanudar
                </Button>
                <Button variant="outline" size="sm" onClick={handleRestartMatch} disabled={saving} className="h-10">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reiniciar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-10">
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowGoalScorers(true)} className="h-10">
                  <Goal className="w-4 h-4 mr-1" />
                  Goles
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCards(true)} className="h-10">
                  <CreditCard className="w-4 h-4 mr-1" />
                  Tarjetas
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { loadMvpData(); setMvpOpen(true); }}
                  className="h-10"
                >
                  <Star className="w-4 h-4 mr-1" />
                  MVP
                </Button>
              </>
            )}

            {isFinished && isEditing && (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving} className="h-11">
                  Cancelar
                </Button>
                <Button onClick={handleSaveFinishedEdit} disabled={saving} className="h-11">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Goal Scorers Dialog */}
      <GoalScorersDialog
        open={showGoalScorers}
        onOpenChange={setShowGoalScorers}
        matchId={match.id}
        homeTeamId={homeTeamId}
        awayTeamId={awayTeamId}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        eventId={effectiveEventId}
        categoryId={match.category_id || undefined}
        homeEventTeamId={(match as any).home_event_team_id}
        awayEventTeamId={(match as any).away_event_team_id}
      />

      <CardManagerDialog
        open={showCards}
        onOpenChange={setShowCards}
        matchId={match.id}
        homeTeamId={homeTeamId}
        awayTeamId={awayTeamId}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        eventId={effectiveEventId}
        categoryId={match.category_id || undefined}
        homeEventTeamId={(match as any).home_event_team_id}
        awayEventTeamId={(match as any).away_event_team_id}
      />

      {/* MVP Dialog */}
      <Dialog open={mvpOpen} onOpenChange={setMvpOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              MVP del Partido
            </DialogTitle>
          </DialogHeader>
          {mvpLoading ? (
            <div className="flex justify-center py-8"><span className="text-muted-foreground">Cargando...</span></div>
          ) : (
            <div className="space-y-4">
              {currentMvp?.player && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">MVP actual</p>
                  <p className="font-bold">{currentMvp.player.name}</p>
                  {currentMvp.photo_url && (
                    <img src={currentMvp.photo_url} alt="MVP" className="w-24 h-24 mx-auto mt-2 rounded-lg object-cover" />
                  )}
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Seleccionar jugador MVP</Label>
                <ScrollArea className="h-48 border rounded-lg p-2 mt-1">
                  <div className="space-y-1">
                    {mvpPlayers.map((player: any) => (
                      <Button
                        key={player.id}
                        variant={selectedMvp === player.id ? 'default' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSelectedMvp(player.id)}
                      >
                        {player.number && <Badge variant="secondary" className="mr-2 text-xs">#{player.number}</Badge>}
                        <span className="truncate">{player.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{player._teamName}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div>
                <Label className="text-sm font-medium">Foto del MVP (opcional)</Label>
                <div className="mt-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => setMvpPhotoFile(e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button onClick={handleSaveMvp} disabled={!selectedMvp || mvpLoading} className="w-full">
                <Star className="w-4 h-4 mr-2" />
                {mvpLoading ? 'Guardando...' : 'Guardar MVP'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};