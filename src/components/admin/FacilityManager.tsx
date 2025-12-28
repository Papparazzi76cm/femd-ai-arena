import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { facilityService } from '@/services/facilityService';
import { Facility, Field, FieldSurface } from '@/types/database';
import { Plus, Edit2, Trash2, Building2, MapPin, ExternalLink } from 'lucide-react';

export const FacilityManager = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    province: '',
    city: '',
    address: '',
    google_maps_url: '',
  });

  const [fieldForm, setFieldForm] = useState({
    name: '',
    surface: 'cesped_artificial' as FieldSurface,
    display_order: 0,
  });

  const { toast } = useToast();

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      const data = await facilityService.getAll();
      setFacilities(data);
    } catch (error) {
      console.error('Error cargando instalaciones:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las instalaciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFacilityForm = () => {
    setFacilityForm({ name: '', province: '', city: '', address: '', google_maps_url: '' });
    setEditingFacility(null);
  };

  const resetFieldForm = () => {
    setFieldForm({ name: '', surface: 'cesped_artificial', display_order: 0 });
    setEditingField(null);
  };

  const handleEditFacility = (facility: Facility) => {
    setEditingFacility(facility);
    setFacilityForm({
      name: facility.name,
      province: facility.province || '',
      city: facility.city || '',
      address: facility.address || '',
      google_maps_url: facility.google_maps_url || '',
    });
    setFacilityDialogOpen(true);
  };

  const handleSaveFacility = async () => {
    if (!facilityForm.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      if (editingFacility) {
        await facilityService.update(editingFacility.id, facilityForm);
        toast({ title: 'Instalación actualizada' });
      } else {
        await facilityService.create(facilityForm);
        toast({ title: 'Instalación creada' });
      }
      resetFacilityForm();
      setFacilityDialogOpen(false);
      loadFacilities();
    } catch (error) {
      console.error('Error guardando instalación:', error);
      toast({ title: 'Error', description: 'No se pudo guardar la instalación', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    if (!confirm('¿Estás seguro? Se eliminarán también todos los campos asociados.')) return;

    try {
      await facilityService.delete(id);
      toast({ title: 'Instalación eliminada' });
      loadFacilities();
    } catch (error) {
      console.error('Error eliminando instalación:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar la instalación', variant: 'destructive' });
    }
  };

  const handleAddField = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
    const facility = facilities.find(f => f.id === facilityId);
    const fieldsCount = facility?.fields?.length || 0;
    setFieldForm({
      name: `Campo ${fieldsCount + 1}`,
      surface: 'cesped_artificial',
      display_order: fieldsCount + 1,
    });
    setFieldDialogOpen(true);
  };

  const handleEditField = (field: Field) => {
    setEditingField(field);
    setSelectedFacilityId(field.facility_id);
    setFieldForm({
      name: field.name,
      surface: field.surface,
      display_order: field.display_order,
    });
    setFieldDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!fieldForm.name.trim() || !selectedFacilityId) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      if (editingField) {
        await facilityService.updateField(editingField.id, fieldForm);
        toast({ title: 'Campo actualizado' });
      } else {
        await facilityService.createField({
          facility_id: selectedFacilityId,
          ...fieldForm,
        });
        toast({ title: 'Campo creado' });
      }
      resetFieldForm();
      setFieldDialogOpen(false);
      setSelectedFacilityId(null);
      loadFacilities();
    } catch (error) {
      console.error('Error guardando campo:', error);
      toast({ title: 'Error', description: 'No se pudo guardar el campo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este campo?')) return;

    try {
      await facilityService.deleteField(id);
      toast({ title: 'Campo eliminado' });
      loadFacilities();
    } catch (error) {
      console.error('Error eliminando campo:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el campo', variant: 'destructive' });
    }
  };

  const getSurfaceLabel = (surface: FieldSurface) => {
    return surface === 'cesped_artificial' ? 'Césped Artificial' : 'Césped Natural';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Instalaciones y Campos
        </CardTitle>
        <Dialog open={facilityDialogOpen} onOpenChange={(open) => {
          setFacilityDialogOpen(open);
          if (!open) resetFacilityForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Instalación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFacility ? 'Editar Instalación' : 'Nueva Instalación'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="facility-name">Nombre *</Label>
                <Input
                  id="facility-name"
                  value={facilityForm.name}
                  onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  placeholder="Ej: Complejo Deportivo Juan Carlos Higuero"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="province">Provincia</Label>
                  <Input
                    id="province"
                    value={facilityForm.province}
                    onChange={(e) => setFacilityForm({ ...facilityForm, province: e.target.value })}
                    placeholder="Ej: Burgos"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Localidad</Label>
                  <Input
                    id="city"
                    value={facilityForm.city}
                    onChange={(e) => setFacilityForm({ ...facilityForm, city: e.target.value })}
                    placeholder="Ej: Aranda de Duero"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={facilityForm.address}
                  onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
                  placeholder="Ej: Calle Ejemplo, 123"
                />
              </div>
              <div>
                <Label htmlFor="google_maps_url">Enlace Google Maps</Label>
                <Input
                  id="google_maps_url"
                  value={facilityForm.google_maps_url}
                  onChange={(e) => setFacilityForm({ ...facilityForm, google_maps_url: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <Button onClick={handleSaveFacility} disabled={loading} className="w-full">
                {editingFacility ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading && facilities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        ) : facilities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay instalaciones registradas</p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {facilities.map((facility) => (
              <AccordionItem key={facility.id} value={facility.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">{facility.name}</div>
                      {facility.city && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {facility.city}{facility.province ? `, ${facility.province}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Facility actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => handleEditFacility(facility)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      {facility.google_maps_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(facility.google_maps_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver en Maps
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleDeleteFacility(facility.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>

                    {/* Fields */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Campos ({facility.fields?.length || 0})</h4>
                        <Button size="sm" variant="ghost" onClick={() => handleAddField(facility.id)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Añadir Campo
                        </Button>
                      </div>
                      {facility.fields && facility.fields.length > 0 ? (
                        <div className="grid gap-2">
                          {facility.fields.map((field) => (
                            <div
                              key={field.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div>
                                <span className="font-medium">{field.name}</span>
                                <span className="text-muted-foreground text-sm ml-2">
                                  ({getSurfaceLabel(field.surface)})
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditField(field)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteField(field.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          No hay campos registrados
                        </p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Field Dialog */}
        <Dialog open={fieldDialogOpen} onOpenChange={(open) => {
          setFieldDialogOpen(open);
          if (!open) {
            resetFieldForm();
            setSelectedFacilityId(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingField ? 'Editar Campo' : 'Nuevo Campo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="field-name">Nombre del Campo</Label>
                <Input
                  id="field-name"
                  value={fieldForm.name}
                  onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                  placeholder="Ej: Campo Patrocinador X"
                />
              </div>
              <div>
                <Label htmlFor="surface">Tipo de Superficie</Label>
                <Select
                  value={fieldForm.surface}
                  onValueChange={(value: FieldSurface) => setFieldForm({ ...fieldForm, surface: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cesped_artificial">Césped Artificial</SelectItem>
                    <SelectItem value="cesped_natural">Césped Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="field-order">Orden</Label>
                <Input
                  id="field-order"
                  type="number"
                  value={fieldForm.display_order}
                  onChange={(e) => setFieldForm({ ...fieldForm, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button onClick={handleSaveField} disabled={loading} className="w-full">
                {editingField ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
