import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { rosterRegistrationService } from '@/services/rosterRegistrationService';

export function RegistrationLinkPanel({ eventTeamId, onRefresh }: { eventTeamId: string; onRefresh: () => void }) {
  const [url, setUrl] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const generate = async () => {
    setBusy(true);
    try {
      const link = await rosterRegistrationService.create(eventTeamId);
      setUrl(`${window.location.origin}/registro-plantilla#${link.token}`);
      setExpiry(link.expires_at);
      toast({ title: 'Enlace de registro generado', description: 'Copia el enlace y envíaselo al entrenador. Los enlaces anteriores de este equipo quedan cerrados.' });
    } catch (error) {
      toast({ title: 'No se pudo generar el enlace', description: (error as Error).message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  const revoke = async () => {
    setBusy(true);
    try {
      await rosterRegistrationService.revoke(eventTeamId);
      setUrl(''); setExpiry('');
      toast({ title: 'Enlaces de este equipo cerrados' });
    } catch (error) { toast({ title: 'No se pudo cerrar el enlace', description: (error as Error).message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast({ title: 'Enlace copiado' }); }
    catch { toast({ title: 'Selecciona y copia el enlace del campo' }); }
  };
  return <section className="rounded-lg border p-3 space-y-3" aria-label="Registro por entrenador">
    <p className="font-medium text-sm">Registro de plantilla por el entrenador</p>
    <p className="text-xs text-muted-foreground">El enlace corresponde únicamente a este equipo en este torneo. Caduca en 30 días y admite un envío completo. Para añadir más miembros después, genera un nuevo enlace.</p>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={generate}>Generar nuevo enlace</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={revoke}>Cerrar enlaces</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={onRefresh}>Actualizar plantilla</Button>
    </div>
    {url && <div className="space-y-2">
      <Input aria-label="Enlace para el entrenador" value={url} readOnly onFocus={event => event.target.select()} />
      <div className="flex items-center flex-wrap gap-3"><Button size="sm" variant="secondary" onClick={copy}>Copiar enlace</Button><span className="text-xs text-muted-foreground">Válido hasta {new Date(expiry).toLocaleDateString('es-ES')}</span></div>
    </div>}
  </section>;
}
