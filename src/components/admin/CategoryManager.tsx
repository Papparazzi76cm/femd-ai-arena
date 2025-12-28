import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { categoryService } from '@/services/categoryService';
import { Category } from '@/types/database';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';

export const CategoryManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: '',
    age_group: '',
    display_order: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error cargando categorías:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las categorías',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', age_group: '', display_order: categories.length + 1 });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      age_group: category.age_group || '',
      display_order: category.display_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      if (editingCategory) {
        await categoryService.update(editingCategory.id, form);
        toast({ title: 'Categoría actualizada' });
      } else {
        await categoryService.create(form);
        toast({ title: 'Categoría creada' });
      }
      resetForm();
      setDialogOpen(false);
      loadCategories();
    } catch (error) {
      console.error('Error guardando categoría:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la categoría',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

    try {
      await categoryService.delete(id);
      toast({ title: 'Categoría eliminada' });
      loadCategories();
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la categoría',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Categorías
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Alevín U12"
                />
              </div>
              <div>
                <Label htmlFor="age_group">Grupo de Edad</Label>
                <Input
                  id="age_group"
                  value={form.age_group}
                  onChange={(e) => setForm({ ...form, age_group: e.target.value })}
                  placeholder="Ej: Sub-12"
                />
              </div>
              <div>
                <Label htmlFor="display_order">Orden de Visualización</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button onClick={handleSave} disabled={loading} className="w-full">
                {editingCategory ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading && categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay categorías registradas</p>
        ) : (
          <div className="grid gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <span className="font-medium">{category.name}</span>
                  {category.age_group && (
                    <span className="text-muted-foreground text-sm ml-2">
                      ({category.age_group})
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
