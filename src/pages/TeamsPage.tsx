import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamService } from '@/services/teamService';
import { Team } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Calendar, Palette, Loader2, Search, MapPin } from 'lucide-react';

export const TeamsPage = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const data = await teamService.getClubs();
      setTeams(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los equipos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.city?.toLowerCase().includes(q) ||
      t.province?.toLowerCase().includes(q) ||
      t.autonomous_community?.toLowerCase().includes(q) ||
      t.country?.toLowerCase().includes(q)
    );
  }, [teams, search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando equipos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-16">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-12 h-12 text-emerald-600" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Nuestros Equipos
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Conoce a todos los equipos que participan en los torneos de FEMD
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary"></div>
            <span>{teams.length} Clubes Registrados</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary"></div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o localidad..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">
              {search ? 'No se encontraron clubes con esa búsqueda' : 'No hay equipos registrados aún'}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team, index) => (
              <Card 
                key={team.id}
                className="group hover-scale overflow-hidden border-2 hover:border-emerald-600/50 transition-all duration-300 hover:shadow-xl animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(`/equipos/${team.id}`)}
              >
                <CardHeader className="relative pb-0">
                  {/* Team Logo */}
                  <div className="flex justify-center mb-4">
                    {team.logo_url ? (
                      <div className="relative w-32 h-32 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden ring-4 ring-background shadow-lg group-hover:ring-emerald-600/30 transition-all duration-300">
                        <img 
                          src={team.logo_url} 
                          alt={team.name}
                          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 flex items-center justify-center ring-4 ring-background shadow-lg">
                        <Users className="w-16 h-16 text-emerald-600" />
                      </div>
                    )}
                  </div>

                  {/* Team Name */}
                  <CardTitle className="text-center text-2xl group-hover:text-emerald-600 transition-colors duration-300">
                    {team.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 pt-6">
                  {/* Description */}
                  {team.description && (
                    <p className="text-sm text-muted-foreground text-center line-clamp-3 leading-relaxed">
                      {team.description}
                    </p>
                  )}

                  {/* Team Details */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    {team.colors && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Palette className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Colores</p>
                          <p className="text-sm font-medium">{team.colors}</p>
                        </div>
                      </div>
                    )}

                    {team.founded_year && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Fundación</p>
                          <p className="text-sm font-medium">{team.founded_year}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats Badge */}
                  <div className="pt-4 flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/10 rounded-full">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-emerald-600">
                        Activo
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        {teams.length > 0 && (
          <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: '600ms' }}>
            <div className="inline-block p-8 bg-gradient-to-br from-emerald-600/10 to-emerald-600/5 rounded-2xl border border-emerald-600/20">
              <p className="text-lg text-muted-foreground mb-4">
                ¿Quieres que tu equipo participe en nuestros torneos?
              </p>
              <a 
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                Contáctanos
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
