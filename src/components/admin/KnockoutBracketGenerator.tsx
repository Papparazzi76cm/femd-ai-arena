import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from '@/services/tournamentService';
import { EventTeam, Match } from '@/types/tournament';
import { Team, EventCategory } from '@/types/database';
import { AlertTriangle, Plus, Trash2, Swords, Link2, ChevronRight, Check } from 'lucide-react';

interface KnockoutBracketGeneratorProps {
  eventId: string;
  eventTeams: EventTeam[];
  matches: Match[];
  teams: Team[];
  eventCategories: EventCategory[];
  eventFacilities: any[];
  onMatchesCreated: () => void;
}

interface BracketPairing {
  id: string;
  name: string; // O1, O2, C1, C2, S1, F1...
  homePosition: string;
  awayPosition: string;
  phase: string;
  categoryId: string;
  fieldId: string;
  matchDate: string;
  matchHalves: number;
  matchDuration: number; // duration per half
}

// Phase tiers
const PHASE_TIERS = [
  { value: 'gold', label: 'Fase Oro' },
  { value: 'silver', label: 'Fase Plata' },
  { value: 'bronze', label: 'Fase Bronce' },
];

// Round types
const ROUND_TYPES = [
  { value: 'round_of_16', label: '1/16 de Final', prefix: 'D', defaultCount: 16 },
  { value: 'round_of_8', label: '1/8 de Final', prefix: 'O', defaultCount: 8 },
  { value: 'quarter_final', label: '1/4 de Final', prefix: 'C', defaultCount: 4 },
  { value: 'semi_final', label: 'Semifinales', prefix: 'S', defaultCount: 2 },
  { value: 'final', label: 'Final', prefix: 'F', defaultCount: 1 },
];

function getDbPhase(tier: string, round: string): string {
  if (tier === 'gold') return `gold_${round}`;
  if (tier === 'silver') return `silver_${round}`;
  if (tier === 'bronze') return `bronze_${round}`;
  return round;
}

// Get subsequent rounds from current one
function getSubsequentRounds(currentRound: string): typeof ROUND_TYPES {
  const idx = ROUND_TYPES.findIndex(r => r.value === currentRound);
  if (idx === -1) return [];
  return ROUND_TYPES.slice(idx + 1);
}

function getRoundPrefix(round: string): string {
  return ROUND_TYPES.find(r => r.value === round)?.prefix || 'P';
}

function getRoundLabel(round: string): string {
  return ROUND_TYPES.find(r => r.value === round)?.label || round;
}

// Phase display labels for existing matches
const PHASE_OPTIONS: Record<string, string> = {
  'round_of_16': 'Dieciseisavos',
  'round_of_8': 'Octavos',
  'quarter_final': 'Cuartos',
  'semi_final': 'Semifinales',
  'third_place': 'Tercer Puesto',
  'final': 'Final',
  'gold_round_of_16': 'Oro - Dieciseisavos',
  'gold_round_of_8': 'Oro - Octavos',
  'gold_quarter_final': 'Oro - Cuartos',
  'gold_semi_final': 'Oro - Semifinales',
  'gold_third_place': 'Oro - 3er Puesto',
  'gold_final': 'Oro - Final',
  'silver_round_of_16': 'Plata - Dieciseisavos',
  'silver_round_of_8': 'Plata - Octavos',
  'silver_quarter_final': 'Plata - Cuartos',
  'silver_semi_final': 'Plata - Semifinales',
  'silver_third_place': 'Plata - 3er Puesto',
  'silver_final': 'Plata - Final',
  'bronze_round_of_16': 'Bronce - Dieciseisavos',
  'bronze_round_of_8': 'Bronce - Octavos',
  'bronze_quarter_final': 'Bronce - Cuartos',
  'bronze_semi_final': 'Bronce - Semifinales',
  'bronze_third_place': 'Bronce - 3er Puesto',
  'bronze_final': 'Bronce - Final',
};

function positionToLabel(posKey: string): string {
  if (!posKey) return '';
  const [type, rest] = posKey.split(':');
  if (type === 'group') {
    const [group, pos] = rest.split('-');
    return `${pos}º Grupo ${group}`;
  }
  if (type === 'best') {
    const [rank, pos] = rest.split('-');
    const ordinal = rank === '1' ? '1er' : `${rank}º`;
    return `${ordinal} Mejor ${pos}º`;
  }
  if (type === 'winner') return `Ganador ${rest}`;
  if (type === 'loser') return `Perdedor ${rest}`;
  return posKey;
}

