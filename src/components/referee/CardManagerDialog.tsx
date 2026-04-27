import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Participant } from '@/types/database';
import { Loader2, Trash2, Plus } from 'lucide-react';

interface MatchCard {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string | null;
  card_type: 'yellow' | 'red';
  minute: number | null;
}

interface CardManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  eventId?: string;
  categoryId?: string;
  onCardsChanged?: () => void;
}

export const CardManagerDialog = ({
  open,
  onOpenChange,
  matchId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  eventId,
  categoryId,
  onCardsChanged,
}: CardManagerDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homePlayers, setHomePlayers] = useState<Participant[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Participant[]>([]);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow');
  const [minute, setMinute] = useState<number | ''>('');

  useEffect(() => {
    if (open) loadData();
  }, [open, matchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let homeP: Participant[] = [];
      let awayP: Participant[] = [];

      // Load roster players (players + staff)
      if (eventId) {
        let query = supabase
          .from('event_teams')
          .select('id, team_id')
          .eq('event_id', eventId)
          .in('team_id', [homeTeamId, awayTeamId]);
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }
        const { data: eventTeams } = await query;

        if (eventTeams && eventTeams.length > 0) {
          const homeET = eventTeams.find(et => et.team_id === homeTeamId);
          const awayET = eventTeams.find(et => et.team_id === awayTeamId);

          const loadRoster = async (etId: string) => {
            const { data: rosters } = await supabase
              .from('team_rosters')
              .select('participant_id')
              .eq('event_team_id', etId);
            if (rosters && rosters.length > 0) {
              const pIds = rosters.map(r => r.participant_id);
              const { data } = await supabase.from('participants').select('*').in('id', pIds).order('number');
              return (data || []) as Participant[];
            }
            return [];
          };

          if (homeET) homeP = await loadRoster(homeET.id);
          if (awayET) awayP = await loadRoster(awayET.id);
        }
      }

      // No fallback by team_id: only the roster registered for this event + category
      // should appear. Otherwise we would list players from other tournaments/categories.

      const { data: cardsData } = await supabase.from('match_cards').select('*').eq('match_id', matchId).order('minute');

      setHomePlayers(homeP);
      setAwayPlayers(awayP);
      setCards((cardsData || []) as MatchCard[]);
    } catch (error) {
      console.error('Error loading cards data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!selectedPlayer) return;

    setSaving(true);
    try {
      const teamId = selectedTeam === 'home' ? homeTeamId : awayTeamId;
      const { data, error } = await supabase
        .from('match_cards')
        .insert({
          match_id: matchId,
          team_id: teamId,
          player_id: selectedPlayer,
          card_type: cardType,
          minute: minute || null,
        })
        .select()
        .single();

      if (error) throw error;
      setCards([...cards, data as MatchCard]);
      setSelectedPlayer('');
      setMinute('');
      onCardsChanged?.();
    } catch (error) {
      console.error('Error adding card:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await supabase.from('match_cards').delete().eq('id', cardId);
      setCards(cards.filter(c => c.id !== cardId));
      onCardsChanged?.();
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return 'Desconocido';
    const all = [...homePlayers, ...awayPlayers];
    const p = all.find(p => p.id === playerId);
    return p ? `${p.number ? `#${p.number} ` : ''}${p.name}` : 'Desconocido';
  };

  const currentPlayers = selectedTeam === 'home' ? homePlayers : awayPlayers;
  const homeCards = cards.filter(c => c.team_id === homeTeamId);
  const awayCards = cards.filter(c => c.team_id === awayTeamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>🟨🟥 Tarjetas del Partido</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{homeTeamName}</h4>
                <div className="space-y-2">
                  {homeCards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin tarjetas</p>
                  ) : (
                    homeCards.map(card => (
                      <div key={card.id} className="flex items-center justify-between text-sm">
                        <span>
                          {card.card_type === 'yellow' ? '🟨' : '🟥'} {getPlayerName(card.player_id)}
                          {card.minute && <span className="text-muted-foreground ml-1">({card.minute}')</span>}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteCard(card.id)}>
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
                  {awayCards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin tarjetas</p>
                  ) : (
                    awayCards.map(card => (
                      <div key={card.id} className="flex items-center justify-between text-sm">
                        <span>
                          {card.card_type === 'yellow' ? '🟨' : '🟥'} {getPlayerName(card.player_id)}
                          {card.minute && <span className="text-muted-foreground ml-1">({card.minute}')</span>}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteCard(card.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Add Card */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Añadir Tarjeta</h4>

              <div className="flex gap-2 mb-4">
                <Button variant={selectedTeam === 'home' ? 'default' : 'outline'} onClick={() => { setSelectedTeam('home'); setSelectedPlayer(''); }} className="flex-1">
                  {homeTeamName}
                </Button>
                <Button variant={selectedTeam === 'away' ? 'default' : 'outline'} onClick={() => { setSelectedTeam('away'); setSelectedPlayer(''); }} className="flex-1">
                  {awayTeamName}
                </Button>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  variant={cardType === 'yellow' ? 'default' : 'outline'}
                  onClick={() => setCardType('yellow')}
                  className={cardType === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}
                >
                  🟨 Amarilla
                </Button>
                <Button
                  variant={cardType === 'red' ? 'default' : 'outline'}
                  onClick={() => setCardType('red')}
                  className={cardType === 'red' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                >
                  🟥 Roja
                </Button>
              </div>

              <div className="space-y-3">
                <Label>Seleccionar Jugador / Cuerpo Técnico *</Label>
                {currentPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay personas registradas en la plantilla de este equipo</p>
                ) : (
                  <ScrollArea className="h-40 border rounded-lg p-2">
                    <div className="grid grid-cols-2 gap-2">
                      {currentPlayers.map(player => (
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

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="card-minute">Minuto (opcional)</Label>
                    <Input
                      id="card-minute"
                      type="number"
                      min="0"
                      max="120"
                      placeholder="Ej: 35"
                      value={minute}
                      onChange={(e) => setMinute(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  <Button onClick={handleAddCard} disabled={!selectedPlayer || saving} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {saving ? 'Añadiendo...' : 'Añadir Tarjeta'}
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
