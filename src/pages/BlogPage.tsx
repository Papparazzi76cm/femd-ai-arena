import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postService } from '@/services/postService';
import { Post } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Newspaper, Clock, Search, ChevronLeft, ChevronRight, Loader2, Calendar } from 'lucide-react';
import { PostImage } from '@/components/PostImage';

const POSTS_PER_PAGE = 6;

export const BlogPage = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    filterAndPaginatePosts();
  }, [allPosts, currentPage, searchTerm]);

  const loadPosts = async () => {
    try {
      const data = await postService.getAll();
      setAllPosts(data);
      if (data.length > 0) {
        setFeaturedPost(data[0]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las noticias',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndPaginatePosts = () => {
    let filtered = allPosts;

    // Filter out featured post from regular list
    if (featuredPost) {
      filtered = filtered.filter(post => post.id !== featuredPost.id);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Paginate
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    setDisplayedPosts(filtered.slice(startIndex, endIndex));
  };

  const totalPages = Math.ceil(
    (allPosts.length - (featuredPost ? 1 : 0)) / POSTS_PER_PAGE
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando noticias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pt-20 sm:pt-24 pb-12 sm:pb-16">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
            <Newspaper className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text">
              Noticias FEMD
            </h1>
          </div>
          <p className="text-sm sm:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            Mantente al día con todas las novedades de nuestros eventos
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              type="text"
              placeholder="Buscar noticias..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-11 sm:h-12"
            />
          </div>
        </div>

        {/* Featured Article */}
        {featuredPost && !searchTerm && (
          <div className="mb-10 sm:mb-16 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
              <div className="w-1 h-6 sm:h-8 bg-primary rounded"></div>
              Destacado
            </h2>
            <Link to={`/noticias/${featuredPost.id}`}>
              <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative h-48 sm:h-64 md:h-auto md:min-h-[280px] overflow-hidden">
                    <PostImage
                      src={featuredPost.image_url}
                      alt={featuredPost.title}
                      variant="featured"
                      imgClassName="hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
                      <span className="px-2.5 py-1 sm:px-3 bg-primary text-primary-foreground text-xs sm:text-sm font-semibold rounded-full shadow-md">
                        Destacado
                      </span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-8 flex flex-col justify-center">
                    <CardHeader className="p-0 mb-3 sm:mb-4">
                      <CardTitle className="text-xl sm:text-3xl mb-3 sm:mb-4 hover:text-primary transition-colors line-clamp-3">
                        {featuredPost.title}
                      </CardTitle>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {formatDate(featuredPost.created_at)}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {Math.ceil((featuredPost.content?.length || 0) / 1000)} min lectura
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {featuredPost.description && (
                        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed line-clamp-3 sm:line-clamp-none">
                          {featuredPost.description}
                        </p>
                      )}
                      <Button className="gradient-gold w-full sm:w-auto">
                        Leer más
                      </Button>
                    </CardContent>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        )}

        {/* Regular Articles Grid */}
        {displayedPosts.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">
              {searchTerm ? 'No se encontraron noticias' : 'No hay noticias publicadas aún'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <div className="w-1 h-6 sm:h-8 bg-primary rounded"></div>
                {searchTerm ? 'Resultados de búsqueda' : 'Últimas Noticias'}
              </h2>
            </div>

            <div className="grid gap-5 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-10 sm:mb-12">
              {displayedPosts.map((post, index) => (
                <Link to={`/noticias/${post.id}`} key={post.id}>
                  <Card
                    className="group overflow-hidden hover-scale border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-xl animate-fade-in h-full"
                    style={{ animationDelay: `${(index + 3) * 100}ms` }}
                  >
                    <div className="relative h-40 sm:h-48 overflow-hidden">
                      <PostImage
                        src={post.image_url}
                        alt={post.title}
                        imgClassName="group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {formatDate(post.created_at)}
                      </div>
                      <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      {post.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {post.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {Math.ceil((post.content?.length || 0) / 1000)} min
                        </div>
                        <span className="text-primary font-medium text-sm">
                          Leer más →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 sm:gap-4 animate-fade-in flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-1 sm:gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden xs:inline">Anterior</span>
                </Button>

                <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 p-0 ${currentPage === page ? 'gradient-gold' : ''}`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1 sm:gap-2"
                >
                  <span className="hidden xs:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Newsletter CTA */}
        {allPosts.length > 0 && (
          <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: '800ms' }}>
            <div className="inline-block p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
              <Newspaper className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Mantente informado</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Suscríbete para recibir las últimas noticias y actualizaciones de FEMD EVENTOS
              </p>
              <div className="flex gap-2 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  className="flex-1"
                />
                <Button className="gradient-gold">
                  Suscribirse
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
