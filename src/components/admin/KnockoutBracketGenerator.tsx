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
import { AlertTriangle, Plus, Trash2, Swords, Link2 } from 'lucide-react';

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
  homePosition: string; // e.g. "group:A-1", "best:1-1", "winner:Q1"
  awayPosition: string;
  phase: string;
  categoryId: string;
  fieldId: string;
  matchDate: string;
  matchHalves: number;
  matchDuration: number;
}

const PHASE_OPTIONS: Record<string, string> = {
  'round_of_16': 'Octavos',
  'quarter_final': 'Cuartos',
  'semi_final': 'Semifinales',
  'third_place': 'Tercer Puesto',
  'final': 'Final',
  'gold_round_of_16': 'Oro - Octavos',
  'gold_quarter_final': 'Oro - Cuartos',
  'gold_semi_final': 'Oro - Semifinales',
  'gold_third_place': 'Oro - 3er Puesto',
  'gold_final': 'Oro - Final',
  'silver_round_of_16': 'Plata - Octavos',
  'silver_quarter_final': 'Plata - Cuartos',
  'silver_semi_final': 'Plata - Semifinales',
  'silver_third_place': 'Plata - 3er Puesto',
  'silver_final': 'Plata - Final',
  'bronze_round_of_16': 'Bronce - Octavos',
  'bronze_quarter_final': 'Bronce - Cuartos',
  'bronze_semi_final': 'Bronce - Semifinales',
  'bronze_third_place': 'Bronce - 3er Puesto',
  'bronze_final': 'Bronce - Final',
};

