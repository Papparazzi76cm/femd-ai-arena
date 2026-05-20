import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { sponsorService } from "@/services/sponsorService";
import { Sponsor } from "@/types/database";

const TIER_GROUPS: Array<{ key: string; label: string }> = [
  { key: 'premium', label: 'Premium' },
  { key: 'oro', label: 'Oro' },
  { key: 'partner', label: 'Partners' },
];

const normalizeTier = (t: string | null | undefined) => {
  const v = (t || '').toLowerCase().trim();
  if (v === 'premium' || v === 'oro' || v === 'partner') return v;
  // Legacy fallbacks
  if (v === 'plata' || v === 'silver' || v === 'bronce' || v === 'bronze' || v === '') return 'partner';
  if (v === 'gold') return 'oro';
  return 'partner';
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

  const grouped = useMemo(() => {
    const map: Record<string, Sponsor[]> = { premium: [], oro: [], partner: [] };
    sponsors.forEach(s => map[normalizeTier(s.tier)].push(s));
    return map;
  }, [sponsors]);

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
          </p>
        </div>

        {sponsors.length > 0 ? (
          <div className="space-y-12">
            {TIER_GROUPS.map(group => {
              const list = grouped[group.key];
              if (!list || list.length === 0) return null;
              return (
                <section key={group.key} className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">{group.label}</h2>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {list.map((sponsor, index) => (
                      <Card
                        key={sponsor.id}
                        className={`hover-lift hover-glow animate-fade-in ${group.key === 'premium' ? 'ring-2 ring-primary/30' : ''}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <CardHeader className="pb-2 p-3 sm:p-6">
                          {sponsor.logo_url ? (
                            <div className="w-full h-20 sm:h-28 flex items-center justify-center">
                              <img src={sponsor.logo_url} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-full h-20 sm:h-28 flex items-center justify-center bg-muted rounded-lg">
                              <span className="text-xl sm:text-2xl font-bold text-muted-foreground">{sponsor.name.charAt(0)}</span>
                            </div>
                          )}
                          <CardTitle className="text-center text-xs sm:text-sm mt-2 sm:mt-3 line-clamp-2">{sponsor.name}</CardTitle>
                        </CardHeader>
                        {sponsor.website && (
                          <CardContent className="pt-0 pb-3 sm:pb-4 px-3 sm:px-6">
                            <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-primary hover:underline text-[11px] sm:text-xs">
                              <span>Visitar web</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-20">
            <p className="text-muted-foreground">No hay patrocinadores registrados en este momento.</p>
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
