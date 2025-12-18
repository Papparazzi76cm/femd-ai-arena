import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, User, Users, Target, Shield, ChevronRight } from 'lucide-react';

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

export const PlayersSearchPage = () => {
  const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id, name, position, number, photo_url, goals_scored, matches_played,
          team:teams(id, name, logo_url)
        `)
        .order('name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    
    const query = searchQuery.toLowerCase().trim();
    return players.filter(player => 
      player.name.toLowerCase().includes(query) ||
      player.team?.name.toLowerCase().includes(query) ||
      player.position?.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

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

        {/* Search Input */}
        <div className="max-w-xl mx-auto mb-8">
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
          <p className="text-sm text-muted-foreground mt-2 text-center">
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
