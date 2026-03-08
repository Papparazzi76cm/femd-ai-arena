import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Award, Star, Crown } from "lucide-react";
import { sponsorService } from "@/services/sponsorService";
import { Sponsor } from "@/types/database";

const tierInfo = {
  Oro: {
    icon: Crown,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    benefits: [
      "Logo destacado en todos los materiales del torneo",
      "Presencia en redes sociales durante todo el evento",
      "Espacio publicitario premium en las instalaciones",
      "Menciones especiales en ceremonias",
      "Stand exclusivo en el área del evento"
    ]
  },
  Plata: {
    icon: Award,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
    borderColor: "border-gray-400/20",
    benefits: [
      "Logo en materiales promocionales",
      "Presencia en redes sociales",
      "Espacio publicitario en instalaciones",
      "Menciones durante el evento"
    ]
  },
  Bronce: {
    icon: Star,
    color: "text-orange-600",
    bgColor: "bg-orange-600/10",
    borderColor: "border-orange-600/20",
    benefits: [
      "Logo en materiales del torneo",
      "Mención en redes sociales",
      "Reconocimiento durante el evento"
    ]
  }
};

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

  const tierMap: Record<string, string> = { gold: 'Oro', silver: 'Plata', bronze: 'Bronce' };
  
  const groupedSponsors = sponsors.reduce((acc, sponsor) => {
    const tier = tierMap[sponsor.tier || ''] || "Otros";
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(sponsor);
    return acc;
  }, {} as Record<string, Sponsor[]>);

  const tierOrder = ["Oro", "Plata", "Bronce", "Otros"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando patrocinadores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Nuestros Patrocinadores
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Gracias a nuestros patrocinadores por hacer posible cada torneo y evento deportivo.
            Su apoyo es fundamental para el desarrollo del fútbol en nuestra comunidad.
          </p>
        </div>

        {/* Sponsors by Tier */}
        {tierOrder.map((tier) => {
          if (!groupedSponsors[tier] || groupedSponsors[tier].length === 0) return null;
          
          const tierData = tierInfo[tier as keyof typeof tierInfo];
          const TierIcon = tierData?.icon;

          return (
            <section key={tier} className="mb-16 animate-fade-in">
              {/* Tier Header */}
              <div className="flex items-center gap-4 mb-8">
                {TierIcon && (
                  <div className={`w-12 h-12 rounded-full ${tierData.bgColor} flex items-center justify-center`}>
                    <TierIcon className={`h-6 w-6 ${tierData.color}`} />
                  </div>
                )}
                <div>
                  <h2 className="text-3xl font-bold text-foreground">{tier}</h2>
                  {tierData && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {tierData.benefits.length} beneficios exclusivos
                    </p>
                  )}
                </div>
              </div>

              {/* Tier Benefits */}
              {tierData && (
                <Card className={`mb-8 border-2 ${tierData.borderColor} ${tierData.bgColor}`}>
                  <CardHeader>
                    <CardTitle className="text-xl">Beneficios del Nivel {tier}</CardTitle>
                    <CardDescription>
                      Lo que ofrecemos a nuestros patrocinadores nivel {tier}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid md:grid-cols-2 gap-3">
                      {tierData.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className={`mt-1 ${tierData.color}`}>✓</span>
                          <span className="text-sm text-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Sponsors Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedSponsors[tier].map((sponsor, index) => (
                  <Card 
                    key={sponsor.id}
                    className="hover-lift hover-glow animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      {sponsor.logo_url ? (
                        <div className="w-full h-32 flex items-center justify-center mb-4">
                          <img
                            src={sponsor.logo_url}
                            alt={sponsor.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center mb-4 bg-muted rounded-lg">
                          <span className="text-2xl font-bold text-muted-foreground">
                            {sponsor.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <CardTitle className="text-center">{sponsor.name}</CardTitle>
                      {sponsor.tier && (
                        <div className="flex justify-center mt-2">
                          <Badge variant="secondary">{sponsor.tier}</Badge>
                        </div>
                      )}
                    </CardHeader>
                    {sponsor.website && (
                      <CardContent>
                        <a
                          href={sponsor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 text-primary hover:underline"
                        >
                          <span className="text-sm">Visitar sitio web</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          );
        })}

        {sponsors.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              No hay patrocinadores registrados en este momento.
            </p>
          </div>
        )}

        {/* CTA Section */}
        <Card className="mt-16 gradient-emerald text-white border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-4">¿Quieres ser patrocinador?</CardTitle>
            <CardDescription className="text-white/90 text-lg">
              Únete a nuestro equipo de patrocinadores y ayuda a impulsar el fútbol local.
              Contáctanos para conocer más sobre nuestros paquetes de patrocinio.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
