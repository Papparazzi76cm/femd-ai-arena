import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GoalScorersDialog } from '@/components/referee/GoalScorersDialog';
import { CardManagerDialog } from '@/components/referee/CardManagerDialog';
import { 
  Loader2, CheckCircle, XCircle, Calendar, MapPin, Trophy, 
  Play, Square, Save, Goal, Clock, Building2, Phone, Edit2, RotateCcw, Star, Upload, Camera
} from 'lucide-react';

interface AssignmentData {
  assignment: {
    id: string;
    match_id: string;
    mesa_name: string;
    phone: string;
    token: string;
    status: string;
    accepted_at: string | null;
  };
  match: {
    id: string;
    event_id: string;
    home_team_id: string;
    away_team_id: string;
    home_event_team_id: string | null;
    away_event_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    home_yellow_cards: number;
    home_red_cards: number;
    away_yellow_cards: number;
    away_red_cards: number;
    match_date: string | null;
    status: string;
    phase: string;
    group_name: string | null;
    match_duration_minutes: number;
    match_halves: number;
    started_at: string | null;
    category_id: string | null;
  };
  homeTeam: { id: string; name: string; logo_url: string | null } | null;
  awayTeam: { id: string; name: string; logo_url: string | null } | null;
  event: { id: string; title: string; date: string; location: string | null } | null;
  facility: { id: string; name: string; address: string | null; city: string | null } | null;
  field: { id: string; name: string } | null;
  category: { id: string; name: string; age_group: string | null } | null;
}

