import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from '@/services/tournamentService';
import { Match, EventTeam } from '@/types/tournament';
import {
  buildGroupStandings,
  buildCrossGroupRankings,
  determineBracketStructure,
  analyzeFromGroups,
  GroupMatch,
  TeamStanding,
} from '@/services/tournamentEngine';
import { CheckCircle2, AlertCircle, Loader2, Zap, Info, Trophy, Users } from 'lucide-react';

interface PhaseCompletionPanelProps {
  matches: Match[];
  eventId: string;
  eventTeams: EventTeam[];
  teams: Array<{ id: string; name: string }>;
  onResolved: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  gold_round_of_16: 'Fase Oro - 1/16 de Final',
  gold_round_of_8: 'Fase Oro - 1/8 de Final',
  gold_quarter_final: 'Fase Oro - 1/4 de Final',
  gold_semi_final: 'Fase Oro - Semifinales',
  gold_third_place: 'Fase Oro - 3er Puesto',
  gold_final: 'Fase Oro - Final',
  silver_round_of_16: 'Fase Plata - 1/16 de Final',
  silver_round_of_8: 'Fase Plata - 1/8 de Final',
  silver_quarter_final: 'Fase Plata - 1/4 de Final',
  silver_semi_final: 'Fase Plata - Semifinales',
  silver_third_place: 'Fase Plata - 3er Puesto',
  silver_final: 'Fase Plata - Final',
  bronze_round_of_16: 'Fase Bronce - 1/16 de Final',
  bronze_round_of_8: 'Fase Bronce - 1/8 de Final',
  bronze_quarter_final: 'Fase Bronce - 1/4 de Final',
  bronze_semi_final: 'Fase Bronce - Semifinales',
  bronze_third_place: 'Fase Bronce - 3er Puesto',
  bronze_final: 'Fase Bronce - Final',
};

function getPhaseLabel(phase: string): string {
  return PHASE_LABELS[phase] || phase;
}

