import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TournamentCarousel() {
  const [posters, setPosters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadPosters = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("carteles")
          .list();

        if (error) throw error;

        if (data) {
          const posterUrls = data
            .filter((file) => file.name !== ".emptyFolderPlaceholder")
            .map((file) => {
              const { data: urlData } = supabase.storage
                .from("carteles")
                .getPublicUrl(file.name);
              return urlData.publicUrl;
            });
          setPosters(posterUrls);
        }
      } catch (error) {
        console.error("Error loading posters:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPosters();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % posters.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + posters.length) % posters.length);
  };

  const getSlidePosition = (index: number) => {
    const diff = index - currentIndex;
    const total = posters.length;
    
    // Normalize the difference to be between -total/2 and total/2
    let normalizedDiff = diff;
    if (diff > total / 2) normalizedDiff = diff - total;
    if (diff < -total / 2) normalizedDiff = diff + total;
    
    return normalizedDiff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando carteles...</p>
      </div>
    );
  }

  if (posters.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-background to-card overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Galería de <span className="gradient-text">Eventos</span>
          </h2>
        </div>

        <div className="relative h-[500px] md:h-[600px] flex items-center justify-center">
          {/* Carousel Container */}
          <div className="relative w-full h-full flex items-center justify-center perspective-container">
            {posters.map((poster, index) => {
              const position = getSlidePosition(index);
              const isCenter = position === 0;
              const absPosition = Math.abs(position);
              
              return (
                <div
                  key={index}
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
                    w-[300px] md:w-[400px] h-[400px] md:h-[550px] 
                    rounded-lg overflow-hidden
                    ${isCenter ? "shadow-2xl ring-4 ring-primary/30" : "shadow-lg"}
                    transition-all duration-300
                  `}>
                    <img
                      src={poster}
                      alt={`Cartel ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
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
          {posters.map((_, index) => (
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
