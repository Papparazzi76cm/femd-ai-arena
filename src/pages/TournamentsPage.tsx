import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, ArrowLeft, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventService } from "@/services/eventService";
import { Event } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Component for image with fallback
const TournamentThumbnail = ({ src, alt }: { src: string | null; alt: string }) => {
  const [hasError, setHasError] = useState(false);
  
  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
    />
  );
};

// Definición de torneos base con sus logos
interface TournamentBrand {
  slug: string;
  name: string;
  logoUrl: string;
  keywords: string[]; // Palabras clave para identificar eventos de este torneo
}

const tournamentBrands: TournamentBrand[] = [
  {
    slug: "copa-rioseco",
    name: "Copa Internacional Rioseco Caramanzana",
    logoUrl: "/logos-torneos/copa-rioseco.png",
    keywords: ["rioseco", "caramanzana"],
  },
  {
    slug: "villa-aranda",
    name: "Torneo Internacional Villa de Aranda",
    logoUrl: "/logos-torneos/villa-aranda.png",
    keywords: ["villa de aranda", "aranda"],
  },
  {
    slug: "medina-cup",
    name: "Medina International Cup",
    logoUrl: "/logos-torneos/medina-cup.png",
    keywords: ["medina"],
  },
  {
    slug: "copa-cyl",
    name: "Copa Castilla y León",
    logoUrl: "/logos-torneos/copa-cyl.png",
    keywords: ["copa cyl", "castilla y león"],
  },
];

// Función para identificar a qué torneo pertenece un evento
function getTournamentBrand(eventTitle: string): TournamentBrand | null {
  const titleLower = eventTitle.toLowerCase();
  for (const brand of tournamentBrands) {
    if (brand.keywords.some(keyword => titleLower.includes(keyword))) {
      return brand;
    }
  }
  return null;
}

// Función para extraer la temporada/año del título
function extractSeason(eventTitle: string): string {
  const seasonMatch = eventTitle.match(/(\d{4}\/\d{4}|\d{4})/);
  return seasonMatch ? seasonMatch[1] : "";
}

// Agrupar eventos por temporada
interface SeasonGroup {
  season: string;
  events: Event[];
}

function groupEventsBySeason(events: Event[]): SeasonGroup[] {
  const groups: Record<string, Event[]> = {};
  
  events.forEach(event => {
    const season = extractSeason(event.title) || "Sin temporada";
    if (!groups[season]) {
      groups[season] = [];
    }
    groups[season].push(event);
  });
  
  // Ordenar por temporada descendente
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([season, events]) => ({ season, events }));
}

