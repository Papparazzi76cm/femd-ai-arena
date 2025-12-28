import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from '@/services/tournamentService';
import { categoryService } from '@/services/categoryService';
import { facilityService } from '@/services/facilityService';
import { teamService } from '@/services/teamService';
import { Team, Category, EventCategory, Facility, FootballModality } from '@/types/database';
import { EventTeam, Match, TournamentPhase } from '@/types/tournament';
import { Trophy, Users, Calendar, UserCog, Tag, Building2, Plus, Trash2, MapPin, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RefereeManager } from './RefereeManager';
import { Badge } from '@/components/ui/badge';

interface TournamentManagerProps {
  eventId: string;
}

export const TournamentManager = ({ eventId }: TournamentManagerProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [eventFacilities, setEventFacilities] = useState<any[]>([]);
  
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Dialogs
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  
  // Category form
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newModality, setNewModality] = useState<FootballModality>('futbol_7');
  const [newDuration, setNewDuration] = useState(40);
  
  // Facility form
  const [newFacilityId, setNewFacilityId] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        allTeams,
        tournamentTeams,
        tournamentMatches,
        allCategories,
        eventCats,
        allFacilities,
        eventFacs,
      ] = await Promise.all([
        teamService.getAll(),
        tournamentService.getEventTeams(eventId),
        tournamentService.getMatches(eventId),
        categoryService.getAll(),
        categoryService.getEventCategories(eventId),
        facilityService.getAll(),
        facilityService.getEventFacilities(eventId),
      ]);
      setTeams(allTeams);
      setEventTeams(tournamentTeams);
      setMatches(tournamentMatches);
      setCategories(allCategories);
      setEventCategories(eventCats);
      setFacilities(allFacilities);
      setEventFacilities(eventFacs);
    } catch (error) {
      console.error('Error cargando datos del torneo:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del torneo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Team handling
  const handleTeamSelection = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeams([...selectedTeams, teamId]);
    } else {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    }
  };

  const handleAddTeams = async () => {
    if (selectedTeams.length === 0) {
      toast({ title: 'Atención', description: 'Debes seleccionar al menos un equipo', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      // Add teams with category and automatic letter assignment
      for (const teamId of selectedTeams) {
        await tournamentService.addTeamToEventWithLetter(
          eventId,
          teamId,
          selectedCategoryId || undefined
        );
      }
      toast({ title: 'Clubes añadidos', description: `Se añadieron ${selectedTeams.length} clubes al torneo` });
      setSelectedTeams([]);
      setTeamDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error añadiendo equipos:', error);
      toast({ title: 'Error', description: 'No se pudieron añadir los clubes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Category handling
  const handleAddCategory = async () => {
    if (!newCategoryId) {
      toast({ title: 'Error', description: 'Selecciona una categoría', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      await categoryService.addCategoryToEvent(eventId, newCategoryId, newModality, newDuration);
      toast({ title: 'Categoría añadida' });
      setNewCategoryId('');
      setNewModality('futbol_7');
      setNewDuration(40);
      setCategoryDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error añadiendo categoría:', error);
      toast({ title: 'Error', description: 'No se pudo añadir la categoría', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría del torneo?')) return;
    try {
      await categoryService.removeCategoryFromEvent(id);
      toast({ title: 'Categoría eliminada' });
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  // Facility handling
  const handleAddFacility = async () => {
    if (!newFacilityId) {
      toast({ title: 'Error', description: 'Selecciona una instalación', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      await facilityService.addFacilityToEvent(eventId, newFacilityId);
      toast({ title: 'Instalación añadida' });
      setNewFacilityId('');
      setFacilityDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error añadiendo instalación:', error);
      toast({ title: 'Error', description: 'No se pudo añadir la instalación', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFacility = async (id: string) => {
    if (!confirm('¿Eliminar esta instalación del torneo?')) return;
    try {
      await facilityService.removeFacilityFromEvent(id);
      toast({ title: 'Instalación eliminada' });
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  // Tournament generation
  const handleGenerateTournament = async () => {
    if (eventTeams.length !== 24) {
      toast({ title: 'Error', description: 'Se requieren exactamente 24 equipos', variant: 'destructive' });
      return;
    }

    if (!confirm('¿Generar sorteo y calendario? Se eliminarán los partidos existentes.')) return;

    try {
      setLoading(true);
      await tournamentService.deleteMatches(eventId);
      const teamIds = eventTeams.map(et => et.team_id);
      await tournamentService.generateTournament(eventId, teamIds);
      toast({ title: 'Torneo generado' });
      await loadData();
    } catch (error) {
      console.error('Error generando torneo:', error);
      toast({ title: 'Error', description: 'No se pudo generar el torneo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKnockout = async () => {
    if (!confirm('¿Generar fase eliminatoria?')) return;

    try {
      setLoading(true);
      await tournamentService.generateKnockoutPhase(eventId);
      toast({ title: 'Fase eliminatoria generada' });
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'No se pudo generar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMatchScore = async (matchId: string, field: string, value: string) => {
    try {
      const numValue = parseInt(value) || 0;
      await tournamentService.updateMatch(matchId, { [field]: numValue });
      await tournamentService.updateTeamStatistics(eventId);
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  // Helpers
  const getTeamName = (teamId: string) => {
    const eventTeam = eventTeams.find(et => et.team_id === teamId);
    const team = teams.find(t => t.id === teamId);
    const name = team?.name || 'Desconocido';
    return eventTeam?.team_letter ? `${name} ${eventTeam.team_letter}` : name;
  };

  const getModalityLabel = (modality: FootballModality) => {
    return modality === 'futbol_7' ? 'Fútbol 7' : 'Fútbol 11';
  };

  const getPhaseLabel = (phase: TournamentPhase) => {
    const labels: Record<string, string> = {
      'group': 'Fase de Grupos',
      'round_of_16': 'Octavos',
      'quarter_final': 'Cuartos',
      'semi_final': 'Semifinales',
      'third_place': 'Tercer Puesto',
      'final': 'Final',
      'gold_round_of_16': 'Oro - Octavos',
      'gold_quarter_final': 'Oro - Cuartos',
      'gold_semi_final': 'Oro - Semifinales',
      'gold_final': 'Oro - Final',
      'silver_round_of_16': 'Plata - Octavos',
      'silver_quarter_final': 'Plata - Cuartos',
      'silver_semi_final': 'Plata - Semifinales',
      'silver_final': 'Plata - Final',
      'bronze_round_of_16': 'Bronce - Octavos',
      'bronze_quarter_final': 'Bronce - Cuartos',
      'bronze_semi_final': 'Bronce - Semifinales',
      'bronze_final': 'Bronce - Final',
    };
    return labels[phase] || phase;
  };

  const availableTeams = teams.filter(
    team => !eventTeams.some(et => et.team_id === team.id && !selectedCategoryId) ||
            (selectedCategoryId && !eventTeams.some(et => et.team_id === team.id && et.category_id === selectedCategoryId))
  );

  const availableCategories = categories.filter(
    cat => !eventCategories.some(ec => ec.category_id === cat.id)
  );

  const availableFacilities = facilities.filter(
    fac => !eventFacilities.some(ef => ef.facility_id === fac.id)
  );

  const groupedTeams = eventTeams.reduce((acc, et) => {
    const group = et.group_name || 'Sin grupo';
    if (!acc[group]) acc[group] = [];
    acc[group].push(et);
    return acc;
  }, {} as Record<string, EventTeam[]>);

  Object.keys(groupedTeams).forEach(group => {
    groupedTeams[group].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      return b.goals_for - a.goals_for;
    });
  });

  const groupedMatches = matches.reduce((acc, match) => {
    const key = match.phase + (match.group_name ? `_${match.group_name}` : '');
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  if (loading && eventTeams.length === 0) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config">
            <Tag className="w-4 h-4 mr-2" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="equipos">
            <Users className="w-4 h-4 mr-2" />
            Clubes
          </TabsTrigger>
          <TabsTrigger value="calendario">
            <Calendar className="w-4 h-4 mr-2" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="instalaciones">
            <Building2 className="w-4 h-4 mr-2" />
            Instalaciones
          </TabsTrigger>
          <TabsTrigger value="mesas">
            <UserCog className="w-4 h-4 mr-2" />
            Mesas
          </TabsTrigger>
        </TabsList>

        {/* Configuración */}
        <TabsContent value="config" className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categorías del Torneo
              </h3>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={availableCategories.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Categoría
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir Categoría al Torneo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Categoría</Label>
                      <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Modalidad</Label>
                      <Select value={newModality} onValueChange={(v: FootballModality) => setNewModality(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="futbol_7">Fútbol 7</SelectItem>
                          <SelectItem value="futbol_11">Fútbol 11</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duración de Partido (minutos)</Label>
                      <Input
                        type="number"
                        value={newDuration}
                        onChange={(e) => setNewDuration(parseInt(e.target.value) || 40)}
                      />
                    </div>
                    <Button onClick={handleAddCategory} disabled={loading} className="w-full">
                      Añadir
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {eventCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay categorías configuradas. Añade al menos una categoría para comenzar.
              </p>
            ) : (
              <div className="grid gap-3">
                {eventCategories.map(ec => (
                  <div key={ec.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{ec.category?.name || 'Categoría'}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {getModalityLabel(ec.modality)} • {ec.match_duration_minutes} min
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCategory(ec.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Equipos */}
        <TabsContent value="equipos" className="mt-6 space-y-6">
          <div className="flex gap-4 flex-wrap">
            <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Users className="w-4 h-4 mr-2" />
                  Añadir Clubes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Seleccionar Clubes</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {eventCategories.length > 0 && (
                    <div>
                      <Label>Categoría (opcional)</Label>
                      <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas</SelectItem>
                          {eventCategories.map(ec => (
                            <SelectItem key={ec.id} value={ec.id}>
                              {ec.category?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Seleccionados: {selectedTeams.length} | En torneo: {eventTeams.length}
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {teams.map(team => (
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
                    Añadir {selectedTeams.length} club(es)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={handleGenerateTournament} 
              disabled={eventTeams.length !== 24 || loading}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Generar Sorteo
            </Button>

            <Button
              onClick={handleGenerateKnockout}
              disabled={matches.filter(m => m.phase === 'group').length === 0}
              variant="secondary"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Generar Eliminatoria
            </Button>
          </div>

          {Object.keys(groupedTeams).length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">
                Clubes Inscritos ({eventTeams.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(groupedTeams).sort().map(([group, teams]) => (
                  <Card key={group} className="p-4">
                    <h4 className="font-bold mb-3 text-center">Grupo {group}</h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1">#</th>
                          <th className="text-left py-1">Equipo</th>
                          <th className="text-center py-1">PJ</th>
                          <th className="text-center py-1">Pts</th>
                          <th className="text-center py-1">DG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((et, index) => (
                          <tr key={et.id} className={`border-b ${index < 2 ? 'bg-green-500/10' : ''}`}>
                            <td className="py-1">{index + 1}</td>
                            <td className="py-1">{getTeamName(et.team_id)}</td>
                            <td className="text-center py-1">{et.matches_played}</td>
                            <td className="text-center py-1 font-bold">{et.points}</td>
                            <td className="text-center py-1">{et.goal_difference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Calendario */}
        <TabsContent value="calendario" className="mt-6">
          {matches.length > 0 ? (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Calendario de Partidos</h3>
              <div className="space-y-6">
                {Object.entries(groupedMatches).map(([key, matchList]) => {
                  const [phase, group] = key.split('_');
                  return (
                    <div key={key}>
                      <h4 className="font-bold text-lg mb-3">
                        {getPhaseLabel(phase as TournamentPhase)} {group ? `- Grupo ${group}` : ''}
                      </h4>
                      <div className="space-y-2">
                        {matchList.map(match => (
                          <Card key={match.id} className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="font-semibold">{getTeamName(match.home_team_id)}</div>
                              </div>
                              <div className="flex gap-2 items-center">
                                <Input
                                  type="number"
                                  min="0"
                                  value={match.home_score ?? ''}
                                  onChange={(e) => handleUpdateMatchScore(match.id, 'home_score', e.target.value)}
                                  className="w-14 text-center"
                                />
                                <span className="font-bold">-</span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={match.away_score ?? ''}
                                  onChange={(e) => handleUpdateMatchScore(match.id, 'away_score', e.target.value)}
                                  className="w-14 text-center"
                                />
                              </div>
                              <div className="flex-1 text-right">
                                <div className="font-semibold">{getTeamName(match.away_team_id)}</div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-muted-foreground text-center">
                No hay partidos programados. Genera el sorteo primero.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Instalaciones */}
        <TabsContent value="instalaciones" className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Instalaciones del Torneo
              </h3>
              <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={availableFacilities.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Instalación
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir Instalación al Torneo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Instalación</Label>
                      <Select value={newFacilityId} onValueChange={setNewFacilityId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona instalación" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFacilities.map(fac => (
                            <SelectItem key={fac.id} value={fac.id}>
                              {fac.name} {fac.city ? `(${fac.city})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddFacility} disabled={loading} className="w-full">
                      Añadir
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {eventFacilities.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay instalaciones asignadas al torneo.
              </p>
            ) : (
              <div className="grid gap-4">
                {eventFacilities.map(ef => (
                  <div key={ef.id} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold">{ef.facility?.name}</h4>
                        {ef.facility?.city && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {ef.facility.city}{ef.facility.province ? `, ${ef.facility.province}` : ''}
                          </p>
                        )}
                        {ef.facility?.fields && ef.facility.fields.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {ef.facility.fields.map((field: any) => (
                              <Badge key={field.id} variant="outline">
                                {field.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFacility(ef.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Mesas */}
        <TabsContent value="mesas" className="mt-6">
          <RefereeManager eventId={eventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