export const PhaseCompletionPanel = ({ matches, eventId, eventTeams, teams, onResolved }: PhaseCompletionPanelProps) => {
  const { toast } = useToast();
  const [resolving, setResolving] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Group matches by phase and compute completion status
  const phaseStatus = useMemo(() => {
    const phases: Record<string, { total: number; finished: number; phase: string }> = {};

    matches.forEach(m => {
      const phase = m.phase;
      if (!phase) return;
      const normalizedPhase = (phase === 'group' || phase.startsWith('Jornada') || phase.toLowerCase().includes('grupo'))
        ? 'group'
        : phase;

      if (!phases[normalizedPhase]) {
        phases[normalizedPhase] = { total: 0, finished: 0, phase: normalizedPhase };
      }
      phases[normalizedPhase].total++;
      if (m.status === 'finished') {
        phases[normalizedPhase].finished++;
      }
    });

    return Object.values(phases).sort((a, b) => {
      if (a.phase === 'group') return -1;
      if (b.phase === 'group') return 1;
      return a.phase.localeCompare(b.phase);
    });
  }, [matches]);

  const groupPhaseComplete = useMemo(() => {
    const gp = phaseStatus.find(p => p.phase === 'group');
    return gp ? gp.finished === gp.total && gp.total > 0 : false;
  }, [phaseStatus]);

  // Check if there are unresolved placeholders in knockout matches
  const unresolvedCount = useMemo(() => {
    return matches.filter(m =>
      m.phase !== 'group' && !m.phase?.startsWith('Jornada') &&
      ((m.home_placeholder && !m.home_team_id) || (m.away_placeholder && !m.away_team_id))
    ).length;
  }, [matches]);

  // Dynamic bracket analysis
  const bracketAnalysis = useMemo(() => {
    if (!groupPhaseComplete || eventTeams.length === 0) return null;

    const groupMatchData: GroupMatch[] = matches
      .filter(m =>
        (m.phase === 'group' || m.phase?.startsWith('Jornada') || m.phase?.toLowerCase().includes('grupo')) &&
        m.status === 'finished' && m.home_score != null && m.away_score != null
      )
      .map(m => ({
        id: m.id,
        homeTeamId: m.home_team_id!,
        awayTeamId: m.away_team_id!,
        homeScore: m.home_score!,
        awayScore: m.away_score!,
        homeYellowCards: m.home_yellow_cards || 0,
        homeRedCards: m.home_red_cards || 0,
        awayYellowCards: m.away_yellow_cards || 0,
        awayRedCards: m.away_red_cards || 0,
        phase: m.phase,
        groupName: m.group_name,
        status: m.status,
      }));

    const standings = buildGroupStandings(
      eventTeams.map(et => ({ id: et.id, team_id: et.team_id, group_name: et.group_name || null })),
      groupMatchData,
    );

    const rankings = buildCrossGroupRankings(standings);

    // Count total teams
    const totalTeams = eventTeams.filter(et => et.group_name).length;
    const numGroups = new Set(eventTeams.filter(et => et.group_name).map(et => et.group_name)).size;

    // Determine how many qualify based on existing knockout structure
    const knockoutTeamSlots = matches
      .filter(m => m.phase !== 'group' && !m.phase?.startsWith('Jornada'))
      .reduce((count, m) => {
        if (m.home_placeholder) count++;
        if (m.away_placeholder) count++;
        return count;
      }, 0);

    const analysis = determineBracketStructure(knockoutTeamSlots || totalTeams);

    return {
      standings,
      rankings,
      analysis,
      totalTeams,
      numGroups,
      knockoutTeamSlots,
    };
  }, [groupPhaseComplete, matches, eventTeams]);

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    const et = eventTeams.find(e => e.team_id === teamId);
    const name = team?.name || 'Desconocido';
    return et?.team_letter ? `${name} ${et.team_letter}` : name;
  };

  const handleAutoResolve = async () => {
    try {
      setResolving(true);
      await tournamentService.updateTeamStatistics(eventId);
      const resolved = await tournamentService.resolveKnockoutPlaceholders(eventId);
      if (resolved > 0) {
        toast({
          title: '✅ Equipos asignados automáticamente',
          description: `Se asignaron ${resolved} equipo(s) a sus cruces según la clasificación (criterios FIFA + media por partido).`,
        });
        onResolved();
      } else {
        toast({
          title: 'Sin cambios',
          description: 'No hay placeholders pendientes de resolver o faltan resultados de partidos previos.',
        });
      }
    } catch (err) {
      console.error('Error resolviendo:', err);
      toast({ title: 'Error', description: 'No se pudieron resolver los cruces automáticamente', variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  if (phaseStatus.length === 0) return null;

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        Estado de las fases
      </h3>

      <div className="grid gap-2">
        {phaseStatus.map(ps => {
          const isComplete = ps.finished === ps.total && ps.total > 0;
          const inProgress = ps.finished > 0 && ps.finished < ps.total;

          return (
            <div
              key={ps.phase}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
                <span className="font-medium text-sm">{getPhaseLabel(ps.phase)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isComplete ? 'default' : inProgress ? 'secondary' : 'outline'}>
                  {ps.finished}/{ps.total} finalizados
                </Badge>
                {isComplete && (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400">
                    ✅ Completa
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic bracket analysis when group phase is complete */}
      {groupPhaseComplete && bracketAnalysis && (
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Análisis del cuadro
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setShowAnalysis(!showAnalysis)} className="text-xs">
                <Info className="w-3.5 h-3.5 mr-1" />
                {showAnalysis ? 'Ocultar' : 'Ver detalle'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {bracketAnalysis.analysis.summary}
            </p>
            {bracketAnalysis.analysis.isOptimal && (
              <Badge className="mt-2 bg-green-600">
                ✅ Cuadro directo — sin ronda previa
              </Badge>
            )}
            {bracketAnalysis.analysis.preliminaryNeeded && (
              <Badge variant="secondary" className="mt-2">
                ⚠️ Ronda previa necesaria — {bracketAnalysis.analysis.preliminaryMatchCount} partido(s)
              </Badge>
            )}
          </div>

          {/* Detailed cross-group rankings */}
          {showAnalysis && bracketAnalysis.rankings && (
            <div className="space-y-3">
              {Array.from(bracketAnalysis.rankings.entries())
                .sort(([a], [b]) => a - b)
                .map(([position, rankedTeams]) => (
                  <div key={position} className="p-3 rounded-lg border bg-card">
                    <h5 className="font-semibold text-xs mb-2 text-muted-foreground uppercase">
                      Ranking de {position}º clasificados (por media)
                    </h5>
                    <div className="space-y-1">
                      {rankedTeams.map((t: TeamStanding, idx: number) => (
                        <div key={t.eventTeamId} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary w-5">{idx + 1}.</span>
                            <span className="font-medium">{getTeamName(t.teamId)}</span>
                            <span className="text-muted-foreground">(Grupo {t.groupName})</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span title="Media pts/partido">{t.avgPointsPerMatch.toFixed(2)} pts/p</span>
                            <span title="Diferencia de goles">DG: {t.goalDifference > 0 ? '+' : ''}{t.goalDifference}</span>
                            <span title="Media goles a favor">{t.avgGoalsForPerMatch.toFixed(2)} GF/p</span>
                            <span title="Media goles en contra">{t.avgGoalsAgainstPerMatch.toFixed(2)} GC/p</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Auto-resolve button when there are unresolved placeholders */}
      {unresolvedCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
          <div>
            <p className="font-bold text-sm">
              🏆 Hay {unresolvedCount} cruce(s) con equipos por asignar
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {groupPhaseComplete
                ? 'La fase de grupos está completa. Genera los cruces automáticamente según la clasificación.'
                : 'Finaliza todos los partidos de la fase de grupos para poder generar los cruces.'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="default"
              onClick={handleAutoResolve}
              disabled={resolving || !groupPhaseComplete}
              className="font-bold"
            >
              {resolving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Generar cruces
            </Button>
          </div>
        </div>
      )}

      {unresolvedCount === 0 && phaseStatus.some(ps => ps.finished === ps.total && ps.total > 0) && (
        <p className="text-xs text-muted-foreground text-center">
          Todos los cruces existentes tienen equipos asignados. Usa el generador de cruces de abajo para crear la siguiente ronda.
        </p>
      )}
    </Card>
  );
};
