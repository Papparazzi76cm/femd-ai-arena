import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, User, Users, Target, Shield, ChevronRight, Filter, X, SlidersHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PlayerWithTeam {
  id: string;
  name: string;
  position: string | null;
  number: number | null;
  photo_url: string | null;
  goals_scored: number | null;
  matches_played: number | null;
  team: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

interface TeamOption {
  id: string;
  name: string;
}

const POSITIONS = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

export const PlayersSearchPage = () => {
  const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [minGoals, setMinGoals] = useState<number>(0);
  const [minMatches, setMinMatches] = useState<number>(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Calculate max values for sliders
  const maxGoals = useMemo(() => Math.max(...players.map(p => p.goals_scored || 0), 50), [players]);
  const maxMatches = useMemo(() => Math.max(...players.map(p => p.matches_played || 0), 50), [players]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [playersRes, teamsRes] = await Promise.all([
        supabase
          .from('participants')
          .select(`
            id, name, position, number, photo_url, goals_scored, matches_played,
            team:teams(id, name, logo_url)
          `)
          .order('name'),
        supabase
          .from('teams')
          .select('id, name')
          .order('name')
      ]);

      if (playersRes.error) throw playersRes.error;
      if (teamsRes.error) throw teamsRes.error;
      
      setPlayers(playersRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = selectedPosition !== 'all' || selectedTeam !== 'all' || minGoals > 0 || minMatches > 0;

  const clearFilters = () => {
    setSelectedPosition('all');
    setSelectedTeam('all');
    setMinGoals(0);
    setMinMatches(0);
  };

  const filteredPlayers = useMemo(() => {
    let result = players;
    
    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(player => 
        player.name.toLowerCase().includes(query) ||
        player.team?.name.toLowerCase().includes(query) ||
        player.position?.toLowerCase().includes(query)
      );
    }
    
    // Position filter
    if (selectedPosition !== 'all') {
      result = result.filter(player => player.position === selectedPosition);
    }
    
    // Team filter
    if (selectedTeam !== 'all') {
      result = result.filter(player => player.team?.id === selectedTeam);
    }
    
    // Goals filter
    if (minGoals > 0) {
      result = result.filter(player => (player.goals_scored || 0) >= minGoals);
    }
    
    // Matches filter
    if (minMatches > 0) {
      result = result.filter(player => (player.matches_played || 0) >= minMatches);
    }
    
    return result;
  }, [players, searchQuery, selectedPosition, selectedTeam, minGoals, minMatches]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Search className="w-10 h-10 text-emerald-600" />
            Buscador de Jugadores
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Encuentra a cualquier jugador por nombre, equipo o posición
          </p>
        </div>

        {/* Search and Filters */}
        <div className="max-w-4xl mx-auto mb-8 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre, equipo o posición..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
              maxLength={100}
            />
          </div>

          {/* Filter Toggle */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros avanzados
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1">
                      {[selectedPosition !== 'all', selectedTeam !== 'all', minGoals > 0, minMatches > 0].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                  <X className="w-4 h-4" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            <CollapsibleContent className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Position Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Posición
                      </label>
                      <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las posiciones" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las posiciones</SelectItem>
                          {POSITIONS.map(pos => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Team Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Equipo
                      </label>
                      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los equipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los equipos</SelectItem>
                          {teams.map(team => (
                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Goals Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Mínimo goles: {minGoals}
                      </label>
                      <Slider
                        value={[minGoals]}
                        onValueChange={(v) => setMinGoals(v[0])}
                        max={maxGoals}
                        step={1}
                        className="py-2"
                      />
                    </div>

                    {/* Matches Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Mínimo partidos: {minMatches}
                      </label>
                      <Slider
                        value={[minMatches]}
                        onValueChange={(v) => setMinMatches(v[0])}
                        max={maxMatches}
                        step={1}
                        className="py-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <p className="text-sm text-muted-foreground text-center">
            {filteredPlayers.length} jugador{filteredPlayers.length !== 1 ? 'es' : ''} encontrado{filteredPlayers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 animate-pulse text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando jugadores...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">
              {searchQuery ? 'No se encontraron jugadores' : 'No hay jugadores registrados'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlayers.map((player) => (
              <Link key={player.id} to={`/jugador/${player.id}`}>
                <Card className="hover:ring-2 hover:ring-emerald-600 transition-all cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Player Photo */}
                      {player.photo_url ? (
                        <img 
                          src={player.photo_url} 
                          alt={player.name}
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {player.number && (
                            <span className="text-lg font-bold text-primary">#{player.number}</span>
                          )}
                          <h3 className="font-semibold truncate">{player.name}</h3>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                          {player.position && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              {player.position}
                            </Badge>
                          )}
                          {player.team && (
                            <Badge className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {player.team.name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {player.goals_scored || 0} goles
                          </span>
                          <span>{player.matches_played || 0} PJ</span>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
