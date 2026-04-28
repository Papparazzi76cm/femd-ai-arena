import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { postService } from '@/services/postService';
import { Post } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Loader2 } from 'lucide-react';
import { PostImage } from '@/components/PostImage';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      if (!id) return;
      try {
        const data = await postService.getById(id);
        setPost(data);
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [id]);

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
          <p className="text-muted-foreground">Cargando noticia...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Noticia no encontrada</h1>
          <Button asChild>
            <Link to="/noticias">Volver a noticias</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 sm:pt-20">
      {/* Hero Image */}
      <div className="relative h-[28vh] sm:h-[40vh] md:h-[50vh] w-full bg-muted">
        <PostImage
          src={post.image_url}
          alt={post.title}
          variant="featured"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none" />
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Back Button */}
        <Button variant="ghost" size="sm" asChild className="mb-4 sm:mb-6 h-9">
          <Link to="/noticias" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Volver a noticias</span>
          </Link>
        </Button>

        <article className="max-w-4xl mx-auto">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">{post.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              {formatDate(post.created_at)}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              {Math.ceil((post.content?.length || 0) / 1000)} min de lectura
            </div>
          </div>

          {/* Description */}
          {post.description && (
            <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed border-l-4 border-primary pl-4 sm:pl-6 italic">
              {post.description}
            </p>
          )}

          {/* Content */}
          {post.content && (
            <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-none">
              {post.content.split('\n').map((paragraph, idx) => (
                paragraph.trim() && (
                  <p key={idx} className="mb-4 sm:mb-6 leading-relaxed text-foreground/90 text-sm sm:text-base">
                    {paragraph}
                  </p>
                )
              ))}
            </div>
          )}

          {/* Back to news */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
            <Button asChild className="gradient-gold w-full sm:w-auto">
              <Link to="/noticias" className="flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Ver más noticias
              </Link>
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
