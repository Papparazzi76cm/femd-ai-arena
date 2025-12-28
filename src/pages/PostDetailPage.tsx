import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { postService } from '@/services/postService';
import { Post } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen pt-20">
      {/* Hero Image */}
      {post.image_url && (
        <div className="relative h-[40vh] md:h-[50vh] w-full">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/noticias" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a noticias
          </Link>
        </Button>

        <article className="max-w-4xl mx-auto">
          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-bold mb-6">{post.title}</h1>

          {/* Meta */}
          <div className="flex items-center gap-6 text-muted-foreground mb-8 pb-8 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {formatDate(post.created_at)}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {Math.ceil((post.content?.length || 0) / 1000)} min de lectura
            </div>
          </div>

          {/* Description */}
          {post.description && (
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary pl-6 italic">
              {post.description}
            </p>
          )}

          {/* Content */}
          {post.content && (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {post.content.split('\n').map((paragraph, idx) => (
                paragraph.trim() && (
                  <p key={idx} className="mb-6 leading-relaxed text-foreground/90">
                    {paragraph}
                  </p>
                )
              ))}
            </div>
          )}

          {/* Back to news */}
          <div className="mt-12 pt-8 border-t border-border">
            <Button asChild className="gradient-gold">
              <Link to="/noticias" className="flex items-center gap-2">
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
