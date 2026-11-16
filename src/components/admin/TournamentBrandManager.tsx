import { useEffect, useState } from 'react';
import { tournamentBrandService, type TournamentBrand } from '@/services/tournamentBrandService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
const empty = { name: '', slug: '', logo_url: '', keywords: [] as string[], is_public: false, display_order: 10 };
export function TournamentBrandManager({ onChange }: { onChange: () => void }) {
  const [brands, setBrands] = useState<TournamentBrand[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const load = async () => { try { setBrands(await tournamentBrandService.getAll()); } catch (e) { toast({ title: 'Error', description: String(e), variant: 'destructive' }); } };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    setBusy(true);
    try {
      const slug = form.slug || form.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await tournamentBrandService.save({ ...form, name: form.name.trim(), slug, keywords: [form.name.trim().toLowerCase()] }, editing);
      setOpen(false); await load(); onChange(); toast({ title: 'Torneo guardado' });
    } catch (e: any) { toast({ title: 'No se pudo guardar', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 border-b border-border pb-6">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Nuestros Torneos</h2><Button variant="outline" onClick={() => { setForm(empty); setEditing(undefined); setOpen(true); }}><Plus />Nuevo torneo</Button></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{brands.map(b => <div key={b.id} className="border border-border rounded-md p-3 flex items-center gap-3">
      {b.logo_url && <img src={b.logo_url} alt={b.name} className="h-14 w-14 object-contain shrink-0" />}<div className="min-w-0 flex-1"><p className="font-medium break-words">{b.name}</p><p className="text-xs text-muted-foreground">{b.is_public ? 'Visible' : 'Oculto'}</p></div>
      <Button variant="ghost" size="icon" aria-label={`Editar ${b.name}`} onClick={() => { setForm(b); setEditing(b.id); setOpen(true); }}><Edit /></Button>
      <Button variant="ghost" size="icon" aria-label={`${b.is_public ? 'Ocultar' : 'Mostrar'} ${b.name}`} disabled={busy} onClick={async () => { setBusy(true); try { await tournamentBrandService.save({ ...b, is_public: !b.is_public }, b.id); await load(); onChange(); } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); } finally { setBusy(false); } }}>{b.is_public ? <EyeOff /> : <Eye />}</Button>
    </div>)}</div>
    {open && <form className="grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void save(); }}>
      <div><Label htmlFor="brand-name">Nombre del torneo</Label><Input id="brand-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label htmlFor="brand-logo">Logo (URL o ruta)</Label><Input id="brand-logo" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} /></div>
      <label className="flex gap-2 items-center"><Checkbox checked={form.is_public} onCheckedChange={v => setForm({ ...form, is_public: v === true })} />Visible en Nuestros Torneos</label>
      <div className="flex gap-2"><Button type="submit" disabled={busy}><Save />Guardar torneo</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}><X />Cancelar</Button></div>
    </form>}
  </section>;
}