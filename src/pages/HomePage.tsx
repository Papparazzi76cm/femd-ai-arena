import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Newspaper, Calendar, ArrowRight, Instagram } from "lucide-react";
import { postService } from "@/services/postService";
import { Post } from "@/types/database";
import { EventGallery } from "@/components/EventGallery";
import { AudioPlayer } from "@/components/AudioPlayer";

export function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);

  const heroImages = [
    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1920&q=80",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1920&q=80",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await postService.getAll();
        setPosts(data.slice(0, 3));
      } catch (error) {
        console.error("Error loading posts:", error);
      }
    };
    loadPosts();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Images */}
        <div className="absolute inset-0">
          {heroImages.map((img, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={img}
                alt={`Hero ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-4 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 animate-slide-up leading-tight">
            FEMD EVENTOS
          </h1>
          <p className="text-base sm:text-xl md:text-2xl mb-4 text-gray-200 max-w-2xl mx-auto animate-slide-up px-2">
            Organizadores profesionales de eventos y torneos de fútbol
          </p>
          
          <AudioPlayer />
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-scale-in mt-4 px-4">
            <Button size="lg" className="gradient-gold text-white hover:opacity-90 w-full sm:w-auto" asChild>
              <Link to="/torneos">Ver Torneos</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white hover:text-primary w-full sm:w-auto" asChild>
              <Link to="/contacto">Contactar</Link>
            </Button>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide ? "bg-primary w-8" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>


      {/* Noticias Section */}
      {posts.length > 0 && (
        <section id="noticias" className="py-12 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12 animate-fade-in">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Newspaper className="w-7 h-7 sm:w-10 sm:h-10 text-primary" />
                <h2 className="text-2xl sm:text-4xl font-bold">Últimas Noticias</h2>
              </div>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto px-2">
                Mantente informado con las últimas novedades de nuestros eventos
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {posts.map((post, index) => (
                <Link to={`/noticias/${post.id}`} key={post.id}>
                  <Card
                    className="group hover:shadow-xl transition-all duration-300 animate-fade-in overflow-hidden h-full"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {post.image_url && (
                      <div className="relative h-40 sm:h-48 overflow-hidden">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      {post.description && (
                        <p className="text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-3">
                          {post.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {new Date(post.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Button size="lg" className="gradient-gold group" asChild>
                <Link to="/noticias" className="flex items-center gap-2">
                  Ver todas las noticias
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Event Gallery - Tournament Logos */}
      <EventGallery />

      {/* Social Media & Contact Section */}
      <section className="py-10 sm:py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Contact Info */}
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Contacto</h3>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Teléfono:</span>{" "}
                  <a href="tel:+34672266074" className="hover:text-primary transition-colors">
                    +34 672 266 074
                  </a>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Ubicación:</span>{" "}
                  Calle Toreros, 6, Bajo Derecha - 47007 (Valladolid, España)
                </p>
              </div>
            </div>

            {/* Social Media */}
            <div className="text-center sm:text-right">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Síguenos</h3>
              <div className="flex gap-4 justify-center sm:justify-end">
                <a
                  href="https://instagram.com/femdeventos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                >
                  <Instagram className="w-6 h-6" />
                </a>
                <a
                  href="https://x.com/femdeventos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">@femdeventos</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
