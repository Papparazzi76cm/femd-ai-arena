import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { rosterService } from '@/services/rosterService';
import { EventTeam } from '@/types/tournament';
import { Team, EventCategory, Participant, RosterRole, StaffPosition, TeamRoster } from '@/types/database';
import { Users, Plus, Trash2, Search, UserPlus, ShieldCheck, Star, ChevronDown, ChevronUp } from 'lucide-react';

interface TournamentRosterManagerProps {
  eventId: string;
  eventTeams: EventTeam[];
  teams: Team[];
  eventCategories: EventCategory[];
}

const STAFF_POSITIONS: Record<StaffPosition, string> = {
  primer_entrenador: 'Primer Entrenador',
  segundo_entrenador: 'Segundo Entrenador',
  delegado: 'Delegado',
  auxiliar: 'Auxiliar',
};

export const TournamentRosterManager = ({
  eventId,
  eventTeams,
  teams,
  eventCategories,
}: TournamentRosterManagerProps) => {
  const { toast } = useToast();
  const [selectedEventTeamId, setSelectedEventTeamId] = useState<string>('');
  const [roster, setRoster] = useState<TeamRoster[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Add player dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [searching, setSearching] = useState(false);

  // New participant form
  const [newName, setNewName] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newJerseyNumber, setNewJerseyNumber] = useState<number | undefined>();
  const [newRosterRole, setNewRosterRole] = useState<RosterRole>('player');
  const [newStaffPosition, setNewStaffPosition] = useState<StaffPosition | ''>('');
  const [newTeamId, setNewTeamId] = useState('');

  // Selected participant from search
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [addJerseyNumber, setAddJerseyNumber] = useState<number | undefined>();
  const [addRosterRole, setAddRosterRole] = useState<RosterRole>('player');
  const [addStaffPosition, setAddStaffPosition] = useState<StaffPosition | ''>('');

  const loadRoster = async (eventTeamId: string) => {
    try {
      setLoadingRoster(true);
      const data = await rosterService.getTeamRoster(eventTeamId);
      setRoster(data);
    } catch (error) {
      console.error('Error loading roster:', error);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (selectedEventTeamId) {
      loadRoster(selectedEventTeamId);
    }
  }, [selectedEventTeamId]);

  const getTeamName = (et: EventTeam) => {
    const team = teams.find(t => t.id === et.team_id);
    const name = team?.name || 'Desconocido';
    return et.team_letter ? `${name} ${et.team_letter}` : name;
  };

  // Get teams participating in this event (for the "club" selector when creating new participant)
  const participatingTeamIds = useMemo(() => {
    return [...new Set(eventTeams.map(et => et.team_id))];
  }, [eventTeams]);

  const participatingTeams = useMemo(() => {
    return teams.filter(t => participatingTeamIds.includes(t.id));
  }, [teams, participatingTeamIds]);

  // Search participants by DNI or name
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .or(`dni.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .order('name')
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching:', error);
      toast({ title: 'Error', description: 'Error en la búsqueda', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setAddJerseyNumber(participant.number || undefined);
    setAddRosterRole('player');
    setAddStaffPosition('');
  };

  const handleAddFromSearch = async () => {
    if (!selectedParticipant || !selectedEventTeamId) return;
    try {
      const { error } = await supabase
        .from('team_rosters')
        .insert({
          event_team_id: selectedEventTeamId,
          participant_id: selectedParticipant.id,
          jersey_number: addRosterRole === 'player' ? addJerseyNumber : null,
          is_captain: false,
          roster_role: addRosterRole,
          staff_position: addRosterRole === 'staff' ? addStaffPosition || null : null,
        });

      if (error) throw error;
      toast({ title: 'Añadido a la plantilla' });
      setAddDialogOpen(false);
      resetAddForm();
      loadRoster(selectedEventTeamId);
    } catch (error: any) {
      if (error?.code === '23505') {
        toast({ title: 'Error', description: 'Este participante ya está en la plantilla', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'No se pudo añadir', variant: 'destructive' });
      }
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim() || !selectedEventTeamId) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    try {
      // Create participant
      const participantData: any = {
        name: newName.trim(),
        dni: newDni.trim() || null,
        birth_date: newBirthDate || null,
        position: newRosterRole === 'player' ? (newPosition || null) : null,
        number: newRosterRole === 'player' ? newJerseyNumber : null,
        team_id: newTeamId || null,
      };

      const { data: participant, error: createError } = await supabase
        .from('participants')
        .insert(participantData)
        .select()
        .single();

      if (createError) throw createError;

      // Add to roster
      const { error: rosterError } = await supabase
        .from('team_rosters')
        .insert({
          event_team_id: selectedEventTeamId,
          participant_id: participant.id,
          jersey_number: newRosterRole === 'player' ? newJerseyNumber : null,
          is_captain: false,
          roster_role: newRosterRole,
          staff_position: newRosterRole === 'staff' ? newStaffPosition || null : null,
        });

      if (rosterError) throw rosterError;

      toast({ title: 'Participante creado y añadido a la plantilla' });
      setAddDialogOpen(false);
      resetAddForm();
      loadRoster(selectedEventTeamId);
    } catch (error) {
      console.error('Error creating participant:', error);
      toast({ title: 'Error', description: 'No se pudo crear el participante', variant: 'destructive' });
    }
  };

  const handleRemoveFromRoster = async (rosterId: string) => {
    if (!confirm('¿Eliminar de la plantilla?')) return;
    try {
      await rosterService.removePlayerFromRoster(rosterId);
      toast({ title: 'Eliminado de la plantilla' });
      loadRoster(selectedEventTeamId);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const handleToggleCaptain = async (rosterId: string, currentValue: boolean) => {
    try {
      await rosterService.updateRosterEntry(rosterId, { is_captain: !currentValue });
      loadRoster(selectedEventTeamId);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const resetAddForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedParticipant(null);
    setAddMode('search');
    setNewName('');
    setNewDni('');
    setNewBirthDate('');
    setNewPosition('');
    setNewJerseyNumber(undefined);
    setNewRosterRole('player');
    setNewStaffPosition('');
    setNewTeamId('');
    setAddJerseyNumber(undefined);
    setAddRosterRole('player');
    setAddStaffPosition('');
  };

  const toggleTeamExpansion = (eventTeamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(eventTeamId)) {
        next.delete(eventTeamId);
      } else {
        next.add(eventTeamId);
        setSelectedEventTeamId(eventTeamId);
      }
      return next;
    });
  };

  const players = roster.filter(r => (r as any).roster_role === 'player' || !(r as any).roster_role);
  const staff = roster.filter(r => (r as any).roster_role === 'staff');

  // Group event teams by category
  const teamsByCategory = useMemo(() => {
    const grouped: Record<string, EventTeam[]> = {};
    eventTeams.forEach(et => {
      const catId = et.category_id || '__none__';
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(et);
    });
    return grouped;
  }, [eventTeams]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Plantillas del Torneo
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Gestiona la plantilla de cada equipo para este torneo. Puedes buscar jugadores existentes por DNI o nombre, o crear nuevos participantes.
        </p>

        {/* Teams list */}
        <div className="space-y-2">
          {Object.entries(teamsByCategory).map(([catId, catTeams]) => {
            const category = eventCategories.find(ec => ec.id === catId);
            return (
              <div key={catId}>
                {catId !== '__none__' && category && (
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2 mt-3">
                    {category.category?.name}
                  </h4>
                )}
                <div className="space-y-1">
                  {catTeams.map(et => {
                    const isExpanded = expandedTeams.has(et.id);
                    const isSelected = selectedEventTeamId === et.id;
                    return (
                      <div key={et.id}>
                        <button
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${isExpanded ? 'bg-accent border-accent' : 'bg-card hover:bg-muted/50'}`}
                          onClick={() => toggleTeamExpansion(et.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getTeamName(et)}</span>
                            {et.group_name && (
                              <Badge variant="outline" className="text-xs">Grupo {et.group_name}</Badge>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isExpanded && isSelected && (
                          <div className="mt-2 ml-2 border-l-2 border-accent pl-4 pb-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Plantilla ({roster.length} miembros)
                              </span>
                              <Button
                                size="sm"
                                onClick={() => { setAddDialogOpen(true); resetAddForm(); }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Añadir
                              </Button>
                            </div>

                            {loadingRoster ? (
                              <p className="text-sm text-muted-foreground">Cargando...</p>
                            ) : roster.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Sin miembros. Añade jugadores o cuerpo técnico.</p>
                            ) : (
                              <>
                                {/* Players */}
                                {players.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-bold uppercase text-muted-foreground mb-1">Jugadores ({players.length})</h5>
                                    <div className="space-y-1">
                                      {players.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-card rounded border text-sm">
                                          <div className="flex items-center gap-2">
                                            {r.jersey_number != null && (
                                              <Badge variant="secondary" className="text-xs w-7 h-7 flex items-center justify-center p-0">
                                                {r.jersey_number}
                                              </Badge>
                                            )}
                                            <span className="font-medium">{r.participant?.name || '?'}</span>
                                            {r.participant?.position && (
                                              <span className="text-xs text-muted-foreground">({r.participant.position})</span>
                                            )}
                                            {r.is_captain && (
                                              <Badge className="text-xs" variant="default">
                                                <Star className="w-3 h-3 mr-0.5" /> C
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              title="Capitán"
                                              onClick={() => handleToggleCaptain(r.id, r.is_captain)}
                                            >
                                              <Star className={`w-3.5 h-3.5 ${r.is_captain ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleRemoveFromRoster(r.id)}
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Staff */}
                                {staff.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-bold uppercase text-muted-foreground mb-1">Cuerpo Técnico ({staff.length})</h5>
                                    <div className="space-y-1">
                                      {staff.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-card rounded border text-sm">
                                          <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-medium">{r.participant?.name || '?'}</span>
                                            {(r as any).staff_position && (
                                              <Badge variant="outline" className="text-xs">
                                                {STAFF_POSITIONS[(r as any).staff_position as StaffPosition] || (r as any).staff_position}
                                              </Badge>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleRemoveFromRoster(r.id)}
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add participant dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir a la Plantilla</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              variant={addMode === 'search' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddMode('search')}
            >
              <Search className="w-4 h-4 mr-1" />
              Buscar existente
            </Button>
            <Button
              variant={addMode === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddMode('create')}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Crear nuevo
            </Button>
          </div>

          {addMode === 'search' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por DNI o nombre..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      className={`w-full text-left p-2 rounded text-sm hover:bg-muted transition-colors ${selectedParticipant?.id === p.id ? 'bg-accent' : ''}`}
                      onClick={() => handleSelectParticipant(p)}
                    >
                      <span className="font-medium">{p.name}</span>
                      {p.dni && <span className="text-muted-foreground ml-2">DNI: {p.dni}</span>}
                      {p.position && <span className="text-muted-foreground ml-2">({p.position})</span>}
                    </button>
                  ))}
                </div>
              )}

              {selectedParticipant && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm font-medium">Seleccionado: {selectedParticipant.name}</p>

                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={addRosterRole} onValueChange={(v: RosterRole) => setAddRosterRole(v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Jugador</SelectItem>
                        <SelectItem value="staff">Cuerpo Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {addRosterRole === 'player' && (
                    <div>
                      <Label className="text-xs">Dorsal</Label>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={addJerseyNumber ?? ''}
                        onChange={e => setAddJerseyNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="h-9"
                      />
                    </div>
                  )}

                  {addRosterRole === 'staff' && (
                    <div>
                      <Label className="text-xs">Cargo</Label>
                      <Select value={addStaffPosition} onValueChange={(v) => setAddStaffPosition(v as StaffPosition)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STAFF_POSITIONS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button onClick={handleAddFromSearch} className="w-full">
                    Añadir a la plantilla
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Tipo <span className="text-destructive">*</span></Label>
                <Select value={newRosterRole} onValueChange={(v: RosterRole) => setNewRosterRole(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Jugador</SelectItem>
                    <SelectItem value="staff">Cuerpo Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRosterRole === 'staff' && (
                <div>
                  <Label className="text-xs">Cargo <span className="text-destructive">*</span></Label>
                  <Select value={newStaffPosition} onValueChange={(v) => setNewStaffPosition(v as StaffPosition)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STAFF_POSITIONS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs">Nombre completo <span className="text-destructive">*</span></Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">DNI</Label>
                  <Input value={newDni} onChange={e => setNewDni(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Fecha de nacimiento</Label>
                  <Input type="date" value={newBirthDate} onChange={e => setNewBirthDate(e.target.value)} className="h-9" />
                </div>
              </div>

              {newRosterRole === 'player' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Posición</Label>
                    <Select value={newPosition} onValueChange={setNewPosition}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portero">Portero</SelectItem>
                        <SelectItem value="defensa">Defensa</SelectItem>
                        <SelectItem value="centrocampista">Centrocampista</SelectItem>
                        <SelectItem value="delantero">Delantero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Dorsal</Label>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={newJerseyNumber ?? ''}
                      onChange={e => setNewJerseyNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Club</Label>
                <Select value={newTeamId || '__none__'} onValueChange={v => setNewTeamId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar club..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin club</SelectItem>
                    {participatingTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Solo clubes participantes en este torneo</p>
              </div>

              <Button
                onClick={handleCreateAndAdd}
                disabled={!newName.trim()}
                className="w-full"
              >
                Crear y añadir a la plantilla
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
