import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from '@/services/tournamentService';
import { Match } from '@/types/tournament';
import { CheckCircle2, AlertCircle, Loader2, Zap, RefreshCw } from 'lucide-react';

interface PhaseCompletionPanelProps {
  matches: Match[];
  eventId: string;
  onResolved: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  gold_round_of_16: 'Fase Oro - 1/16 de Final',
  gold_round_of_8: 'Fase Oro - 1/8 de Final',
  gold_quarter_final: 'Fase Oro - 1/4 de Final',
  gold_semi_final: 'Fase Oro - Semifinales',
  gold_final: 'Fase Oro - Final',
  silver_round_of_16: 'Fase Plata - 1/16 de Final',
  silver_round_of_8: 'Fase Plata - 1/8 de Final',
  silver_quarter_final: 'Fase Plata - 1/4 de Final',
  silver_semi_final: 'Fase Plata - Semifinales',
  silver_final: 'Fase Plata - Final',
  bronze_round_of_16: 'Fase Bronce - 1/16 de Final',
  bronze_round_of_8: 'Fase Bronce - 1/8 de Final',
  bronze_quarter_final: 'Fase Bronce - 1/4 de Final',
  bronze_semi_final: 'Fase Bronce - Semifinales',
  bronze_final: 'Fase Bronce - Final',
};

function getPhaseLabel(phase: string): string {
  return PHASE_LABELS[phase] || phase;
}

export const PhaseCompletionPanel = ({ matches, eventId, onResolved }: PhaseCompletionPanelProps) => {
  const { toast } = useToast();
  const [resolving, setResolving] = useState(false);

  // Group matches by phase and compute completion status
  const phaseStatus = useMemo(() => {
    const phases: Record<string, { total: number; finished: number; phase: string }> = {};

    matches.forEach(m => {
      const phase = m.phase;
      if (!phase) return;
      // Normalize group-like phases
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
      // Group phase first, then by phase name
      if (a.phase === 'group') return -1;
      if (b.phase === 'group') return 1;
      return a.phase.localeCompare(b.phase);
    });
  }, [matches]);

  // Check if there are unresolved placeholders in knockout matches
  const unresolvedCount = useMemo(() => {
    return matches.filter(m =>
      m.phase !== 'group' && !m.phase?.startsWith('Jornada') &&
      ((m.home_placeholder && !m.home_team_id) || (m.away_placeholder && !m.away_team_id))
    ).length;
  }, [matches]);

  const handleAutoResolve = async () => {
    try {
      setResolving(true);
      // First update team statistics
      await tournamentService.updateTeamStatistics(eventId);
      // Then resolve placeholders
      const resolved = await tournamentService.resolveKnockoutPlaceholders(eventId);
      if (resolved > 0) {
        toast({
          title: '✅ Equipos asignados automáticamente',
          description: `Se asignaron ${resolved} equipo(s) a sus cruces correspondientes según la clasificación.`,
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

      {/* Auto-resolve button when there are unresolved placeholders */}
      {unresolvedCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div>
            <p className="font-medium text-sm">
              Hay {unresolvedCount} cruce(s) con equipos por asignar
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Puedes asignar automáticamente según clasificación o hacerlo manualmente en cada cruce.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleAutoResolve}
              disabled={resolving}
            >
              {resolving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Asignar automáticamente
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