export function TournamentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBrandIndex, setCurrentBrandIndex] = useState(0);
  
  const selectedTournament = searchParams.get("torneo");

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await eventService.getAll();
        setEvents(data);
      } catch (error) {
        console.error("Error loading events:", error);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Si hay un torneo seleccionado, filtrar eventos
  const selectedBrand = selectedTournament 
    ? tournamentBrands.find(b => b.slug === selectedTournament)
    : null;

  const filteredEvents = selectedBrand
    ? events.filter(event => {
        const brand = getTournamentBrand(event.title);
        return brand?.slug === selectedBrand.slug;
      })
    : events;

  const seasonGroups = groupEventsBySeason(filteredEvents);

  const nextBrand = () => {
    setCurrentBrandIndex((prev) => (prev + 1) % tournamentBrands.length);
  };

  const prevBrand = () => {
    setCurrentBrandIndex((prev) => (prev - 1 + tournamentBrands.length) % tournamentBrands.length);
  };

  const getSlidePosition = (index: number) => {
    const diff = index - currentBrandIndex;
    const total = tournamentBrands.length;
    let normalizedDiff = diff;
    if (diff > total / 2) normalizedDiff = diff - total;
    if (diff < -total / 2) normalizedDiff = diff + total;
    return normalizedDiff;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando torneos...</p>
      </div>
    );
  }

  // Vista de detalle de un torneo específico
  if (selectedBrand) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          {/* Header con botón de volver */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => setSearchParams({})}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Torneos
            </Button>
          </div>

          {/* Torneo Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="w-48 h-48 mx-auto mb-6 bg-card rounded-2xl p-4 shadow-lg flex items-center justify-center">
              <img
                src={selectedBrand.logoUrl}
                alt={selectedBrand.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {selectedBrand.name}
            </h1>
            <p className="text-xl text-muted-foreground">
              Selecciona una edición para ver los detalles del torneo
            </p>
          </div>

          {/* Ediciones por temporada */}
          {seasonGroups.length > 0 ? (
            <div className="space-y-12">
              {seasonGroups.map(({ season, events }) => (
                <section key={season} className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-6">
                    <Trophy className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">
                      Temporada {season}
                    </h2>
                    <Badge variant="secondary">{events.length} categorías</Badge>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event, index) => {
                      const isPast = new Date(event.date) < new Date();
                      return (
                        <Link key={event.id} to={`/torneos/${event.id}`}>
                          <Card
                            className={`hover-lift animate-fade-in cursor-pointer h-full transition-all overflow-hidden ${
                              isPast ? "opacity-80 hover:opacity-100" : "hover-glow"
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {!isPast && <div className="h-1 gradient-gold" />}
                            <div className="flex">
                              {/* Miniatura del cartel */}
                              <div className="w-16 h-20 flex-shrink-0 overflow-hidden">
                                <TournamentThumbnail src={event.poster_url} alt={event.title} />
                              </div>
                              
                              {/* Contenido */}
                              <div className="flex-1">
                                <CardHeader className="pb-2 pt-3 px-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base line-clamp-2">
                                      {event.title.replace(selectedBrand.name, "").trim()}
                                    </CardTitle>
                                    <Badge variant={isPast ? "outline" : "default"} className="shrink-0 text-xs">
                                      {isPast ? "Finalizado" : "Próximo"}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-1 pt-0 px-3 pb-3">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3 text-primary" />
                                    <span>
                                      {format(new Date(event.date), "d 'de' MMMM, yyyy", {
                                        locale: es,
                                      })}
                                    </span>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3 text-primary" />
                                      <span className="line-clamp-1">{event.location}</span>
                                    </div>
                                  )}
                                </CardContent>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">
                No hay ediciones registradas para este torneo
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista principal - Carrusel de torneos
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-gold mb-6">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Nuestros Torneos
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Descubre todos los torneos y eventos de fútbol que organizamos.
            Haz clic en un torneo para ver todas sus ediciones.
          </p>
        </div>

        {/* Tournament Brands Carousel */}
        <section className="mb-20">
          <div className="relative h-[400px] md:h-[450px] flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center perspective-container">
              {tournamentBrands.map((brand, index) => {
                const position = getSlidePosition(index);
                const isCenter = position === 0;
                const absPosition = Math.abs(position);
                
                return (
                  <div
                    key={brand.slug}
                    onClick={() => isCenter && setSearchParams({ torneo: brand.slug })}
                    className="carousel-slide absolute transition-all duration-700 ease-out cursor-pointer"
                    style={{
                      transform: `
                        translateX(${position * 280}px)
                        translateZ(${isCenter ? 0 : -200 - absPosition * 50}px)
                        rotateY(${position * -25}deg)
                        scale(${isCenter ? 1 : 0.8 - absPosition * 0.1})
                      `,
                      opacity: absPosition > 2 ? 0 : 1,
                      zIndex: 100 - absPosition * 10,
                      pointerEvents: isCenter ? "auto" : "none",
                    }}
                  >
                    <div className={`
                      w-[280px] md:w-[320px] h-[280px] md:h-[320px] 
                      rounded-2xl overflow-hidden bg-card
                      ${isCenter ? "shadow-2xl ring-4 ring-primary/30 hover:ring-primary/60" : "shadow-lg"}
                      transition-all duration-300 flex items-center justify-center p-8
                      group
                    `}>
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    {isCenter && (
                      <p className="text-center mt-4 text-lg font-semibold text-foreground max-w-[280px] mx-auto">
                        {brand.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 md:left-8 z-50 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-lg"
              onClick={prevBrand}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 md:right-8 z-50 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-lg"
              onClick={nextBrand}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {tournamentBrands.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentBrandIndex
                    ? "bg-primary w-8"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                onClick={() => setCurrentBrandIndex(index)}
              />
            ))}
          </div>
        </section>

        {/* Quick Access - Recent Events */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              Próximos Torneos
            </h2>
          </div>

          {(() => {
            const upcomingEvents = events
              .filter(event => new Date(event.date) >= new Date())
              .slice(0, 6);

            if (upcomingEvents.length === 0) {
              return (
                <p className="text-muted-foreground text-center py-8">
                  No hay torneos próximos programados
                </p>
              );
            }

            return (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event, index) => {
                  const brand = getTournamentBrand(event.title);
                  return (
                    <Link key={event.id} to={`/torneos/${event.id}`}>
                      <Card
                        className="hover-lift hover-glow animate-fade-in overflow-hidden cursor-pointer h-full"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="h-2 gradient-gold" />
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            {brand && (
                              <div className="w-12 h-12 bg-muted rounded-lg p-1 shrink-0 flex items-center justify-center">
                                <img
                                  src={brand.logoUrl}
                                  alt={brand.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>
                              {format(new Date(event.date), "d 'de' MMMM, yyyy", {
                                locale: es,
                              })}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="line-clamp-1">{event.location}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* Empty State */}
        {events.length === 0 && (
          <div className="text-center py-20">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground mb-2">
              No hay torneos registrados en este momento
            </p>
            <p className="text-sm text-muted-foreground">
              Pronto publicaremos nuevos eventos deportivos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