export const MesaMatchPanel = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AssignmentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editFinishedOpen, setEditFinishedOpen] = useState(false);
  const [goalScorersOpen, setGoalScorersOpen] = useState(false);
  const [cardManagerOpen, setCardManagerOpen] = useState(false);
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mvpPlayers, setMvpPlayers] = useState<any[]>([]);
  const [selectedMvp, setSelectedMvp] = useState<string>('');
  const [currentMvp, setCurrentMvp] = useState<any>(null);
  const [mvpPhotoFile, setMvpPhotoFile] = useState<File | null>(null);
  const [mvpLoading, setMvpLoading] = useState(false);

  // Match control state
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeYellow, setHomeYellow] = useState(0);
  const [homeRed, setHomeRed] = useState(0);
  const [awayYellow, setAwayYellow] = useState(0);
  const [awayRed, setAwayRed] = useState(0);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('mesa-token', {
        body: null,
        method: 'GET',
        headers: {},
      });

      // Since functions.invoke uses POST, we use query params approach differently
      // Let's use fetch directly
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/mesa-token?token=${token}&action=get`,
        {
          method: 'GET',
          headers: {
            'apikey': anonKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || 'Error cargando datos');
        return;
      }

      setData(responseData);
      setHomeScore(responseData.match.home_score ?? 0);
      setAwayScore(responseData.match.away_score ?? 0);
      setHomeYellow(responseData.match.home_yellow_cards ?? 0);
      setHomeRed(responseData.match.home_red_cards ?? 0);
      setAwayYellow(responseData.match.away_yellow_cards ?? 0);
      setAwayRed(responseData.match.away_red_cards ?? 0);
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription for match updates
  useEffect(() => {
    if (!data?.match?.id) return;

    const channel = supabase
      .channel(`mesa-match-${data.match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${data.match.id}`,
        },
        (payload) => {
          const updated = payload.new as AssignmentData['match'];
          setData(prev => prev ? { ...prev, match: updated } : null);
          setHomeScore(updated.home_score ?? 0);
          setAwayScore(updated.away_score ?? 0);
          setHomeYellow(updated.home_yellow_cards ?? 0);
          setHomeRed(updated.home_red_cards ?? 0);
          setAwayYellow(updated.away_yellow_cards ?? 0);
          setAwayRed(updated.away_red_cards ?? 0);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [data?.match?.id]);

  const callAction = async (action: string, body: Record<string, unknown> = {}) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/mesa-token?token=${token}&action=${action}`,
      {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    return response.json();
  };

  const handleAccept = async () => {
    setSaving(true);
    try {
      const result = await callAction('accept');
      if (result.success) {
        toast({ title: '✅ Asignación aceptada', description: 'Ya puedes gestionar el partido' });
        loadData();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      const result = await callAction('reject');
      if (result.success) {
        toast({ title: 'Asignación rechazada', description: 'Has rechazado esta asignación' });
        loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStartMatch = async () => {
    setSaving(true);
    try {
      await callAction('update_match', {
        updates: {
          status: 'in_progress',
          home_score: 0,
          away_score: 0,
          started_at: new Date().toISOString(),
        },
      });
      toast({ title: '⚽ Partido iniciado' });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await callAction('update_match', {
        updates: {
          home_score: homeScore,
          away_score: awayScore,
          home_yellow_cards: homeYellow,
          home_red_cards: homeRed,
          away_yellow_cards: awayYellow,
          away_red_cards: awayRed,
        },
      });
      toast({ title: 'Datos guardados' });
    } finally {
      setSaving(false);
    }
  };

  const handleEndMatch = async () => {
    if (!confirm('¿Seguro que quieres finalizar el partido?')) return;
    setSaving(true);
    try {
      await callAction('update_match', {
        updates: {
          home_score: homeScore,
          away_score: awayScore,
          home_yellow_cards: homeYellow,
          home_red_cards: homeRed,
          away_yellow_cards: awayYellow,
          away_red_cards: awayRed,
          status: 'finished',
        },
      });
      toast({ title: '🏁 Partido finalizado' });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleResumeMatch = async () => {
    setSaving(true);
    try {
      await callAction('update_match', {
        updates: {
          status: 'in_progress',
        },
      });
      toast({ title: '▶️ Partido reanudado' });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleRestartMatch = async () => {
    if (!confirm('¿Seguro que quieres reiniciar el partido desde cero?')) return;
    setSaving(true);
    try {
      await callAction('update_match', {
        updates: {
          status: 'in_progress',
          home_score: 0,
          away_score: 0,
          home_yellow_cards: 0,
          home_red_cards: 0,
          away_yellow_cards: 0,
          away_red_cards: 0,
          started_at: new Date().toISOString(),
        },
      });
      toast({ title: '🔄 Partido reiniciado' });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinishedEdit = async () => {
    setSaving(true);
    try {
      await callAction('update_match', {
        updates: {
          home_score: homeScore,
          away_score: awayScore,
          home_yellow_cards: homeYellow,
          home_red_cards: homeRed,
          away_yellow_cards: awayYellow,
          away_red_cards: awayRed,
        },
      });
      toast({ title: 'Resultado actualizado' });
      setEditFinishedOpen(false);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const loadMvpData = async () => {
    if (!data?.match?.id) return;
    setMvpLoading(true);
    try {
      const homeId = data.homeTeam?.id;
      const awayId = data.awayTeam?.id;
      let homePlayers: any[] = [];
      let awayPlayers: any[] = [];

      // Load roster-filtered players by the exact event team assigned to this match
      if (data.match.event_id && homeId && awayId) {
          const homeETId = data.match.home_event_team_id;
          const awayETId = data.match.away_event_team_id;
          const loadRoster = async (etId: string) => {
            const { data: rosters } = await supabase.from('team_rosters').select('participant_id, jersey_number').eq('event_team_id', etId).eq('roster_role', 'player');
            if (rosters && rosters.length > 0) {
              const { data } = await supabase.from('participants').select('*').in('id', rosters.map(r => r.participant_id));
              const jerseyMap = new Map(rosters.map(r => [r.participant_id, r.jersey_number]));
              return (data || [])
                .map((p: any) => ({ ...p, number: jerseyMap.get(p.id) ?? null }))
                .sort((a: any, b: any) => (a.number ?? 9999) - (b.number ?? 9999));
            }
            return [];
          };

          if (homeETId) homePlayers = await loadRoster(homeETId);
          if (awayETId) awayPlayers = await loadRoster(awayETId);
      }

      // No fallback by team_id: only show players registered in the roster for
      // this event + category, never the full historical club roster.

      const { data: mvpData } = await supabase.from('match_mvps').select('*, player:participants(*)').eq('match_id', data.match.id).maybeSingle();

      setMvpPlayers([
        ...homePlayers.map((p: any) => ({ ...p, _teamName: data.homeTeam?.name })),
        ...awayPlayers.map((p: any) => ({ ...p, _teamName: data.awayTeam?.name })),
      ]);
      if (mvpData) {
        setCurrentMvp(mvpData);
        setSelectedMvp(mvpData.player_id);
      } else {
        setCurrentMvp(null);
        setSelectedMvp('');
      }
    } catch (err) {
      console.error('Error loading MVP data:', err);
    } finally {
      setMvpLoading(false);
    }
  };

  const handleSaveMvp = async () => {
    if (!selectedMvp || !data?.match?.id) return;
    setMvpLoading(true);
    try {
      let photoUrl = currentMvp?.photo_url || null;
      
      // Upload photo if selected
      if (mvpPhotoFile) {
        const ext = mvpPhotoFile.name.split('.').pop();
        const fileName = `mvp/${data.match.id}_${Date.now()}.${ext}`;
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
        await supabase.from('match_mvps').insert({ match_id: data.match.id, player_id: selectedMvp, photo_url: photoUrl });
      }
      toast({ title: '⭐ MVP guardado' });
      setMvpOpen(false);
      loadMvpData();
    } catch (err) {
      console.error('Error saving MVP:', err);
      toast({ title: 'Error', description: 'No se pudo guardar el MVP', variant: 'destructive' });
    } finally {
      setMvpLoading(false);
    }
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      'group': 'Fase de Grupos',
      'round_of_16': 'Dieciseisavos de Final',
      'round_of_8': 'Octavos de Final',
      'quarter_final': 'Cuartos de Final',
      'semi_final': 'Semifinales',
      'final': 'Final',
      'third_place': 'Tercer Puesto',
      'gold_round_of_16': 'Fase Oro - Dieciseisavos',
      'gold_round_of_8': 'Fase Oro - 1/8 de Final',
      'gold_quarter_final': 'Fase Oro - 1/4 de Final',
      'gold_semi_final': 'Fase Oro - Semifinales',
      'gold_third_place': 'Fase Oro - 3er Puesto',
      'gold_final': 'Fase Oro - Final',
      'silver_round_of_16': 'Fase Plata - Dieciseisavos',
      'silver_round_of_8': 'Fase Plata - 1/8 de Final',
      'silver_quarter_final': 'Fase Plata - 1/4 de Final',
      'silver_semi_final': 'Fase Plata - Semifinales',
      'silver_third_place': 'Fase Plata - 3er Puesto',
      'silver_final': 'Fase Plata - Final',
      'bronze_round_of_16': 'Fase Bronce - Dieciseisavos',
      'bronze_round_of_8': 'Fase Bronce - 1/8 de Final',
      'bronze_quarter_final': 'Fase Bronce - 1/4 de Final',
      'bronze_semi_final': 'Fase Bronce - Semifinales',
      'bronze_third_place': 'Fase Bronce - 3er Puesto',
      'bronze_final': 'Fase Bronce - Final',
    };
    return labels[phase] || phase;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando partido...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Enlace no válido</h2>
          <p className="text-muted-foreground">{error || 'No se encontró la asignación'}</p>
        </Card>
      </div>
    );
  }

  const { assignment, match, homeTeam, awayTeam, event, facility, field, category } = data;
  const isLive = match.status === 'in_progress';
  const isFinished = match.status === 'finished';
  const isPending = assignment.status === 'pending';
  const isAccepted = assignment.status === 'accepted';
  const isRejected = assignment.status === 'rejected';

  // Pending: show accept/reject
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="text-center">
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3" />
            <h1 className="text-xl sm:text-2xl font-bold">Asignación de Mesa</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Hola {assignment.mesa_name}, se te ha asignado un partido</p>
          </div>

          <div className="space-y-3 bg-muted/50 rounded-lg p-3 sm:p-4 text-sm">
            {event && (
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold break-words">{event.title}</span>
              </div>
            )}
            {category && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{category.name} {category.age_group && `(${category.age_group})`}</Badge>
              </div>
            )}
            <div className="text-center py-3">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
                <span className="font-bold text-base sm:text-lg break-words">{homeTeam?.name || '?'}</span>
                <span className="text-muted-foreground text-sm">vs</span>
                <span className="font-bold text-base sm:text-lg break-words">{awayTeam?.name || '?'}</span>
              </div>
            </div>
            {facility && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="break-words">{facility.name}{field ? ` - ${field.name}` : ''}</span>
              </div>
            )}
            {facility?.city && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="break-words">{facility.address ? `${facility.address}, ` : ''}{facility.city}</span>
              </div>
            )}
            {match.match_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm">
                  {new Date(match.match_date).toLocaleDateString('es-ES', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
            )}
            {match.match_date && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>
                  {new Date(match.match_date).toLocaleTimeString('es-ES', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Duración: {match.match_duration_minutes} min</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1 h-11"
              disabled={saving}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rechazar
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700"
              disabled={saving}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {saving ? 'Procesando...' : 'Aceptar'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Rejected
  if (isRejected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Asignación rechazada</h2>
          <p className="text-muted-foreground">Has rechazado esta asignación de mesa.</p>
        </Card>
      </div>
    );
  }

  // Accepted: show match panel
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
      {/* Header */}
      <div className={`py-3 sm:py-4 px-3 sm:px-4 text-white ${isLive ? 'bg-gradient-to-r from-red-600 to-orange-600' : isFinished ? 'bg-gradient-to-r from-emerald-600 to-green-600' : 'bg-gradient-to-r from-primary to-blue-600'}`}>
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold">Panel de Mesa</h1>
              <p className="text-xs sm:text-sm opacity-80 truncate">{assignment.mesa_name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isLive && (
                <Badge className="bg-white/20 text-white animate-pulse-live text-xs">
                  <span className="w-2 h-2 bg-white rounded-full mr-1" />
                  EN VIVO
                </Badge>
              )}
              {isFinished && (
                <Badge className="bg-white/20 text-white text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Finalizado
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Match info */}
        <Card className="p-3 sm:p-4">
          <div className="space-y-2 text-xs sm:text-sm">
            {event && <p className="font-semibold text-primary break-words">{event.title}</p>}
            {category && <Badge variant="secondary">{category.name}</Badge>}
            <p className="text-muted-foreground">{getPhaseLabel(match.phase)}{match.group_name && match.phase === 'group' ? ` - Grupo ${match.group_name}` : match.group_name && match.phase !== 'group' ? ` (${match.group_name})` : ''}</p>
            {facility && <p className="text-muted-foreground flex items-start gap-1"><Building2 className="w-3 h-3 mt-0.5 shrink-0" /><span className="break-words">{facility.name}{field ? ` · ${field.name}` : ''}</span></p>}
            {match.match_date && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 shrink-0" />
                {new Date(match.match_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {new Date(match.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </Card>

        {/* Scoreboard */}
        <Card className={`p-3 sm:p-6 ${isLive ? 'border-2 border-red-500' : ''}`}>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            <div className="text-center min-w-0">
              {homeTeam?.logo_url && (
                <img src={homeTeam.logo_url} alt={homeTeam.name} className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 object-contain" />
              )}
              <p className="font-bold text-xs sm:text-sm break-words leading-tight">{homeTeam?.name || '?'}</p>
              {(isLive || (isAccepted && match.status === 'scheduled')) && !isFinished ? (
                <div className="mt-2 flex items-center justify-center gap-1">
                  <Button size="sm" variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 text-lg sm:text-xl p-0" onClick={() => setHomeScore(Math.max(0, homeScore - 1))}>-</Button>
                  <span className="text-2xl sm:text-3xl font-bold w-10 sm:w-12 text-center">{homeScore}</span>
                  <Button size="sm" variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 text-lg sm:text-xl p-0" onClick={() => setHomeScore(homeScore + 1)}>+</Button>
                </div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold mt-2">{match.home_score ?? '-'}</p>
              )}
            </div>

            <div className="text-center">
              <p className={`text-sm sm:text-lg font-bold ${isLive ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
                {isLive ? 'EN VIVO' : isFinished ? 'FINAL' : 'VS'}
              </p>
            </div>

            <div className="text-center min-w-0">
              {awayTeam?.logo_url && (
                <img src={awayTeam.logo_url} alt={awayTeam.name} className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 object-contain" />
              )}
              <p className="font-bold text-xs sm:text-sm break-words leading-tight">{awayTeam?.name || '?'}</p>
              {(isLive || (isAccepted && match.status === 'scheduled')) && !isFinished ? (
                <div className="mt-2 flex items-center justify-center gap-1">
                  <Button size="sm" variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 text-lg sm:text-xl p-0" onClick={() => setAwayScore(Math.max(0, awayScore - 1))}>-</Button>
                  <span className="text-2xl sm:text-3xl font-bold w-10 sm:w-12 text-center">{awayScore}</span>
                  <Button size="sm" variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 text-lg sm:text-xl p-0" onClick={() => setAwayScore(awayScore + 1)}>+</Button>
                </div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold mt-2">{match.away_score ?? '-'}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Cards */}
        {(isLive || (isAccepted && match.status === 'scheduled')) && !isFinished && (
          <Card className="p-3 sm:p-4">
            <h3 className="font-semibold mb-3 text-sm sm:text-base">Tarjetas</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs font-medium block mb-2 truncate">{homeTeam?.name}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">🟨</Label>
                    <Input type="number" min="0" inputMode="numeric" value={homeYellow} onChange={(e) => setHomeYellow(Number(e.target.value))} className="mt-1 h-10 text-center" />
                  </div>
                  <div>
                    <Label className="text-xs">🟥</Label>
                    <Input type="number" min="0" inputMode="numeric" value={homeRed} onChange={(e) => setHomeRed(Number(e.target.value))} className="mt-1 h-10 text-center" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium block mb-2 truncate">{awayTeam?.name}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">🟨</Label>
                    <Input type="number" min="0" inputMode="numeric" value={awayYellow} onChange={(e) => setAwayYellow(Number(e.target.value))} className="mt-1 h-10 text-center" />
                  </div>
                  <div>
                    <Label className="text-xs">🟥</Label>
                    <Input type="number" min="0" inputMode="numeric" value={awayRed} onChange={(e) => setAwayRed(Number(e.target.value))} className="mt-1 h-10 text-center" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Goal scorers button - during live match */}
        {isLive && homeTeam && awayTeam && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="outline" className="h-11" onClick={() => setGoalScorersOpen(true)}>
              <Goal className="w-4 h-4 mr-2" />
              Goleadores
            </Button>
            <Button variant="outline" className="h-11" onClick={() => setCardManagerOpen(true)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Tarjetas
            </Button>
            <Button variant="outline" className="h-11" onClick={() => { loadMvpData(); setMvpOpen(true); }}>
              <Star className="w-4 h-4 mr-2" />
              MVP
            </Button>
          </div>
        )}

        {/* Actions */}
        {!isFinished && isAccepted && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {match.status === 'scheduled' && (
              <Button onClick={handleStartMatch} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                <Play className="w-4 h-4 mr-2" />
                Iniciar Partido
              </Button>
            )}
            {isLive && (
              <>
                <Button variant="outline" onClick={handleSave} disabled={saving} className="flex-1 h-11">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
                <Button onClick={handleEndMatch} className="flex-1 h-11 bg-red-600 hover:bg-red-700" disabled={saving}>
                  <Square className="w-4 h-4 mr-2" />
                  Finalizar
                </Button>
              </>
            )}
          </div>
        )}

        {isFinished && (
          <Card className="p-4 sm:p-6 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 space-y-4">
            <div className="text-center">
              <CheckCircle className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm sm:text-base">Partido finalizado</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                {homeTeam?.name} {match.home_score} - {match.away_score} {awayTeam?.name}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:justify-center">
              <Button variant="outline" size="sm" onClick={handleResumeMatch} disabled={saving} className="h-10">
                <Play className="w-4 h-4 mr-1" />
                Reanudar
              </Button>
              <Button variant="outline" size="sm" onClick={handleRestartMatch} disabled={saving} className="h-10">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reiniciar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditFinishedOpen(true)} className="h-10 col-span-2 sm:col-span-1">
                <Edit2 className="w-4 h-4 mr-1" />
                Editar resultado
              </Button>
              {homeTeam && awayTeam && (
                <Button variant="outline" size="sm" onClick={() => setGoalScorersOpen(true)} className="h-10">
                  <Goal className="w-4 h-4 mr-1" />
                  Goleadores
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { loadMvpData(); setMvpOpen(true); }} className="h-10">
                <Star className="w-4 h-4 mr-1" />
                MVP
              </Button>
            </div>
          </Card>
        )}

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
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
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
                      capture="environment"
                      onChange={e => setMvpPhotoFile(e.target.files?.[0] || null)}
                      className="text-sm"
                    />
                    {mvpPhotoFile && (
                      <p className="text-xs text-muted-foreground mt-1">📷 {mvpPhotoFile.name}</p>
                    )}
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

        {/* Edit finished match dialog */}
        <Dialog open={editFinishedOpen} onOpenChange={setEditFinishedOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Resultado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Label className="text-sm font-bold">{homeTeam?.name}</Label>
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label className="text-xs">Goles</Label>
                      <Input type="number" min="0" value={homeScore} onChange={e => setHomeScore(Number(e.target.value))} className="text-center" />
                    </div>
                    <div>
                      <Label className="text-xs">🟨</Label>
                      <Input type="number" min="0" value={homeYellow} onChange={e => setHomeYellow(Number(e.target.value))} className="text-center" />
                    </div>
                    <div>
                      <Label className="text-xs">🟥</Label>
                      <Input type="number" min="0" value={homeRed} onChange={e => setHomeRed(Number(e.target.value))} className="text-center" />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <Label className="text-sm font-bold">{awayTeam?.name}</Label>
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label className="text-xs">Goles</Label>
                      <Input type="number" min="0" value={awayScore} onChange={e => setAwayScore(Number(e.target.value))} className="text-center" />
                    </div>
                    <div>
                      <Label className="text-xs">🟨</Label>
                      <Input type="number" min="0" value={awayYellow} onChange={e => setAwayYellow(Number(e.target.value))} className="text-center" />
                    </div>
                    <div>
                      <Label className="text-xs">🟥</Label>
                      <Input type="number" min="0" value={awayRed} onChange={e => setAwayRed(Number(e.target.value))} className="text-center" />
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveFinishedEdit} disabled={saving} className="w-full">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Goal scorers dialog */}
        {homeTeam && awayTeam && (
          <GoalScorersDialog
            open={goalScorersOpen}
            onOpenChange={setGoalScorersOpen}
            matchId={match.id}
            homeTeamId={homeTeam.id}
            awayTeamId={awayTeam.id}
            homeTeamName={homeTeam.name}
            awayTeamName={awayTeam.name}
            eventId={match.event_id}
            categoryId={match.category_id || undefined}
          />
        )}
      </div>
    </div>
  );
};
