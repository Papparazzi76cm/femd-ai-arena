import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { FieldSurface } from '@/types/database';
import { Trophy, Users, Calendar, UserCog, Tag, Building2, Plus, Trash2, MapPin, AlertTriangle, Edit2 } from 'lucide-react';
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
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  
  // Category form
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newModality, setNewModality] = useState<FootballModality>('futbol_7');
  const [newDuration, setNewDuration] = useState(40);
  
  // Facility form
  const [newFacilityId, setNewFacilityId] = useState('');

  // Field management
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldFacilityId, setFieldFacilityId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldSurface, setFieldSurface] = useState<FieldSurface>('cesped_artificial');
  const [fieldOrder, setFieldOrder] = useState(0);

  // Match form
  const [newMatchHomeTeamId, setNewMatchHomeTeamId] = useState('');
  const [newMatchAwayTeamId, setNewMatchAwayTeamId] = useState('');
  const [newMatchPhase, setNewMatchPhase] = useState<string>('group');
  const [newMatchGroup, setNewMatchGroup] = useState('');
  const [newMatchCategoryId, setNewMatchCategoryId] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('');
  const [newMatchFieldId, setNewMatchFieldId] = useState('');
  const [newMatchHalves, setNewMatchHalves] = useState(1);
  const [newMatchDuration, setNewMatchDuration] = useState(40);
  const [scheduleConflict, setScheduleConflict] = useState<string | null>(null);
  
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

  // Field management in facilities
  const handleAddFieldToFacility = (facilityId: string) => {
    const facility = eventFacilities.find((ef: any) => ef.facility?.id === facilityId)?.facility;
    const fieldsCount = facility?.fields?.length || 0;
    if (fieldsCount >= 20) {
      toast({ title: 'Límite alcanzado', description: 'Máximo 20 campos por instalación', variant: 'destructive' });
      return;
    }
    setFieldFacilityId(facilityId);
    setEditingFieldId(null);
    setFieldName(`Campo ${fieldsCount + 1}`);
    setFieldSurface('cesped_artificial');
    setFieldOrder(fieldsCount + 1);
    setFieldDialogOpen(true);
  };

  const handleEditField = (field: any) => {
    setEditingFieldId(field.id);
    setFieldFacilityId(field.facility_id);
    setFieldName(field.name);
    setFieldSurface(field.surface);
    setFieldOrder(field.display_order || 0);
    setFieldDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!fieldName.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      if (editingFieldId) {
        await facilityService.updateField(editingFieldId, { name: fieldName, surface: fieldSurface, display_order: fieldOrder });
        toast({ title: 'Campo actualizado' });
      } else {
        await facilityService.createField({ facility_id: fieldFacilityId, name: fieldName, surface: fieldSurface, display_order: fieldOrder });
        toast({ title: 'Campo creado' });
      }
      setFieldDialogOpen(false);
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar el campo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('¿Eliminar este campo?')) return;
    try {
      await facilityService.deleteField(fieldId);
      toast({ title: 'Campo eliminado' });
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el campo', variant: 'destructive' });
    }
  };

  // Schedule conflict checking
  const checkConflict = async (fieldId: string, matchDate: string, duration: number) => {
    if (!fieldId || !matchDate) {
      setScheduleConflict(null);
      return;
    }
    try {
      const { data } = await supabase.rpc('check_match_schedule_conflict', {
        p_event_id: eventId,
        p_field_id: fieldId,
        p_match_date: new Date(matchDate).toISOString(),
        p_duration_minutes: duration,
      });
      if (data && data.length > 0) {
        const conflicting = data[0];
        const homeTeam = getTeamName(conflicting.home_team_id);
        const awayTeam = getTeamName(conflicting.away_team_id);
        setScheduleConflict(`⚠️ Conflicto: ${homeTeam} vs ${awayTeam} a las ${new Date(conflicting.scheduled_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      } else {
        setScheduleConflict(null);
      }
    } catch {
      setScheduleConflict(null);
    }
  };

  // Effect to auto-check conflicts when field/date/duration changes
  useEffect(() => {
    checkConflict(newMatchFieldId, newMatchDate, newMatchDuration);
  }, [newMatchFieldId, newMatchDate, newMatchDuration]);

  const handleUpdateGroup = async (eventTeamId: string, groupName: string) => {
    try {
      await tournamentService.updateEventTeam(eventTeamId, { group_name: groupName || null });
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el grupo', variant: 'destructive' });
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

  const handleCreateMatch = async () => {
    if (!newMatchHomeTeamId || !newMatchAwayTeamId) {
      toast({ title: 'Error', description: 'Selecciona equipo local y visitante', variant: 'destructive' });
      return;
    }
    if (newMatchHomeTeamId === newMatchAwayTeamId) {
      toast({ title: 'Error', description: 'El equipo local y visitante no pueden ser el mismo', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const matchData: any = {
        event_id: eventId,
        home_team_id: newMatchHomeTeamId,
        away_team_id: newMatchAwayTeamId,
        phase: newMatchPhase,
        status: 'scheduled',
        match_halves: newMatchHalves,
        match_duration_minutes: newMatchDuration,
      };
      if (newMatchGroup) matchData.group_name = newMatchGroup;
      if (newMatchCategoryId) matchData.category_id = newMatchCategoryId;
      if (newMatchDate) matchData.match_date = newMatchDate;
      if (newMatchFieldId) matchData.field_id = newMatchFieldId;
      matchData.match_number = matches.length + 1;

      await tournamentService.createMatch(matchData);
      toast({ title: 'Partido creado' });
      
      // Reset form
      setNewMatchHomeTeamId('');
      setNewMatchAwayTeamId('');
      setNewMatchPhase('group');
      setNewMatchGroup('');
      setNewMatchCategoryId('');
      setNewMatchDate('');
      setNewMatchFieldId('');
      setNewMatchHalves(1);
      setNewMatchDuration(40);
      setMatchDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error creando partido:', error);
      toast({ title: 'Error', description: 'No se pudo crear el partido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('¿Eliminar este partido?')) return;
    try {
      await tournamentService.deleteMatch(matchId);
      toast({ title: 'Partido eliminado' });
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  // Get all fields from event facilities
  const allFields = eventFacilities.flatMap((ef: any) => 
    (ef.facility?.fields || []).map((f: any) => ({
      ...f,
      facilityName: ef.facility?.name || '',
    }))
  );

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
                      <Select
                        value={selectedCategoryId || '__all__'}
                        onValueChange={(v) => setSelectedCategoryId(v === '__all__' ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas</SelectItem>
                          {eventCategories.map((ec) => (
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

          </div>

          {eventTeams.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">
                Clubes Inscritos ({eventTeams.length})
              </h3>
              <div className="space-y-2">
                {eventTeams.map(et => {
                  const team = teams.find(t => t.id === et.team_id);
                  const catName = eventCategories.find(ec => ec.id === et.category_id)?.category?.name;
                  return (
                    <div key={et.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">
                          {team?.name || 'Desconocido'}
                          {et.team_letter && <span className="text-muted-foreground ml-1">{et.team_letter}</span>}
                        </span>
                        {catName && (
                          <Badge variant="outline" className="ml-2 text-xs">{catName}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Grupo:</Label>
                        <Input
                          className="w-16 h-8 text-center text-sm"
                          placeholder="-"
                          maxLength={2}
                          value={et.group_name || ''}
                          onChange={(e) => handleUpdateGroup(et.id, e.target.value.toUpperCase())}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={async () => {
                          if (!confirm('¿Eliminar este club del torneo?')) return;
                          await tournamentService.removeTeamFromEvent(et.id);
                          await loadData();
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Resumen de grupos */}
              {Object.keys(groupedTeams).filter(g => g !== 'Sin grupo').length > 0 && (
                <div className="mt-6">
                  <h4 className="font-bold mb-3">Clasificación por Grupos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(groupedTeams).filter(([g]) => g !== 'Sin grupo').sort().map(([group, gTeams]) => (
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
                            {gTeams.map((et, index) => (
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
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* Calendario */}
        <TabsContent value="calendario" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={eventTeams.length < 2}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Partido
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nuevo Partido</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Equipo Local</Label>
                      <Select value={newMatchHomeTeamId} onValueChange={setNewMatchHomeTeamId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {eventTeams.map(et => (
                            <SelectItem key={et.id} value={et.team_id}>
                              {getTeamName(et.team_id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Equipo Visitante</Label>
                      <Select value={newMatchAwayTeamId} onValueChange={setNewMatchAwayTeamId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {eventTeams.map(et => (
                            <SelectItem key={et.id} value={et.team_id}>
                              {getTeamName(et.team_id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fase</Label>
                      <Select value={newMatchPhase} onValueChange={setNewMatchPhase}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries({
                            'group': 'Fase de Grupos',
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
                          }).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Grupo (opcional)</Label>
                      <Input
                        placeholder="Ej: A, B, C..."
                        value={newMatchGroup}
                        onChange={(e) => setNewMatchGroup(e.target.value.toUpperCase())}
                        maxLength={2}
                      />
                    </div>
                  </div>

                  {eventCategories.length > 0 && (
                    <div>
                      <Label>Categoría (opcional)</Label>
                      <Select value={newMatchCategoryId || '__none__'} onValueChange={(v) => setNewMatchCategoryId(v === '__none__' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin categoría</SelectItem>
                          {eventCategories.map(ec => (
                            <SelectItem key={ec.id} value={ec.id}>
                              {ec.category?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {allFields.length > 0 && (
                    <div>
                      <Label>Instalación y Campo</Label>
                      <Select value={newMatchFieldId || '__none__'} onValueChange={(v) => setNewMatchFieldId(v === '__none__' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin asignar</SelectItem>
                          {eventFacilities.map((ef: any) => (
                            ef.facility?.fields?.map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>
                                📍 {ef.facility?.name} → {f.name}
                              </SelectItem>
                            ))
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Fecha y hora de inicio</Label>
                    <Input
                      type="datetime-local"
                      value={newMatchDate}
                      onChange={(e) => setNewMatchDate(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Formato de partido</Label>
                      <Select value={String(newMatchHalves)} onValueChange={(v) => setNewMatchHalves(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 solo tiempo</SelectItem>
                          <SelectItem value="2">Partido completo (2 tiempos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duración total (min)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="120"
                        value={newMatchDuration}
                        onChange={(e) => setNewMatchDuration(parseInt(e.target.value) || 40)}
                      />
                    </div>
                  </div>

                  <Button onClick={handleCreateMatch} disabled={loading} className="w-full">
                    Crear Partido
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMatch(match.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                            {match.match_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                📅 {new Date(match.match_date).toLocaleString('es-ES')}
                                {match.field_id && (() => {
                                  const field = allFields.find((f: any) => f.id === match.field_id);
                                  return field ? ` • 📍 ${field.facilityName} → ${field.name}` : '';
                                })()}
                                {' • '}⏱️ {match.match_duration_minutes || 40} min ({match.match_halves === 2 ? '2 tiempos' : '1 tiempo'})
                              </p>
                            )}
                            {!match.match_date && match.field_id && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {(() => {
                                  const field = allFields.find((f: any) => f.id === match.field_id);
                                  return field ? `📍 ${field.facilityName} → ${field.name}` : '';
                                })()}
                                {' • '}⏱️ {match.match_duration_minutes || 40} min ({match.match_halves === 2 ? '2 tiempos' : '1 tiempo'})
                              </p>
                            )}
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
                No hay partidos programados. Crea los emparejamientos de forma manual.
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
