import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Participant, Team } from '@/types/database';
import { participantService } from '@/services/participantService';
import { playerHistoryService } from '@/services/playerHistoryService';
import { Search, ArrowRightLeft, Check } from 'lucide-react';

interface PlayerTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant;
  teams: Team[];
  onSuccess: () => void;
}

export const PlayerTransferDialog = ({ open, onOpenChange, participant, teams, onSuccess }: PlayerTransferDialogProps) => {
  const [search, setSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const currentTeam = teams.find(t => t.id === participant.team_id);

  // Filter teams: exclude current team, only show main clubs (no filials filtered out - show all)
  const filteredTeams = useMemo(() => {
    return teams
      .filter(t => t.id !== participant.team_id)
      .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  }, [teams, participant.team_id, search]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const handleTransfer = async () => {
    if (!selectedTeamId) return;
    setLoading(true);
    try {
      // 1. Close current team history if exists
      if (participant.team_id) {
        await playerHistoryService.closeCurrentTeam(
          participant.id,
          participant.team_id,
          new Date().toISOString().split('T')[0]
        );
      }

      // 2. Create new history entry
      await playerHistoryService.create({
        player_id: participant.id,
        team_id: selectedTeamId,
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        category: null,
        season: null,
        matches_played: 0,
        goals_scored: 0,
        yellow_cards: 0,
        red_cards: 0,
        notes: `Traspaso desde ${currentTeam?.name || 'Sin equipo'}`
      });

      // 3. Update participant's current team
      await participantService.update(participant.id, { team_id: selectedTeamId });

      toast({ title: 'Traspaso realizado', description: `${participant.name} ahora pertenece a ${selectedTeam?.name}` });
      onSuccess();
      onOpenChange(false);
      setSearch('');
      setSelectedTeamId(null);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo realizar el traspaso', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSearch(''); setSelectedTeamId(null); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
            Traspaso de {participant.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Club actual: <strong>{currentTeam?.name || 'Sin equipo'}</strong>
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar club de destino..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[200px] border rounded-md">
            {filteredTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No se encontraron clubes</p>
            ) : (
              <div className="p-1">
                {filteredTeams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                      selectedTeamId === team.id
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {team.logo_url && (
                      <img src={team.logo_url} alt="" className="w-6 h-6 object-contain rounded" />
                    )}
                    <span className="flex-1 truncate">{team.name}</span>
                    {selectedTeamId === team.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedTeam && (
            <p className="text-sm text-center bg-muted p-2 rounded-md">
              <span className="text-muted-foreground">{currentTeam?.name || 'Sin equipo'}</span>
              {' → '}
              <strong className="text-emerald-600">{selectedTeam.name}</strong>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedTeamId || loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Procesando...' : 'Confirmar Traspaso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
