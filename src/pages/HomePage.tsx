import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users, Calendar, TrendingUp, Newspaper, ArrowRight } from "lucide-react";
import { sponsorService } from "@/services/sponsorService";
import { postService } from "@/services/postService";
import { Sponsor, Post } from "@/types/database";
import { TournamentCarousel } from "@/components/TournamentCarousel";
import { AudioPlayer } from "@/components/AudioPlayer";

export function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
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
    const loadSponsors = async () => {
      try {
        const data = await sponsorService.getAll();
        setSponsors(data);
      } catch (error) {
        console.error("Error loading sponsors:", error);
      }
    };
    loadSponsors();
  }, []);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await postService.getAll();
        setPosts(data.slice(0, 3)); // Solo las últimas 3 noticias
      } catch (error) {
        console.error("Error loading posts:", error);
      }
    };
    loadPosts();
  }, []);

  const stats = [
    { icon: Trophy, value: "15+", label: "Torneos Organizados" },
    { icon: Users, value: "150+", label: "Equipos Participantes" },
    { icon: TrendingUp, value: "1.2k+", label: "Jugadores Activos" },
  ];

  const features = [
    {
      title: "Organización Profesional",
      description:
        "Contamos con años de experiencia organizando torneos de fútbol de primer nivel.",
      icon: Trophy,
    },
    {
      title: "Infraestructura Completa",
      description:
        "Instalaciones modernas y equipamiento profesional para cada evento.",
      icon: Users,
    },
    {
      title: "Gestión Integral",
      description:
        "Desde la inscripción hasta la entrega de premios, nos encargamos de todo.",
      icon: Calendar,
    },
  ];

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
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            FEMD TORNEOS
          </h1>
          <p className="text-xl md:text-2xl mb-4 text-gray-200 max-w-2xl mx-auto animate-slide-up">
            Organizadores profesionales de eventos y torneos de fútbol
          </p>
          
          <AudioPlayer />
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in mt-4">
            <Button size="lg" className="gradient-emerald text-white hover:opacity-90" asChild>
              <Link to="/torneos">Ver Torneos</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white hover:text-primary" asChild>
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

      {/* Stats Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <stat.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Somos líderes en la organización de torneos de fútbol con un
              compromiso total con la excelencia.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-8 hover-lift hover-glow animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="w-16 h-16 gradient-emerald rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      {sponsors.length > 0 && (
        <section className="py-20 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Nuestros Patrocinadores
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Gracias a nuestros patrocinadores por hacer posible cada torneo
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {sponsors.map((sponsor, index) => (
                <Card
                  key={sponsor.id}
                  className="p-6 hover-lift hover-glow animate-fade-in flex items-center justify-center"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {sponsor.logo_url ? (
                    <a
                      href={sponsor.website || "#"}
                      target={sponsor.website ? "_blank" : undefined}
                      rel={sponsor.website ? "noopener noreferrer" : undefined}
                      className="w-full h-24 flex items-center justify-center"
                    >
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                      />
                    </a>
                  ) : (
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{sponsor.name}</p>
                      {sponsor.tier && (
                        <p className="text-xs text-muted-foreground mt-1">{sponsor.tier}</p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Noticias Section */}
      {posts.length > 0 && (
        <section id="noticias" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Newspaper className="w-10 h-10 text-primary" />
                <h2 className="text-4xl font-bold">Últimas Noticias</h2>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Mantente informado con las últimas novedades de nuestros torneos
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {posts.map((post, index) => (
                <Card
                  key={post.id}
                  className="group hover:shadow-xl transition-all duration-300 animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {post.image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    {post.description && (
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {post.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button size="lg" className="gradient-emerald group" asChild>
                <Link to="/noticias" className="flex items-center gap-2">
                  Ver todas las noticias
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Tournament Gallery */}
      <TournamentCarousel />

      {/* CTA Section */}
      <section className="py-20 gradient-emerald">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6 animate-fade-in">
            ¿Listo para participar?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in">
            Únete a nosotros y forma parte de la mejor experiencia futbolística
          </p>
          <Button
            size="lg"
            variant="outline"
            className="bg-white text-primary hover:bg-white/90 animate-scale-in"
          >
            Inscribir Equipo
          </Button>
        </div>
      </section>
    </div>
  );
}
