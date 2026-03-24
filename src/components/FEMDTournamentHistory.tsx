import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Tournament brands with their logos and keywords for matching
const tournamentBrands = [
  {
    name: "Copa Internacional Rioseco Caramanzana",
    shortName: "Copa Rioseco",
    logoUrl: "/logos-torneos/copa-rioseco.png",
    keywords: ["rioseco", "caramanzana"],
  },
  {
    name: "Torneo Internacional Villa de Aranda",
    shortName: "Villa de Aranda",
    logoUrl: "/logos-torneos/villa-aranda.png",
    keywords: ["villa de aranda", "aranda"],
  },
  {
    name: "Medina International Cup",
    shortName: "Medina Cup",
    logoUrl: "/logos-torneos/medina-cup.png",
    keywords: ["medina"],
  },
  {
    name: "Copa CyL",
    shortName: "Copa CyL",
    logoUrl: "/logos-torneos/copa-cyl.png",
    keywords: ["copa cyl", "castilla y león", "castilla y leon"],
  },
];

function matchBrand(eventTitle: string) {
  const lower = eventTitle.toLowerCase();
  return tournamentBrands.find(b => b.keywords.some(k => lower.includes(k)));
}

interface TournamentEvent {
  id: string;
  title: string;
  date: string;
}

interface FEMDTournamentHistoryProps {
  events: TournamentEvent[];
  title?: string;
  description?: string;
}

export function FEMDTournamentHistory({ events, title = "Historial FEMD", description }: FEMDTournamentHistoryProps) {
  // Count participations per brand
  const brandCounts = tournamentBrands.map(brand => {
    const matchingEvents = events.filter(e => {
      const lower = e.title.toLowerCase();
      return brand.keywords.some(k => lower.includes(k));
    });
    return {
      ...brand,
      count: matchingEvents.length,
      events: matchingEvents,
    };
  });

  const totalParticipations = events.length;

  if (totalParticipations === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="default" className="text-sm px-3 py-1">
            {totalParticipations} torneo{totalParticipations !== 1 ? 's' : ''} FEMD
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {brandCounts.map((brand) => (
            <div
              key={brand.shortName}
              className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                brand.count > 0 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-muted/30 border-transparent opacity-50'
              }`}
            >
              <div className="w-12 h-12 mb-2 flex items-center justify-center">
                <img
                  src={brand.logoUrl}
                  alt={brand.shortName}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <p className="text-xs font-medium text-center leading-tight mb-1">{brand.shortName}</p>
              <Badge 
                variant={brand.count > 0 ? "default" : "outline"} 
                className="text-xs"
              >
                {brand.count}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
