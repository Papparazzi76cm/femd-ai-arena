import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TournamentLogo {
  id: string;
  name: string;
  logoUrl: string;
  slug: string;
}

// Logos de torneos - estos se pueden gestionar desde admin en el futuro
const tournamentLogos: TournamentLogo[] = [
  {
    id: "copa-rioseco",
    name: "Copa Internacional Rioseco Caramanzana",
    logoUrl: "/logos-torneos/copa-rioseco.png",
    slug: "copa-rioseco",
  },
  {
    id: "villa-aranda",
    name: "Torneo Internacional Villa de Aranda",
    logoUrl: "/logos-torneos/villa-aranda.png",
    slug: "villa-aranda",
  },
  {
    id: "medina-cup",
    name: "Medina International Cup",
    logoUrl: "/logos-torneos/medina-cup.png",
    slug: "medina-cup",
  },
  {
    id: "copa-cyl",
    name: "Copa CyL",
    logoUrl: "/logos-torneos/copa-cyl.png",
    slug: "copa-cyl",
  },
];

export function EventGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % tournamentLogos.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + tournamentLogos.length) % tournamentLogos.length);
  };

  const getSlidePosition = (index: number) => {
    const diff = index - currentIndex;
    const total = tournamentLogos.length;
    
    let normalizedDiff = diff;
    if (diff > total / 2) normalizedDiff = diff - total;
    if (diff < -total / 2) normalizedDiff = diff + total;
    
    return normalizedDiff;
  };

  if (tournamentLogos.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-background to-card overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Galería de <span className="gradient-text">Eventos</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Descubre nuestros torneos. Haz clic en un logo para ver todas sus ediciones.
          </p>
        </div>

        <div className="relative h-[400px] md:h-[500px] flex items-center justify-center">
          {/* Carousel Container */}
          <div className="relative w-full h-full flex items-center justify-center perspective-container">
            {tournamentLogos.map((tournament, index) => {
              const position = getSlidePosition(index);
              const isCenter = position === 0;
              const absPosition = Math.abs(position);
              
              return (
                <Link
                  key={tournament.id}
                  to={`/torneos?torneo=${tournament.slug}`}
                  className="carousel-slide absolute transition-all duration-700 ease-out"
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
                    w-[280px] md:w-[350px] h-[280px] md:h-[350px] 
                    rounded-2xl overflow-hidden bg-card
                    ${isCenter ? "shadow-2xl ring-4 ring-primary/30 hover:ring-primary/60" : "shadow-lg"}
                    transition-all duration-300 flex items-center justify-center p-6
                    group cursor-pointer
                  `}>
                    <img
                      src={tournament.logoUrl}
                      alt={tournament.name}
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  {isCenter && (
                    <p className="text-center mt-4 text-lg font-semibold text-foreground">
                      {tournament.name}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 md:left-8 z-50 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-lg"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 md:right-8 z-50 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-lg"
            onClick={nextSlide}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {tournamentLogos.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-primary w-8"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
