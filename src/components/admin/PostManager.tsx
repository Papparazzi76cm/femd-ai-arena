import { useState, useEffect, useRef } from 'react';
import { postService } from '@/services/postService';
import { Post } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X, Newspaper, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

export const PostManager = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    image_url: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await postService.getAll();
      setPosts(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const postData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        content: formData.content.trim() || undefined,
        image_url: formData.image_url.trim() || undefined,
        author_id: user?.id
      };

      if (editingId) {
        await postService.update(editingId, postData);
        toast({ title: 'Noticia actualizada con éxito' });
      } else {
        await postService.create(postData);
        toast({ title: 'Noticia creada con éxito' });
      }

      resetForm();
      loadPosts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la noticia',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (post: Post) => {
    setFormData({
      title: post.title,
      description: post.description || '',
      content: post.content || '',
      image_url: post.image_url || ''
    });
    setEditingId(post.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta noticia?')) return;

    try {
      await postService.delete(id);
      toast({ title: 'Noticia eliminada con éxito' });
      loadPosts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la noticia',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', content: '', image_url: '' });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando noticias...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Noticias</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Nueva Noticia'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Noticia' : 'Nueva Noticia'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título de la noticia"
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descripción"
                  maxLength={300}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contenido</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Contenido completo de la noticia"
                  rows={6}
                  maxLength={5000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL de Imagen</label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{post.title}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(post)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {post.image_url && (
                <img src={post.image_url} alt={post.title} className="w-full h-40 object-cover rounded" />
              )}
              {post.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{post.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Newspaper className="w-4 h-4" />
                {new Date(post.created_at).toLocaleDateString('es-ES')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