// Convert a position key to a human-readable placeholder label
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
  if (type === 'winner') {
    return `Ganador ${rest}`;
  }
  if (type === 'loser') {
    return `Perdedor ${rest}`;
  }
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
  const [pairings, setPairings] = useState<BracketPairing[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('__all__');
  const [defaultPhase, setDefaultPhase] = useState<string>('quarter_final');

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
    return matches.filter(m => m.phase !== 'group');
  }, [matches]);

  // Build position options
  const positionOptions = useMemo(() => {
    const options: { value: string; label: string; currentTeam?: string }[] = [];

    // 1. Group positions: "1º Grupo A", "2º Grupo A", etc.
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

    // 2. Cross-group rankings: "1er Mejor 1º", "2º Mejor 1º", "1er Mejor 3º", etc.
    if (sortedGroupNames.length > 1) {
      // Max positions to rank across groups
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

    // 3. Winners/losers of existing knockout matches
    knockoutMatches.forEach(m => {
      const matchLabel = m.match_number ? `P${m.match_number}` : m.id.slice(0, 4);
      const phaseLabel = PHASE_OPTIONS[m.phase] || m.phase;
      options.push({
        value: `winner:${matchLabel}`,
        label: `Ganador ${matchLabel} (${phaseLabel})`,
      });
      options.push({
        value: `loser:${matchLabel}`,
        label: `Perdedor ${matchLabel} (${phaseLabel})`,
      });
    });

    return options;
  }, [sortedGroupNames, groupedStandings, teams, knockoutMatches]);

  const allFields = eventFacilities.flatMap((ef: any) =>
    (ef.facility?.fields || []).map((f: any) => ({
      ...f,
      facilityName: ef.facility?.name || '',
    }))
  );

  const addPairing = () => {
    setPairings([...pairings, {
      id: crypto.randomUUID(),
      homePosition: '',
      awayPosition: '',
      phase: defaultPhase,
      categoryId: selectedCategoryFilter !== '__all__' ? selectedCategoryFilter : '',
      fieldId: '',
      matchDate: '',
      matchHalves: 1,
      matchDuration: 40,
    }]);
  };

  const updatePairing = (id: string, updates: Partial<BracketPairing>) => {
    setPairings(pairings.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePairing = (id: string) => {
    setPairings(pairings.filter(p => p.id !== id));
  };

  const handleGenerateMatches = async () => {
    const invalid = pairings.find(p => !p.homePosition || !p.awayPosition || !p.matchDate || !p.fieldId);
    if (invalid) {
      toast({ title: 'Error', description: 'Completa todos los campos obligatorios de cada cruce', variant: 'destructive' });
      return;
    }

    const duplicatePos = pairings.find(p => p.homePosition === p.awayPosition);
    if (duplicatePos) {
      toast({ title: 'Error', description: 'Un cruce no puede tener la misma posición en ambos lados', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      let created = 0;

      for (const pairing of pairings) {
        const homePlaceholder = positionToLabel(pairing.homePosition);
        const awayPlaceholder = positionToLabel(pairing.awayPosition);

        const matchData: any = {
          event_id: eventId,
          home_team_id: null,
          away_team_id: null,
          home_placeholder: homePlaceholder,
          away_placeholder: awayPlaceholder,
          phase: pairing.phase,
          status: 'scheduled',
          match_halves: pairing.matchHalves,
          match_duration_minutes: pairing.matchDuration,
          match_date: pairing.matchDate,
          field_id: pairing.fieldId,
          match_number: matches.length + created + 1,
        };
        if (pairing.categoryId) matchData.category_id = pairing.categoryId;

        await tournamentService.createMatch(matchData);
        created++;
      }

      toast({ title: '¡Cruces generados!', description: `Se crearon ${created} partidos de fase eliminatoria con placeholders` });
      setPairings([]);
      onMatchesCreated();
    } catch (error) {
      console.error('Error generando cruces:', error);
      toast({ title: 'Error', description: 'No se pudieron crear los cruces', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Standings overview */}
      <Card className="p-4">
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Generador de Cruces Eliminatorios
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Los cruces se crean con <strong>placeholders</strong> (ej. "1º Grupo A - 2º Grupo D"). 
          Los equipos se asignarán cuando la fase de grupos haya terminado.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          {eventCategories.length > 0 && (
            <div className="min-w-[200px]">
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
          <div className="min-w-[200px]">
            <Label className="text-xs">Fase por defecto</Label>
            <Select value={defaultPhase} onValueChange={setDefaultPhase}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PHASE_OPTIONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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

      {/* Pairings editor */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Cruces</h4>
          <Button size="sm" onClick={addPairing}>
            <Plus className="w-4 h-4 mr-1" />
            Añadir cruce
          </Button>
        </div>

        {pairings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Pulsa "Añadir cruce" para definir los emparejamientos de la fase eliminatoria.
          </p>
        ) : (
          <div className="space-y-4">
            {pairings.map((pairing, index) => (
              <div key={pairing.id} className="border rounded-lg p-3 space-y-3 bg-card">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">Cruce {index + 1}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePairing(pairing.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>

                {/* Team selection by position placeholder */}
                <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
                  <div>
                    <Label className="text-xs">Local</Label>
                    <Select value={pairing.homePosition} onValueChange={v => updatePairing(pairing.id, { homePosition: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <PositionOptionsList options={positionOptions} />
                      </SelectContent>
                    </Select>
                    {pairing.homePosition && (
                      <p className="text-xs font-medium text-primary mt-0.5 truncate">
                        → {positionToLabel(pairing.homePosition)}
                        {positionOptions.find(o => o.value === pairing.homePosition)?.currentTeam && (
                          <span className="text-muted-foreground font-normal"> ({positionOptions.find(o => o.value === pairing.homePosition)?.currentTeam})</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-muted-foreground font-bold text-lg pb-2">vs</div>
                  <div>
                    <Label className="text-xs">Visitante</Label>
                    <Select value={pairing.awayPosition} onValueChange={v => updatePairing(pairing.id, { awayPosition: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <PositionOptionsList options={positionOptions} />
                      </SelectContent>
                    </Select>
                    {pairing.awayPosition && (
                      <p className="text-xs font-medium text-primary mt-0.5 truncate">
                        → {positionToLabel(pairing.awayPosition)}
                        {positionOptions.find(o => o.value === pairing.awayPosition)?.currentTeam && (
                          <span className="text-muted-foreground font-normal"> ({positionOptions.find(o => o.value === pairing.awayPosition)?.currentTeam})</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {pairing.homePosition && pairing.awayPosition && (
                  <div className="bg-muted/50 rounded p-2 text-center text-sm font-semibold flex items-center justify-center gap-2">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    {positionToLabel(pairing.homePosition)} — {positionToLabel(pairing.awayPosition)}
                  </div>
                )}

                {/* Match details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Fase</Label>
                    <Select value={pairing.phase} onValueChange={v => updatePairing(pairing.id, { phase: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PHASE_OPTIONS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Label className="text-xs">Duración (min)</Label>
                    <Input
                      type="number"
                      className="h-9"
                      min={5}
                      max={120}
                      value={pairing.matchDuration}
                      onChange={e => updatePairing(pairing.id, { matchDuration: parseInt(e.target.value) || 40 })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pairings.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleGenerateMatches} disabled={loading} className="gap-2">
              <Swords className="w-4 h-4" />
              {loading ? 'Generando...' : `Generar ${pairings.length} cruce${pairings.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

// Separated select items into groups for readability
function PositionOptionsList({ options }: { options: { value: string; label: string; currentTeam?: string }[] }) {
  const groupOptions = options.filter(o => o.value.startsWith('group:'));
  const bestOptions = options.filter(o => o.value.startsWith('best:'));
  const matchOptions = options.filter(o => o.value.startsWith('winner:') || o.value.startsWith('loser:'));

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
      {matchOptions.length > 0 && (
        <>
          <SelectItem value="__header_match__" disabled className="text-xs font-bold text-muted-foreground uppercase">
            — Ganadores/Perdedores —
          </SelectItem>
          {matchOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </>
      )}
    </>
  );
}
