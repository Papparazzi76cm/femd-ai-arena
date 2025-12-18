import { useEffect, useState } from 'react';
import { postService } from '@/services/postService';
import { Post } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Newspaper, Clock, Search, ChevronLeft, ChevronRight, Loader2, Calendar, X } from 'lucide-react';

const POSTS_PER_PAGE = 6;

export const BlogPage = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto" />
          <p className="text-muted-foreground">Cargando noticias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-16">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Newspaper className="w-12 h-12 text-emerald-600" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Noticias FEMD
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Mantente al día con todas las novedades de nuestros torneos
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar noticias..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Featured Article */}
        {featuredPost && !searchTerm && (
          <div className="mb-16 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <div className="w-1 h-8 bg-emerald-600 rounded"></div>
              Destacado
            </h2>
            <Card 
              className="overflow-hidden border-2 border-emerald-600/20 hover:border-emerald-600/50 transition-all duration-300 hover:shadow-2xl cursor-pointer"
              onClick={() => setSelectedPost(featuredPost)}
            >
              <div className="grid md:grid-cols-2 gap-0">
                {featuredPost.image_url && (
                  <div className="relative h-64 md:h-auto overflow-hidden">
                    <img
                      src={featuredPost.image_url}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-emerald-600 text-white text-sm font-semibold rounded-full">
                        Destacado
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-8 flex flex-col justify-center">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-3xl mb-4 hover:text-emerald-600 transition-colors">
                      {featuredPost.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(featuredPost.created_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {Math.ceil((featuredPost.content?.length || 0) / 1000)} min lectura
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {featuredPost.description && (
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {featuredPost.description}
                      </p>
                    )}
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(featuredPost);
                      }}
                    >
                      Leer más
                    </Button>
                  </CardContent>
                </div>
              </div>
            </Card>
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
            <div className="mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <div className="w-1 h-8 bg-emerald-600 rounded"></div>
                {searchTerm ? 'Resultados de búsqueda' : 'Últimas Noticias'}
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
              {displayedPosts.map((post, index) => (
                <Card
                  key={post.id}
                  className="group overflow-hidden hover-scale border-2 hover:border-emerald-600/30 transition-all duration-300 hover:shadow-xl animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${(index + 3) * 100}ms` }}
                  onClick={() => setSelectedPost(post)}
                >
                  {post.image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(post.created_at)}
                    </div>
                    <CardTitle className="text-xl group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {post.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {post.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {Math.ceil((post.content?.length || 0) / 1000)} min
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-600/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(post);
                        }}
                      >
                        Leer más →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 animate-fade-in">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-2"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Newsletter CTA */}
        {allPosts.length > 0 && (
          <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: '800ms' }}>
            <div className="inline-block p-8 bg-gradient-to-br from-emerald-600/10 to-emerald-600/5 rounded-2xl border border-emerald-600/20">
              <Newspaper className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Mantente informado</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Suscríbete para recibir las últimas noticias y actualizaciones de FEMD TORNEOS
              </p>
              <div className="flex gap-2 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  className="flex-1"
                />
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Suscribirse
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedPost?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[90vh]">
            {selectedPost && (
              <div>
                {selectedPost.image_url && (
                  <div className="relative h-64 md:h-80 w-full">
                    <img
                      src={selectedPost.image_url}
                      alt={selectedPost.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-6 right-6 text-white">
                      <h2 className="text-2xl md:text-3xl font-bold mb-2">{selectedPost.title}</h2>
                      <div className="flex items-center gap-4 text-sm opacity-90">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(selectedPost.created_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {Math.ceil((selectedPost.content?.length || 0) / 1000)} min lectura
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-6 md:p-8">
                  {!selectedPost.image_url && (
                    <>
                      <h2 className="text-2xl md:text-3xl font-bold mb-4">{selectedPost.title}</h2>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(selectedPost.created_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {Math.ceil((selectedPost.content?.length || 0) / 1000)} min lectura
                        </div>
                      </div>
                    </>
                  )}
                  {selectedPost.description && (
                    <p className="text-lg text-muted-foreground mb-6 leading-relaxed border-l-4 border-emerald-600 pl-4 italic">
                      {selectedPost.description}
                    </p>
                  )}
                  {selectedPost.content && (
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      {selectedPost.content.split('\n').map((paragraph, idx) => (
                        paragraph.trim() && <p key={idx} className="mb-4 leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