export const KnockoutBracketGenerator = ({
  eventId,
  eventTeams,
  matches,
  teams,
  eventCategories,
  eventFacilities,
  onMatchesCreated,
}: KnockoutBracketGeneratorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('__all__');

  // Step 1: Configuration
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [matchCount, setMatchCount] = useState<number>(0);
  const [pairings, setPairings] = useState<BracketPairing[]>([]);
  const [pairingsGenerated, setPairingsGenerated] = useState(false);

  // Step 2: After first round created, subsequent rounds
  const [pendingRounds, setPendingRounds] = useState<{ round: string; count: number }[]>([]);
  const [currentPendingRoundIdx, setCurrentPendingRoundIdx] = useState(-1);
  
  // Track all bracket names created in this wizard session (persists across round generations)
  const [sessionCreatedBrackets, setSessionCreatedBrackets] = useState<{ name: string; tier: string; round: string; phase: string }[]>([]);

  // Filter teams by category
  const filteredTeams = useMemo(() => {
    if (selectedCategoryFilter === '__all__') return eventTeams;
    return eventTeams.filter(et => et.category_id === selectedCategoryFilter);
  }, [eventTeams, selectedCategoryFilter]);

  // Group teams by group_name, sorted by standings
  const groupedStandings = useMemo(() => {
    const groups: Record<string, EventTeam[]> = {};
    filteredTeams.forEach(et => {
      const group = et.group_name || 'Sin grupo';
      if (!groups[group]) groups[group] = [];
      groups[group].push(et);
    });
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        return b.goals_for - a.goals_for;
      });
    });
    return groups;
  }, [filteredTeams]);

  const sortedGroupNames = useMemo(() => {
    return Object.keys(groupedStandings).filter(g => g !== 'Sin grupo').sort();
  }, [groupedStandings]);

  // Existing knockout matches (for winner/loser references)
  const knockoutMatches = useMemo(() => {
    return matches.filter(m => m.phase !== 'group' && !m.phase?.startsWith('Jornada'));
  }, [matches]);

  // Build position options
  const positionOptions = useMemo(() => {
    const options: { value: string; label: string; currentTeam?: string }[] = [];

    sortedGroupNames.forEach(group => {
      const teamsInGroup = groupedStandings[group];
      teamsInGroup.forEach((et, index) => {
        const team = teams.find(t => t.id === et.team_id);
        const teamName = et.team_letter ? `${team?.name} ${et.team_letter}` : (team?.name || '?');
        options.push({
          value: `group:${group}-${index + 1}`,
          label: `${index + 1}º Grupo ${group}`,
          currentTeam: teamName,
        });
      });
    });

    if (sortedGroupNames.length > 1) {
      const maxTeamsPerGroup = Math.max(...sortedGroupNames.map(g => groupedStandings[g].length));
      for (let pos = 1; pos <= maxTeamsPerGroup; pos++) {
        const numGroups = sortedGroupNames.length;
        for (let rank = 1; rank <= numGroups; rank++) {
          const ordinal = rank === 1 ? '1er' : `${rank}º`;
          options.push({
            value: `best:${rank}-${pos}`,
            label: `${ordinal} Mejor ${pos}º`,
          });
        }
      }
    }

    // Also include pairings being created (for subsequent rounds referencing this batch)
    // Plus existing knockout matches — use group_name (bracket name like O1, C1) if available
    knockoutMatches.forEach(m => {
      const matchLabel = m.group_name || (m.match_number ? `P${m.match_number}` : m.id.slice(0, 4));
      const phaseLabel = PHASE_OPTIONS[m.phase] || m.phase;
      options.push({ value: `winner:${matchLabel}`, label: `Ganador ${matchLabel} (${phaseLabel})` });
      options.push({ value: `loser:${matchLabel}`, label: `Perdedor ${matchLabel} (${phaseLabel})` });
    });

    return options;
  }, [sortedGroupNames, groupedStandings, teams, knockoutMatches]);

  // Dynamic options that include current batch pairings (for subsequent round references)
  const allPositionOptions = useMemo(() => {
    const extra: { value: string; label: string }[] = [];
    pairings.forEach(p => {
      if (p.name) {
        const tierLabel = selectedTier === 'gold' ? 'Oro' : selectedTier === 'silver' ? 'Plata' : selectedTier === 'bronze' ? 'Bronce' : '';
        const roundLabel = getRoundLabel(selectedRound);
        const fullLabel = tierLabel ? `${tierLabel} ${roundLabel}` : roundLabel;
        extra.push({ value: `winner:${p.name}`, label: `Ganador ${p.name} (${fullLabel})` });
        extra.push({ value: `loser:${p.name}`, label: `Perdedor ${p.name} (${fullLabel})` });
      }
    });
    return [...positionOptions, ...extra];
  }, [positionOptions, pairings, selectedTier, selectedRound]);

  const allFields = eventFacilities.flatMap((ef: any) =>
    (ef.facility?.fields || []).map((f: any) => ({
      ...f,
      facilityName: ef.facility?.name || '',
    }))
  );

  // When round/count changes, update default count
  const handleRoundChange = (round: string) => {
    setSelectedRound(round);
    const defaultCount = ROUND_TYPES.find(r => r.value === round)?.defaultCount || 4;
    setMatchCount(defaultCount);
    setPairings([]);
    setPairingsGenerated(false);
  };

  // Generate empty pairings based on config
  const handleCreatePairings = () => {
    if (!selectedTier || !selectedRound || matchCount < 1) {
      toast({ title: 'Error', description: 'Selecciona fase, ronda y número de partidos', variant: 'destructive' });
      return;
    }

    const prefix = getRoundPrefix(selectedRound);
    const dbPhase = getDbPhase(selectedTier, selectedRound);
    const newPairings: BracketPairing[] = [];

    for (let i = 1; i <= matchCount; i++) {
      newPairings.push({
        id: crypto.randomUUID(),
        name: `${prefix}${i}`,
        homePosition: '',
        awayPosition: '',
        phase: dbPhase,
        categoryId: selectedCategoryFilter !== '__all__' ? selectedCategoryFilter : '',
        fieldId: '',
        matchDate: '',
        matchHalves: 1,
        matchDuration: 30,
      });
    }

    setPairings(newPairings);
    setPairingsGenerated(true);
  };

  const updatePairing = (id: string, updates: Partial<BracketPairing>) => {
    setPairings(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePairing = (id: string) => {
    setPairings(prev => prev.filter(p => p.id !== id));
  };

  // Validate all pairings are complete
  const allPairingsComplete = pairings.length > 0 && pairings.every(p =>
    p.homePosition && p.awayPosition && p.matchDate && p.fieldId && p.matchDuration > 0
  );

  // Check for duplicate positions
  const hasDuplicatePositions = pairings.some(p => p.homePosition && p.homePosition === p.awayPosition);

  const handleGenerateMatches = async () => {
    if (!allPairingsComplete) {
      toast({ title: 'Error', description: 'Completa todos los campos de cada cruce antes de generar', variant: 'destructive' });
      return;
    }
    if (hasDuplicatePositions) {
      toast({ title: 'Error', description: 'Un cruce no puede tener la misma posición en ambos lados', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      let created = 0;
      const createdNames: string[] = [];

      for (const pairing of pairings) {
        const homePlaceholder = positionToLabel(pairing.homePosition);
        const awayPlaceholder = positionToLabel(pairing.awayPosition);
        const totalDuration = pairing.matchHalves * pairing.matchDuration;

        // Check schedule conflict
        if (pairing.matchDate && pairing.fieldId) {
          try {
            const conflicts = await tournamentService.checkScheduleConflict(
              eventId,
              pairing.fieldId,
              new Date(pairing.matchDate).toISOString(),
              totalDuration
            );
            if (conflicts.length > 0) {
              const fieldName = allFields.find((f: any) => f.id === pairing.fieldId);
              toast({
                title: 'Conflicto de horario',
                description: `El cruce ${pairing.name} tiene conflicto en ${fieldName?.facilityName} → ${fieldName?.name} a esa hora. Ya hay un partido programado.`,
                variant: 'destructive',
              });
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Error checking conflict:', err);
          }
        }

        const matchData: any = {
          event_id: eventId,
          home_team_id: null,
          away_team_id: null,
          home_placeholder: homePlaceholder,
          away_placeholder: awayPlaceholder,
          phase: pairing.phase,
          group_name: pairing.name, // Store bracket name (O1, C1, S1, F1) for reference
          status: 'scheduled',
          match_halves: pairing.matchHalves,
          match_duration_minutes: pairing.matchDuration,
          match_date: new Date(pairing.matchDate).toISOString(),
          field_id: pairing.fieldId,
          match_number: matches.length + created + 1,
        };
        if (pairing.categoryId) matchData.category_id = pairing.categoryId;

        await tournamentService.createMatch(matchData);
        createdNames.push(pairing.name);
        created++;
      }

      toast({ title: '¡Cruces generados!', description: `Se crearon ${created} partidos: ${createdNames.join(', ')}` });

      // Now prompt for subsequent rounds
      const subsequentRounds = getSubsequentRounds(selectedRound);
      if (subsequentRounds.length > 0) {
        // Build default counts for subsequent rounds
        const pending = subsequentRounds.map(r => ({
          round: r.value,
          count: Math.max(1, Math.ceil(matchCount / 2)),
        }));
        // Adjust counts: each subsequent round halves
        let prevCount = matchCount;
        for (let i = 0; i < pending.length; i++) {
          const nextCount = Math.max(1, Math.ceil(prevCount / 2));
          pending[i].count = nextCount;
          prevCount = nextCount;
        }
        setPendingRounds(pending);
        setCurrentPendingRoundIdx(0);

        // Generate next round pairings with defaults
        generateNextRoundPairings(pending[0], createdNames);
      } else {
        // No more rounds, reset
        resetAll();
      }

      onMatchesCreated();
    } catch (error) {
      console.error('Error generando cruces:', error);
      toast({ title: 'Error', description: 'No se pudieron crear los cruces', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateNextRoundPairings = (
    roundConfig: { round: string; count: number },
    previousNames: string[]
  ) => {
    const prefix = getRoundPrefix(roundConfig.round);
    const dbPhase = getDbPhase(selectedTier, roundConfig.round);
    const newPairings: BracketPairing[] = [];

    for (let i = 1; i <= roundConfig.count; i++) {
      // Default: pair winners of previous round sequentially
      const homeIdx = (i - 1) * 2;
      const awayIdx = (i - 1) * 2 + 1;
      const homeName = previousNames[homeIdx] || '';
      const awayName = previousNames[awayIdx] || '';

      newPairings.push({
        id: crypto.randomUUID(),
        name: `${prefix}${i}`,
        homePosition: homeName ? `winner:${homeName}` : '',
        awayPosition: awayName ? `winner:${awayName}` : '',
        phase: dbPhase,
        categoryId: selectedCategoryFilter !== '__all__' ? selectedCategoryFilter : '',
        fieldId: '',
        matchDate: '',
        matchHalves: 1,
        matchDuration: 30,
      });
    }

    setPairings(newPairings);
    setPairingsGenerated(true);
    setSelectedRound(roundConfig.round);
    setMatchCount(roundConfig.count);
  };

  const handleGenerateNextRound = async () => {
    // Same as handleGenerateMatches but for subsequent rounds
    if (!allPairingsComplete) {
      toast({ title: 'Error', description: 'Completa todos los campos de cada cruce', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      let created = 0;
      const createdNames: string[] = [];

      for (const pairing of pairings) {
        const homePlaceholder = positionToLabel(pairing.homePosition);
        const awayPlaceholder = positionToLabel(pairing.awayPosition);
        const totalDuration = pairing.matchHalves * pairing.matchDuration;

        if (pairing.matchDate && pairing.fieldId) {
          try {
            const conflicts = await tournamentService.checkScheduleConflict(
              eventId,
              pairing.fieldId,
              new Date(pairing.matchDate).toISOString(),
              totalDuration
            );
            if (conflicts.length > 0) {
              const fieldName = allFields.find((f: any) => f.id === pairing.fieldId);
              toast({
                title: 'Conflicto de horario',
                description: `El cruce ${pairing.name} tiene conflicto en ${fieldName?.facilityName} → ${fieldName?.name}. Ya hay un partido programado.`,
                variant: 'destructive',
              });
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Error checking conflict:', err);
          }
        }

        const matchData: any = {
          event_id: eventId,
          home_team_id: null,
          away_team_id: null,
          home_placeholder: homePlaceholder,
          away_placeholder: awayPlaceholder,
          phase: pairing.phase,
          group_name: pairing.name, // Store bracket name for reference
          status: 'scheduled',
          match_halves: pairing.matchHalves,
          match_duration_minutes: pairing.matchDuration,
          match_date: new Date(pairing.matchDate).toISOString(),
          field_id: pairing.fieldId,
          match_number: matches.length + created + 1,
        };
        if (pairing.categoryId) matchData.category_id = pairing.categoryId;

        await tournamentService.createMatch(matchData);
        createdNames.push(pairing.name);
        created++;
      }

      toast({ title: '¡Ronda generada!', description: `Se crearon ${created} partidos: ${createdNames.join(', ')}` });

      // Check if more rounds pending
      const nextIdx = currentPendingRoundIdx + 1;
      if (nextIdx < pendingRounds.length) {
        setCurrentPendingRoundIdx(nextIdx);
        generateNextRoundPairings(pendingRounds[nextIdx], createdNames);
      } else {
        resetAll();
        toast({ title: '¡Cuadro completo!', description: 'Se han generado todas las rondas eliminatorias.' });
      }

      onMatchesCreated();
    } catch (error) {
      console.error('Error generando ronda:', error);
      toast({ title: 'Error', description: 'No se pudo crear la ronda', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setPairings([]);
    setPairingsGenerated(false);
    setSelectedTier('');
    setSelectedRound('');
    setMatchCount(0);
    setPendingRounds([]);
    setCurrentPendingRoundIdx(-1);
  };

  // Update pending round count
  const updatePendingRoundCount = (idx: number, count: number) => {
    setPendingRounds(prev => prev.map((r, i) => i === idx ? { ...r, count } : r));
  };

  if (sortedGroupNames.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          <Swords className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay grupos definidos</p>
          <p className="text-sm mt-1">Asigna equipos a grupos en la pestaña "Clubes" para poder generar cruces eliminatorios.</p>
        </div>
      </Card>
    );
  }

  const tierLabel = selectedTier === 'gold' ? 'Oro' : selectedTier === 'silver' ? 'Plata' : selectedTier === 'bronze' ? 'Bronce' : '';
  const isInSubsequentRound = currentPendingRoundIdx >= 0;

  return (
    <div className="space-y-6">
      {/* Standings overview */}
      <Card className="p-4">
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Generador de Cruces Eliminatorios
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configura la fase, ronda y número de partidos. Los cruces se crean con <strong>placeholders</strong> que se resolverán al terminar la fase de grupos.
        </p>

        {/* Category filter */}
        {eventCategories.length > 0 && (
          <div className="mb-4 max-w-xs">
            <Label className="text-xs">Filtrar por categoría</Label>
            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las categorías</SelectItem>
                {eventCategories.map(ec => (
                  <SelectItem key={ec.id} value={ec.id}>
                    {ec.category?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mini standings per group */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {sortedGroupNames.map(group => (
            <div key={group} className="border rounded-lg p-2 bg-muted/30">
              <div className="font-semibold text-sm mb-1 text-center">Grupo {group}</div>
              <div className="space-y-0.5">
                {groupedStandings[group].map((et, idx) => {
                  const team = teams.find(t => t.id === et.team_id);
                  const name = et.team_letter ? `${team?.name} ${et.team_letter}` : (team?.name || '?');
                  return (
                    <div key={et.id} className={`text-xs flex justify-between px-1 py-0.5 rounded ${idx < 2 ? 'bg-green-500/10 font-medium' : ''}`}>
                      <span className="truncate">{idx + 1}º {name}</span>
                      <span className="text-muted-foreground ml-1">{et.points}pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Step 1: Configuration dropdowns */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">
          {isInSubsequentRound
            ? `Ronda siguiente: ${tierLabel} ${getRoundLabel(selectedRound)}`
            : 'Configurar ronda eliminatoria'
          }
        </h4>

        {!isInSubsequentRound && (
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div className="min-w-[160px]">
              <Label className="text-xs">Fase <span className="text-destructive">*</span></Label>
              <Select value={selectedTier} onValueChange={v => { setSelectedTier(v); setPairings([]); setPairingsGenerated(false); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {PHASE_TIERS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px]">
              <Label className="text-xs">Ronda <span className="text-destructive">*</span></Label>
              <Select value={selectedRound} onValueChange={handleRoundChange}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {ROUND_TYPES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[120px]">
              <Label className="text-xs">Nº partidos <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                className="h-9"
                min={1}
                max={32}
                value={matchCount || ''}
                onChange={e => { setMatchCount(parseInt(e.target.value) || 0); setPairings([]); setPairingsGenerated(false); }}
              />
            </div>
            <Button
              size="sm"
              onClick={handleCreatePairings}
              disabled={!selectedTier || !selectedRound || matchCount < 1}
            >
              <Plus className="w-4 h-4 mr-1" />
              Añadir cruces
            </Button>
          </div>
        )}

        {/* For subsequent rounds, show count editor */}
        {isInSubsequentRound && currentPendingRoundIdx < pendingRounds.length && (
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div className="w-[120px]">
              <Label className="text-xs">Nº partidos en esta ronda</Label>
              <Input
                type="number"
                className="h-9"
                min={1}
                max={32}
                value={pendingRounds[currentPendingRoundIdx]?.count || 1}
                onChange={e => {
                  const count = parseInt(e.target.value) || 1;
                  updatePendingRoundCount(currentPendingRoundIdx, count);
                  // Regenerate pairings with new count
                  const prevNames = pairings.map(p => p.name);
                  // Can't easily get previous names here, just regenerate with generic
                  const prefix = getRoundPrefix(pendingRounds[currentPendingRoundIdx].round);
                  const dbPhase = getDbPhase(selectedTier, pendingRounds[currentPendingRoundIdx].round);
                  const newPairings: BracketPairing[] = [];
                  for (let i = 1; i <= count; i++) {
                    const existing = pairings[i - 1];
                    newPairings.push({
                      id: existing?.id || crypto.randomUUID(),
                      name: `${prefix}${i}`,
                      homePosition: existing?.homePosition || '',
                      awayPosition: existing?.awayPosition || '',
                      phase: dbPhase,
                      categoryId: selectedCategoryFilter !== '__all__' ? selectedCategoryFilter : '',
                      fieldId: existing?.fieldId || '',
                      matchDate: existing?.matchDate || '',
                      matchHalves: existing?.matchHalves || 1,
                      matchDuration: existing?.matchDuration || 30,
                    });
                  }
                  setPairings(newPairings);
                  setMatchCount(count);
                }}
              />
            </div>
            <Badge variant="outline" className="mb-2">
              {tierLabel} — {getRoundLabel(pendingRounds[currentPendingRoundIdx]?.round)}
            </Badge>
          </div>
        )}

        {/* Pairings list */}
        {pairingsGenerated && pairings.length > 0 && (
          <div className="space-y-4">
            {pairings.map((pairing) => (
              <div key={pairing.id} className="border rounded-lg p-3 space-y-3 bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="text-sm font-bold">{pairing.name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {tierLabel} — {getRoundLabel(selectedRound)}
                    </span>
                  </div>
                  {!isInSubsequentRound && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePairing(pairing.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Team selection */}
                <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
                  <div>
                    <Label className="text-xs">Local <span className="text-destructive">*</span></Label>
                    <Select value={pairing.homePosition} onValueChange={v => updatePairing(pairing.id, { homePosition: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <PositionOptionsList options={allPositionOptions} excludePairingNames={pairings.map(p => p.name)} currentPairingName={pairing.name} />
                      </SelectContent>
                    </Select>
                    {pairing.homePosition && (
                      <p className="text-xs font-medium text-primary mt-0.5 truncate">
                        → {positionToLabel(pairing.homePosition)}
                      </p>
                    )}
                  </div>
                  <div className="text-muted-foreground font-bold text-lg pb-2">vs</div>
                  <div>
                    <Label className="text-xs">Visitante <span className="text-destructive">*</span></Label>
                    <Select value={pairing.awayPosition} onValueChange={v => updatePairing(pairing.id, { awayPosition: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <PositionOptionsList options={allPositionOptions} excludePairingNames={pairings.map(p => p.name)} currentPairingName={pairing.name} />
                      </SelectContent>
                    </Select>
                    {pairing.awayPosition && (
                      <p className="text-xs font-medium text-primary mt-0.5 truncate">
                        → {positionToLabel(pairing.awayPosition)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {pairing.homePosition && pairing.awayPosition && (
                  <div className="bg-muted/50 rounded p-2 text-center text-sm font-semibold flex items-center justify-center gap-2">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    {pairing.name}: {positionToLabel(pairing.homePosition)} — {positionToLabel(pairing.awayPosition)}
                  </div>
                )}

                {/* Match details */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <Label className="text-xs">Campo <span className="text-destructive">*</span></Label>
                    <Select value={pairing.fieldId || '__none__'} onValueChange={v => updatePairing(pairing.id, { fieldId: v === '__none__' ? '' : v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Campo..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled>Seleccionar...</SelectItem>
                        {eventFacilities.map((ef: any) =>
                          ef.facility?.fields?.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>
                              {ef.facility?.name} → {f.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Fecha/Hora <span className="text-destructive">*</span></Label>
                    <Input
                      type="datetime-local"
                      className="h-9 text-xs"
                      value={pairing.matchDate}
                      onChange={e => updatePairing(pairing.id, { matchDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Partes</Label>
                    <Select
                      value={String(pairing.matchHalves)}
                      onValueChange={v => updatePairing(pairing.id, { matchHalves: parseInt(v) })}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 parte</SelectItem>
                        <SelectItem value="2">2 partes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Duración/parte (min)</Label>
                    <Input
                      type="number"
                      className="h-9"
                      min={5}
                      max={120}
                      value={pairing.matchDuration}
                      onChange={e => updatePairing(pairing.id, { matchDuration: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <div className="h-9 flex items-center text-sm font-medium text-muted-foreground">
                      {pairing.matchHalves * pairing.matchDuration} min
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generate button */}
        {pairingsGenerated && pairings.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {allPairingsComplete ? (
                <span className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Todos los cruces completos</span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Completa todos los campos obligatorios</span>
              )}
            </div>
            <Button
              onClick={isInSubsequentRound ? handleGenerateNextRound : handleGenerateMatches}
              disabled={loading || !allPairingsComplete || hasDuplicatePositions}
              className="gap-2"
            >
              <Swords className="w-4 h-4" />
              {loading ? 'Generando...' : `Generar ${pairings.length} cruce${pairings.length > 1 ? 's' : ''}`}
              {!isInSubsequentRound && getSubsequentRounds(selectedRound).length > 0 && (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Pending rounds indicator */}
        {isInSubsequentRound && pendingRounds.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Progreso:</span>
            {pendingRounds.map((pr, idx) => (
              <Badge
                key={idx}
                variant={idx < currentPendingRoundIdx ? 'default' : idx === currentPendingRoundIdx ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {getRoundLabel(pr.round)} ({pr.count})
              </Badge>
            ))}
          </div>
        )}

        {/* Skip remaining rounds */}
        {isInSubsequentRound && (
          <div className="mt-2 flex justify-start">
            <Button variant="ghost" size="sm" onClick={resetAll} className="text-xs text-muted-foreground">
              Omitir rondas restantes
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

// Separated select items into groups
function PositionOptionsList({ options, excludePairingNames, currentPairingName }: {
  options: { value: string; label: string; currentTeam?: string }[];
  excludePairingNames?: string[];
  currentPairingName?: string;
}) {
  const groupOptions = options.filter(o => o.value.startsWith('group:'));
  const bestOptions = options.filter(o => o.value.startsWith('best:'));
  const matchOptions = options.filter(o => o.value.startsWith('winner:') || o.value.startsWith('loser:'));

  // Exclude self-referencing (can't reference own match as winner/loser)
  const filteredMatchOptions = matchOptions.filter(o => {
    if (!currentPairingName) return true;
    const name = o.value.split(':')[1];
    return name !== currentPairingName;
  });

  return (
    <>
      {groupOptions.length > 0 && (
        <>
          <SelectItem value="__header_groups__" disabled className="text-xs font-bold text-muted-foreground uppercase">
            — Posiciones de grupo —
          </SelectItem>
          {groupOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}{opt.currentTeam ? ` (${opt.currentTeam})` : ''}
            </SelectItem>
          ))}
        </>
      )}
      {bestOptions.length > 0 && (
        <>
          <SelectItem value="__header_best__" disabled className="text-xs font-bold text-muted-foreground uppercase">
            — Mejores clasificados —
          </SelectItem>
          {bestOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </>
      )}
      {filteredMatchOptions.length > 0 && (
        <>
          <SelectItem value="__header_match__" disabled className="text-xs font-bold text-muted-foreground uppercase">
            — Ganadores/Perdedores —
          </SelectItem>
          {filteredMatchOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </>
      )}
    </>
  );
}
