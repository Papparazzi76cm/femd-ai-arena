import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Match } from '@/types/tournament';
import { Calendar, MapPin, Save, Play, Square, Check, Goal } from 'lucide-react';
import { MatchTimer } from './MatchTimer';
import { useGoalSound } from '@/hooks/useGoalSound';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import { GoalScorersDialog } from './GoalScorersDialog';

interface MatchCardProps {
  match: Match;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  onUpdate: (matchId: string, updates: Partial<Match>) => Promise<void>;
  readOnly?: boolean;
}

export const MatchCard = ({ 
  match, 
  homeTeamName, 
  awayTeamName,
  homeTeamId,
  awayTeamId,
  onUpdate,
  readOnly = false 
}: MatchCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showGoalScorers, setShowGoalScorers] = useState(false);
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
      });
      setIsEditing(true);
      notifyMatchStarted(homeTeamName, awayTeamName);
    } finally {
      setSaving(false);
    }
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

  const handleScoreChange = (team: 'home' | 'away', newScore: number) => {
    const prevHome = prevScoreRef.current.home;
    const prevAway = prevScoreRef.current.away;
    
    if (team === 'home') {
      setHomeScore(newScore);
      // Check if it's a goal (score increased)
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
      // Update prev scores after save
      prevScoreRef.current = { home: homeScore, away: awayScore };
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

  const canEdit = !readOnly;

  return (
    <Card className={`p-6 ${isLive ? 'border-2 border-red-500 animate-heartbeat' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{getPhaseLabel(match.phase)}</h3>
            {match.group_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {match.group_name}
              </div>
            )}
            {match.match_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(match.match_date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>

        {/* Match Timer for live matches */}
        {isLive && canEdit && (
          <MatchTimer isLive={isLive} />
        )}

        {/* Teams and Scores */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Home Team */}
          <div className="text-right">
            <div className={`font-bold text-xl mb-2 ${isLive ? 'text-red-600 dark:text-red-400' : ''}`}>
              {homeTeamName}
            </div>
            {isEditing || isLive ? (
              <Input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => handleScoreChange('home', Number(e.target.value))}
                className="w-20 ml-auto text-center text-2xl font-bold"
              />
            ) : (
              <div className="text-4xl font-bold text-primary">
                {match.home_score ?? '-'}
              </div>
            )}
          </div>

          {/* VS */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${isLive ? 'text-red-500 animate-pulse-live' : 'text-muted-foreground'}`}>
              {isLive ? 'EN VIVO' : 'VS'}
            </div>
          </div>

          {/* Away Team */}
          <div className="text-left">
            <div className={`font-bold text-xl mb-2 ${isLive ? 'text-red-600 dark:text-red-400' : ''}`}>
              {awayTeamName}
            </div>
            {isEditing || isLive ? (
              <Input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => handleScoreChange('away', Number(e.target.value))}
                className="w-20 text-center text-2xl font-bold"
              />
            ) : (
              <div className="text-4xl font-bold text-primary">
                {match.away_score ?? '-'}
              </div>
            )}
          </div>
        </div>

        {/* Cards Statistics */}
        {(isEditing || isLive) && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-4">Tarjetas</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">{homeTeamName}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="home-yellow" className="text-xs">🟨 Amarillas</Label>
                    <Input
                      id="home-yellow"
                      type="number"
                      min="0"
                      value={homeYellow}
                      onChange={(e) => setHomeYellow(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="home-red" className="text-xs">🟥 Rojas</Label>
                    <Input
                      id="home-red"
                      type="number"
                      min="0"
                      value={homeRed}
                      onChange={(e) => setHomeRed(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-3 block">{awayTeamName}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="away-yellow" className="text-xs">🟨 Amarillas</Label>
                    <Input
                      id="away-yellow"
                      type="number"
                      min="0"
                      value={awayYellow}
                      onChange={(e) => setAwayYellow(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="away-red" className="text-xs">🟥 Rojas</Label>
                    <Input
                      id="away-red"
                      type="number"
                      min="0"
                      value={awayRed}
                      onChange={(e) => setAwayRed(Number(e.target.value))}
                      className="mt-1"
                    />
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
          <div className="flex gap-2 justify-end border-t pt-4 flex-wrap">
            {match.status === 'scheduled' && (
              <Button 
                onClick={handleStartMatch} 
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
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
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                >
                  <Goal className="w-4 h-4 mr-2" />
                  Goleadores
                </Button>
                <Button variant="outline" onClick={handleSaveLive} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button 
                  onClick={handleEndMatch} 
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Square className="w-4 h-4 mr-2" />
                  {saving ? 'Finalizando...' : 'Finalizar Partido'}
                </Button>
              </>
            )}

            {match.status === 'finished' && !readOnly && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Editar Resultado
              </Button>
            )}

            {match.status === 'finished' && isEditing && (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleEndMatch} disabled={saving}>
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
      />
    </Card>
  );
};
