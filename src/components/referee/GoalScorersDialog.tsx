import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Participant } from '@/types/database';
import { Loader2, Goal, Trash2, Plus } from 'lucide-react';

interface MatchGoal {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string | null;
  minute: number | null;
  is_own_goal: boolean;
  created_at: string;
}

interface GoalScorersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}

export const GoalScorersDialog = ({
  open,
  onOpenChange,
  matchId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: GoalScorersDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homePlayers, setHomePlayers] = useState<Participant[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Participant[]>([]);
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [minute, setMinute] = useState<number | ''>('');

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, matchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load players for both teams
      const [homeData, awayData, goalsData] = await Promise.all([
        supabase.from('participants').select('*').eq('team_id', homeTeamId).order('number'),
        supabase.from('participants').select('*').eq('team_id', awayTeamId).order('number'),
        supabase.from('match_goals').select('*').eq('match_id', matchId).order('minute'),
      ]);

      setHomePlayers((homeData.data || []) as Participant[]);
      setAwayPlayers((awayData.data || []) as Participant[]);
      setGoals((goalsData.data || []) as MatchGoal[]);
    } catch (error) {
      console.error('Error loading goal scorers data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!selectedPlayer) return;
    
    setSaving(true);
    try {
      const teamId = selectedTeam === 'home' ? homeTeamId : awayTeamId;
      
      const { data, error } = await supabase
        .from('match_goals')
        .insert({
          match_id: matchId,
          team_id: teamId,
          player_id: selectedPlayer || null,
          minute: minute || null,
          is_own_goal: false,
        })
        .select()
        .single();

      if (error) throw error;
      
      setGoals([...goals, data as MatchGoal]);
      setSelectedPlayer('');
      setMinute('');
    } catch (error) {
      console.error('Error adding goal:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await supabase.from('match_goals').delete().eq('id', goalId);
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return 'Jugador desconocido';
    const allPlayers = [...homePlayers, ...awayPlayers];
    const player = allPlayers.find(p => p.id === playerId);
    return player ? `${player.number ? `#${player.number} ` : ''}${player.name}` : 'Jugador desconocido';
  };

  const getTeamName = (teamId: string) => {
    return teamId === homeTeamId ? homeTeamName : awayTeamName;
  };

  const currentPlayers = selectedTeam === 'home' ? homePlayers : awayPlayers;
  const homeGoals = goals.filter(g => g.team_id === homeTeamId);
  const awayGoals = goals.filter(g => g.team_id === awayTeamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Goal className="w-5 h-5" />
            Goleadores del Partido
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Goals Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{homeTeamName}</h4>
                <div className="space-y-2">
                  {homeGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin goles</p>
                  ) : (
                    homeGoals.map((goal) => (
                      <div key={goal.id} className="flex items-center justify-between text-sm">
                        <span>
                          ⚽ {getPlayerName(goal.player_id)}
                          {goal.minute && <span className="text-muted-foreground ml-1">({goal.minute}')</span>}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{awayTeamName}</h4>
                <div className="space-y-2">
                  {awayGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin goles</p>
                  ) : (
                    awayGoals.map((goal) => (
                      <div key={goal.id} className="flex items-center justify-between text-sm">
                        <span>
                          ⚽ {getPlayerName(goal.player_id)}
                          {goal.minute && <span className="text-muted-foreground ml-1">({goal.minute}')</span>}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Add New Goal */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Añadir Gol</h4>
              
              {/* Team Selection */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={selectedTeam === 'home' ? 'default' : 'outline'}
                  onClick={() => setSelectedTeam('home')}
                  className="flex-1"
                >
                  {homeTeamName}
                </Button>
                <Button
                  variant={selectedTeam === 'away' ? 'default' : 'outline'}
                  onClick={() => setSelectedTeam('away')}
                  className="flex-1"
                >
                  {awayTeamName}
                </Button>
              </div>

              {/* Player Selection */}
              <div className="space-y-3">
                <Label>Seleccionar Jugador</Label>
                {currentPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay jugadores registrados para este equipo</p>
                ) : (
                  <ScrollArea className="h-40 border rounded-lg p-2">
                    <div className="grid grid-cols-2 gap-2">
                      {currentPlayers.map((player) => (
                        <Button
                          key={player.id}
                          variant={selectedPlayer === player.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedPlayer(player.id)}
                          className="justify-start"
                        >
                          {player.number && <Badge variant="secondary" className="mr-2">#{player.number}</Badge>}
                          {player.name}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Minute Input */}
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="minute">Minuto (opcional)</Label>
                    <Input
                      id="minute"
                      type="number"
                      min="0"
                      max="120"
                      placeholder="Ej: 45"
                      value={minute}
                      onChange={(e) => setMinute(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  <Button
                    onClick={handleAddGoal}
                    disabled={!selectedPlayer || saving}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {saving ? 'Añadiendo...' : 'Añadir Gol'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
