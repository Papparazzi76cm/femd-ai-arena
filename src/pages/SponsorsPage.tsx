import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { sponsorService } from "@/services/sponsorService";
import { Sponsor } from "@/types/database";

export function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const data = await sponsorService.getAll();
        setSponsors(data);
      } catch (error) {
        console.error("Error loading sponsors:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSponsors();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando patrocinadores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 sm:py-20">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center mb-10 sm:mb-16 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Nuestros Patrocinadores
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto px-2">
            Gracias a nuestros patrocinadores por hacer posible cada torneo y evento deportivo.
            Su apoyo es fundamental para el desarrollo del fútbol en nuestra comunidad.
          </p>
        </div>

        {sponsors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {sponsors.map((sponsor, index) => (
              <Card
                key={sponsor.id}
                className="hover-lift hover-glow animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-2 p-3 sm:p-6">
                  {sponsor.logo_url ? (
                    <div className="w-full h-20 sm:h-28 flex items-center justify-center">
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-20 sm:h-28 flex items-center justify-center bg-muted rounded-lg">
                      <span className="text-xl sm:text-2xl font-bold text-muted-foreground">
                        {sponsor.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <CardTitle className="text-center text-xs sm:text-sm mt-2 sm:mt-3 line-clamp-2">{sponsor.name}</CardTitle>
                </CardHeader>
                {sponsor.website && (
                  <CardContent className="pt-0 pb-3 sm:pb-4 px-3 sm:px-6">
                    <a
                      href={sponsor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 text-primary hover:underline text-[11px] sm:text-xs"
                    >
                      <span>Visitar web</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-20">
            <p className="text-muted-foreground">
              No hay patrocinadores registrados en este momento.
            </p>
          </div>
        )}

        <Card className="mt-10 sm:mt-16 gradient-emerald text-white border-0">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-3xl mb-2 sm:mb-4">¿Quieres ser patrocinador?</CardTitle>
            <CardDescription className="text-white/90 text-sm sm:text-lg">
              Únete a nuestro equipo de patrocinadores y ayuda a impulsar el fútbol local.
              Contáctanos para conocer más sobre nuestros paquetes de patrocinio.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
