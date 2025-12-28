import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tournamentService } from '@/services/tournamentService';
import { teamService } from '@/services/teamService';
import { Team } from '@/types/database';
import { EventTeam, Match, TournamentPhase } from '@/types/tournament';
import { History, Plus, Save, Trash2, Edit2, Calendar, Download, Upload, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  exportMatchesToCSV, 
  exportTeamsToCSV, 
  parseMatchesCSV, 
  parseTeamsCSV,
  downloadCSV,
  getCSVTemplate,
  type MatchCSVRow,
  type TeamCSVRow
} from '@/utils/tournamentCsvUtils';

interface HistoricalTournamentManagerProps {
  eventId: string;
}

export const HistoricalTournamentManager = ({ eventId }: HistoricalTournamentManagerProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Team selection dialog
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  
  // CSV Import/Export
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState<'teams' | 'matches'>('matches');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Match creation dialog
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matchForm, setMatchForm] = useState({
    home_team_id: '',
    away_team_id: '',
    phase: 'group' as TournamentPhase,
    group_name: '',
    match_date: '',
    home_score: 0,
    away_score: 0,
    home_yellow_cards: 0,
    home_red_cards: 0,
    away_yellow_cards: 0,
    away_red_cards: 0,
    status: 'finished' as 'scheduled' | 'in_progress' | 'finished',
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allTeams, tournamentTeams, tournamentMatches] = await Promise.all([
        teamService.getAll(),
        tournamentService.getEventTeams(eventId),
        tournamentService.getMatches(eventId),
      ]);
      setTeams(allTeams);
      setEventTeams(tournamentTeams);
      setMatches(tournamentMatches);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableTeams = teams.filter(
    team => !eventTeams.some(et => et.team_id === team.id)
  );

  const handleTeamSelection = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeams([...selectedTeams, teamId]);
    } else {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    }
  };

  const handleAddTeams = async () => {
    if (selectedTeams.length === 0) {
      toast({
        title: 'Atención',
        description: 'Debes seleccionar al menos un equipo',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await tournamentService.addTeamsToEvent(eventId, selectedTeams);
      toast({
        title: 'Equipos añadidos',
        description: `Se añadieron ${selectedTeams.length} equipos al torneo`,
      });
      setSelectedTeams([]);
      setTeamDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error añadiendo equipos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron añadir los equipos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeam = async (eventTeamId: string) => {
    if (!confirm('¿Estás seguro de eliminar este equipo del torneo?')) return;

    try {
      await tournamentService.removeTeamFromEvent(eventTeamId);
      toast({
        title: 'Equipo eliminado',
        description: 'El equipo se eliminó del torneo',
      });
      loadData();
    } catch (error) {
      console.error('Error eliminando equipo:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el equipo',
        variant: 'destructive',
      });
    }
  };

  const resetMatchForm = () => {
    setMatchForm({
      home_team_id: '',
      away_team_id: '',
      phase: 'group' as TournamentPhase,
      group_name: '',
      match_date: '',
      home_score: 0,
      away_score: 0,
      home_yellow_cards: 0,
      home_red_cards: 0,
      away_yellow_cards: 0,
      away_red_cards: 0,
      status: 'finished',
    });
    setEditingMatch(null);
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setMatchForm({
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
      phase: match.phase,
      group_name: match.group_name || '',
      match_date: match.match_date || '',
      home_score: match.home_score || 0,
      away_score: match.away_score || 0,
      home_yellow_cards: match.home_yellow_cards || 0,
      home_red_cards: match.home_red_cards || 0,
      away_yellow_cards: match.away_yellow_cards || 0,
      away_red_cards: match.away_red_cards || 0,
      status: match.status as 'scheduled' | 'in_progress' | 'finished',
    });
    setMatchDialogOpen(true);
  };

  const handleSaveMatch = async () => {
    if (!matchForm.home_team_id || !matchForm.away_team_id) {
      toast({
        title: 'Atención',
        description: 'Debes seleccionar ambos equipos',
        variant: 'destructive',
      });
      return;
    }

    if (matchForm.home_team_id === matchForm.away_team_id) {
      toast({
        title: 'Atención',
        description: 'Los equipos deben ser diferentes',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      if (editingMatch) {
        // Update existing match
        await tournamentService.updateMatch(editingMatch.id, matchForm);
        toast({
          title: 'Partido actualizado',
          description: 'El partido se actualizó correctamente',
        });
      } else {
        // Create new match
        const newMatch = {
          ...matchForm,
          event_id: eventId,
        };
        await tournamentService.createMatch(newMatch);
        toast({
          title: 'Partido creado',
          description: 'El partido se creó correctamente',
        });
      }

      // Update statistics if match is finished
      if (matchForm.status === 'finished') {
        await tournamentService.updateTeamStatistics(eventId);
      }

      resetMatchForm();
      setMatchDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error guardando partido:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el partido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('¿Estás seguro de eliminar este partido?')) return;

    try {
      await tournamentService.deleteMatch(matchId);
      toast({
        title: 'Partido eliminado',
        description: 'El partido se eliminó correctamente',
      });
      loadData();
    } catch (error) {
      console.error('Error eliminando partido:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el partido',
        variant: 'destructive',
      });
    }
  };

  // CSV Export Functions
  const handleExportMatches = () => {
    const csv = exportMatchesToCSV(matches, getTeamName);
    downloadCSV(csv, `partidos-${eventId}-${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: 'Exportación exitosa',
      description: 'Los partidos se exportaron correctamente',
    });
  };

  const handleExportTeams = () => {
    const teamsData = eventTeams.map(et => ({
      name: getTeamName(et.team_id),
      group: et.group_name,
    }));
    const csv = exportTeamsToCSV(teamsData);
    downloadCSV(csv, `equipos-${eventId}-${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: 'Exportación exitosa',
      description: 'Los equipos se exportaron correctamente',
    });
  };

  const handleDownloadTemplate = (type: 'teams' | 'matches') => {
    const csv = getCSVTemplate(type);
    downloadCSV(csv, `plantilla-${type === 'teams' ? 'equipos' : 'partidos'}.csv`);
    toast({
      title: 'Plantilla descargada',
      description: 'Usa esta plantilla como referencia para importar datos',
    });
  };

  // CSV Import Functions
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Formato inválido',
        description: 'Solo se permiten archivos CSV',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();

      if (importType === 'matches') {
        await importMatches(text);
      } else {
        await importTeams(text);
      }

      setImportDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importando archivo:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo importar el archivo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const importTeams = async (csvContent: string) => {
    const teamRows = await parseTeamsCSV(csvContent);

    if (teamRows.length === 0) {
      throw new Error('El archivo no contiene equipos válidos');
    }

    // Find teams by name and add them to the event
    const teamIds: string[] = [];
    const notFound: string[] = [];

    for (const row of teamRows) {
      const team = teams.find(t => t.name.toLowerCase() === row.name.toLowerCase());
      if (team) {
        teamIds.push(team.id);
      } else {
        notFound.push(row.name);
      }
    }

    if (notFound.length > 0) {
      toast({
        title: 'Advertencia',
        description: `No se encontraron estos equipos: ${notFound.join(', ')}. Créalos primero en la gestión de equipos.`,
        variant: 'destructive',
      });
    }

    if (teamIds.length > 0) {
      await tournamentService.addTeamsToEvent(eventId, teamIds);
      toast({
        title: 'Equipos importados',
        description: `Se importaron ${teamIds.length} equipos correctamente`,
      });
      loadData();
    }
  };

  const importMatches = async (csvContent: string) => {
    const matchRows = await parseMatchesCSV(csvContent);

    if (matchRows.length === 0) {
      throw new Error('El archivo no contiene partidos válidos');
    }

    let imported = 0;
    let errors = 0;

    for (const row of matchRows) {
      try {
        // Find teams by name
        const homeTeam = teams.find(t => t.name.toLowerCase() === row.home_team_name.toLowerCase());
        const awayTeam = teams.find(t => t.name.toLowerCase() === row.away_team_name.toLowerCase());

        if (!homeTeam || !awayTeam) {
          console.error(`Equipos no encontrados: ${row.home_team_name} vs ${row.away_team_name}`);
          errors++;
          continue;
        }

        // Parse date if provided
        let matchDate: string | undefined;
        if (row.match_date) {
          const parts = row.match_date.split('/');
          if (parts.length === 3) {
            matchDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        const newMatch = {
          event_id: eventId,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          phase: row.phase as TournamentPhase,
          group_name: row.group_name || undefined,
          match_date: matchDate,
          home_score: row.home_score,
          away_score: row.away_score,
          home_yellow_cards: row.home_yellow_cards,
          home_red_cards: row.home_red_cards,
          away_yellow_cards: row.away_yellow_cards,
          away_red_cards: row.away_red_cards,
          status: 'finished' as const,
        };

        await tournamentService.createMatch(newMatch);
        imported++;
      } catch (error) {
        console.error('Error importando partido:', error);
        errors++;
      }
    }

    if (imported > 0) {
      await tournamentService.updateTeamStatistics(eventId);
    }

    toast({
      title: 'Importación completada',
      description: `${imported} partidos importados, ${errors} errores`,
      variant: errors > 0 ? 'destructive' : 'default',
    });

    loadData();
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Desconocido';
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      'group': 'Fase de Grupos',
      'round_of_16': 'Octavos de Final',
      'quarter_final': 'Cuartos de Final',
      'semi_final': 'Semifinales',
      'third_place': 'Tercer Puesto',
      'final': 'Final',
      'gold_round_of_16': 'Oro - Octavos',
      'gold_quarter_final': 'Oro - Cuartos',
      'gold_semi_final': 'Oro - Semifinales',
      'gold_third_place': 'Oro - Tercer Puesto',
      'gold_final': 'Oro - Final',
      'silver_round_of_16': 'Plata - Octavos',
      'silver_quarter_final': 'Plata - Cuartos',
      'silver_semi_final': 'Plata - Semifinales',
      'silver_third_place': 'Plata - Tercer Puesto',
      'silver_final': 'Plata - Final',
      'bronze_round_of_16': 'Bronce - Octavos',
      'bronze_quarter_final': 'Bronce - Cuartos',
      'bronze_semi_final': 'Bronce - Semifinales',
      'bronze_third_place': 'Bronce - Tercer Puesto',
      'bronze_final': 'Bronce - Final',
    };
    return labels[phase] || phase;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-bold">Gestión Manual de Torneo Histórico</h3>
        </div>
        
        {/* Import/Export Buttons */}
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Importar CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Datos desde CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Alert>
                  <FileText className="w-4 h-4" />
                  <AlertDescription>
                    Descarga una plantilla CSV para ver el formato correcto antes de importar tus datos.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="import-type">Tipo de datos</Label>
                  <Select value={importType} onValueChange={(v: any) => setImportType(v)}>
                    <SelectTrigger id="import-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teams">Equipos</SelectItem>
                      <SelectItem value="matches">Partidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadTemplate(importType)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Plantilla
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <Label htmlFor="csv-file">Seleccionar archivo CSV</Label>
                  <Input
                    id="csv-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={loading}
                    className="mt-2"
                  />
                </div>

                {loading && (
                  <p className="text-sm text-muted-foreground">Importando datos...</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={handleExportTeams}
            disabled={eventTeams.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Equipos
          </Button>

          <Button
            variant="outline"
            onClick={handleExportMatches}
            disabled={matches.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Partidos
          </Button>
        </div>
      </div>

      {/* Teams Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-semibold">Equipos del Torneo ({eventTeams.length})</h4>
          <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Equipos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Seleccionar Equipos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {availableTeams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Todos los equipos ya están en el torneo
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {availableTeams.map(team => (
                        <div key={team.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={team.id}
                            checked={selectedTeams.includes(team.id)}
                            onCheckedChange={(checked) => handleTeamSelection(team.id, checked as boolean)}
                          />
                          <label htmlFor={team.id} className="text-sm cursor-pointer">
                            {team.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleAddTeams} disabled={selectedTeams.length === 0 || loading}>
                      Añadir {selectedTeams.length} equipo(s)
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {eventTeams.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay equipos en este torneo. Añade equipos para comenzar.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventTeams.map(et => (
              <div key={et.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{getTeamName(et.team_id)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTeam(et.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Matches Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-semibold">Partidos ({matches.length})</h4>
          <Dialog open={matchDialogOpen} onOpenChange={(open) => {
            setMatchDialogOpen(open);
            if (!open) resetMatchForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={eventTeams.length < 2}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Partido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMatch ? 'Editar Partido' : 'Crear Partido'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="home-team">Equipo Local</Label>
                    <Select
                      value={matchForm.home_team_id}
                      onValueChange={(value) => setMatchForm({ ...matchForm, home_team_id: value })}
                    >
                      <SelectTrigger id="home-team">
                        <SelectValue placeholder="Selecciona equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTeams.map(et => (
                          <SelectItem key={et.team_id} value={et.team_id}>
                            {getTeamName(et.team_id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="away-team">Equipo Visitante</Label>
                    <Select
                      value={matchForm.away_team_id}
                      onValueChange={(value) => setMatchForm({ ...matchForm, away_team_id: value })}
                    >
                      <SelectTrigger id="away-team">
                        <SelectValue placeholder="Selecciona equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTeams.map(et => (
                          <SelectItem key={et.team_id} value={et.team_id}>
                            {getTeamName(et.team_id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="phase">Fase</Label>
                    <Select
                      value={matchForm.phase}
                      onValueChange={(value: any) => setMatchForm({ ...matchForm, phase: value })}
                    >
                      <SelectTrigger id="phase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group">Fase de Grupos</SelectItem>
                        <SelectItem value="round_of_16">Octavos de Final</SelectItem>
                        <SelectItem value="quarter_final">Cuartos de Final</SelectItem>
                        <SelectItem value="semi_final">Semifinales</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="group-name">Grupo (opcional)</Label>
                    <Input
                      id="group-name"
                      value={matchForm.group_name}
                      onChange={(e) => setMatchForm({ ...matchForm, group_name: e.target.value })}
                      placeholder="A, B, C..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="match-date">Fecha</Label>
                    <Input
                      id="match-date"
                      type="date"
                      value={matchForm.match_date}
                      onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-semibold mb-3">Resultado</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="home-score">Goles Local</Label>
                      <Input
                        id="home-score"
                        type="number"
                        min="0"
                        value={matchForm.home_score}
                        onChange={(e) => setMatchForm({ ...matchForm, home_score: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="away-score">Goles Visitante</Label>
                      <Input
                        id="away-score"
                        type="number"
                        min="0"
                        value={matchForm.away_score}
                        onChange={(e) => setMatchForm({ ...matchForm, away_score: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-semibold mb-3">Tarjetas</h5>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block">Equipo Local</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="home-yellow" className="text-xs">Amarillas</Label>
                          <Input
                            id="home-yellow"
                            type="number"
                            min="0"
                            value={matchForm.home_yellow_cards}
                            onChange={(e) => setMatchForm({ ...matchForm, home_yellow_cards: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="home-red" className="text-xs">Rojas</Label>
                          <Input
                            id="home-red"
                            type="number"
                            min="0"
                            value={matchForm.home_red_cards}
                            onChange={(e) => setMatchForm({ ...matchForm, home_red_cards: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Equipo Visitante</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="away-yellow" className="text-xs">Amarillas</Label>
                          <Input
                            id="away-yellow"
                            type="number"
                            min="0"
                            value={matchForm.away_yellow_cards}
                            onChange={(e) => setMatchForm({ ...matchForm, away_yellow_cards: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="away-red" className="text-xs">Rojas</Label>
                          <Input
                            id="away-red"
                            type="number"
                            min="0"
                            value={matchForm.away_red_cards}
                            onChange={(e) => setMatchForm({ ...matchForm, away_red_cards: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetMatchForm();
                      setMatchDialogOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveMatch} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingMatch ? 'Actualizar' : 'Crear'} Partido
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {matches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay partidos creados. Crea partidos manualmente.
          </p>
        ) : (
          <div className="space-y-4">
            {matches.map(match => (
              <Card key={match.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {getPhaseLabel(match.phase)}
                        {match.group_name && ` - Grupo ${match.group_name}`}
                      </span>
                      {match.match_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(match.match_date).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{getTeamName(match.home_team_id)}</span>
                      <span className="text-2xl font-bold text-primary">
                        {match.home_score ?? 0} - {match.away_score ?? 0}
                      </span>
                      <span className="font-semibold">{getTeamName(match.away_team_id)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditMatch(match)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMatch(match.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
