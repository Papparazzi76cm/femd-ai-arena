import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { categoryService } from '@/services/categoryService';
import { eventService } from '@/services/eventService';
import { tournamentService } from '@/services/tournamentService';
import { localQualifiers } from '@/services/localQualification';
import type { Event, EventCategory } from '@/types/database';
import type { EventTeam } from '@/types/tournament';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowRight, Trophy } from 'lucide-react';
type Rule = { id: string; source_category_id: string; target_category_id: string; qualifiers_per_group: number };
export function LocalQualificationManager({ eventId, categories }: { eventId: string; categories: EventCategory[] }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [source, setSource] = useState('__none__');
  const [targetEvent, setTargetEvent] = useState('__none__');
  const [targets, setTargets] = useState<EventCategory[]>([]);
  const [target, setTarget] = useState('__none__');
  const [count, setCount] = useState(1);
  const [rules, setRules] = useState<Rule[]>([]);
  const [preview, setPreview] = useState<EventTeam[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const fail = (e: any) => toast({ title: 'No se pudo completar', description: e.message, variant: 'destructive' });
  const load = async () => {
    const [all, response] = await Promise.all([eventService.getAll(), supabase.from('local_qualification_rules').select('*').in('source_category_id', categories.map(c => c.id))]);
    if (response.error) throw response.error;
    setEvents(all); setRules(response.data ?? []);
  };
  useEffect(() => { if (categories.length) void load().catch(fail); }, [eventId, categories]);
  useEffect(() => {
    setTargets([]); setTarget('__none__');
    if (targetEvent !== '__none__') void categoryService.getEventCategories(targetEvent).then(setTargets).catch(fail);
  }, [targetEvent]);
  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } catch (e) { fail(e); } finally { setBusy(false); } };
  const rule = rules.find(r => r.source_category_id === source);
  return <section className="space-y-4 border-t border-border pt-6">
    <h3 className="text-xl font-bold flex gap-2 items-center"><Trophy />Fase local → Fase nacional</h3>
    <div className="grid sm:grid-cols-2 gap-4">
      <div><Label>Categoría local</Label><Select value={source} onValueChange={v => { setSource(v); setPreview([]); const saved = rules.find(r => r.source_category_id === v); setCount(saved?.qualifiers_per_group ?? 1); }}><SelectTrigger aria-label="Categoría local"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Seleccionar</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.category?.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Competición nacional</Label><Select value={targetEvent} onValueChange={setTargetEvent}><SelectTrigger aria-label="Competición nacional"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Seleccionar</SelectItem>{events.filter(e => e.id !== eventId).map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Categoría nacional</Label><Select value={target} onValueChange={setTarget}><SelectTrigger aria-label="Categoría nacional"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Seleccionar</SelectItem>{targets.map(c => <SelectItem key={c.id} value={c.id}>{c.category?.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor={`qualifiers-${eventId}`}>Clasificados por grupo</Label><Input id={`qualifiers-${eventId}`} type="number" min={1} max={200} value={count} onChange={e => { setCount(Number(e.target.value)); setPreview([]); }} /></div>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button disabled={busy || source === '__none__' || target === '__none__' || !Number.isInteger(count) || count < 1} onClick={() => void run(async () => {
        const a = categories.find(c => c.id === source); const b = targets.find(c => c.id === target);
        if (!a || !b || a.category_id !== b.category_id) throw new Error('Las categorías local y nacional deben coincidir.');
        const { error } = await supabase.from('local_qualification_rules').upsert({ source_category_id: source, target_category_id: target, qualifiers_per_group: count }, { onConflict: 'source_category_id' });
        if (error) throw error; await load(); setPreview([]); toast({ title: 'Fases vinculadas' });
      })}><Save />Guardar fases</Button>
      <Button variant="outline" disabled={busy || !rule} onClick={() => void run(async () => {
        if (!rule) return;
        const [teams, matches, details] = await Promise.all([tournamentService.getEventTeams(eventId), tournamentService.getMatches(eventId), tournamentService.getEventTeamsWithDetails(eventId)]);
        setNames(Object.fromEntries(details.map((t: any) => [t.id, `${t.team?.name ?? t.team_id}${t.team_letter ? ` ${t.team_letter}` : ''}`])));
        setPreview(localQualifiers(teams, matches, source, rule.qualifiers_per_group)); setGroups({});
      })}><Trophy />Calcular clasificados</Button>
    </div>
    {rule && <p className="text-sm text-muted-foreground">{rule.qualifiers_per_group} por grupo · Fase nacional vinculada</p>}
    {preview.length > 0 && <div className="space-y-3">{preview.map(t => <div key={t.id} className="flex flex-wrap gap-3 items-center border-b border-border pb-3"><span className="flex-1 min-w-0 font-medium">{names[t.id]} · Grupo local {t.group_name}</span><Input className="w-36" aria-label={`Grupo nacional de ${names[t.id]}`} placeholder="Grupo nacional" value={groups[t.id] ?? ''} onChange={e => setGroups({ ...groups, [t.id]: e.target.value })} /></div>)}
      <Button disabled={busy || preview.some(t => !groups[t.id]?.trim())} onClick={() => void run(async () => {
        if (!rule) return;
        const current = localQualifiers(await tournamentService.getEventTeams(eventId), await tournamentService.getMatches(eventId), source, rule.qualifiers_per_group);
        if (current.map(t => t.id).sort().join() !== preview.map(t => t.id).sort().join()) throw new Error('Los resultados han cambiado. Calcula los clasificados de nuevo.');
        const { data, error } = await supabase.rpc('transfer_local_qualifiers', { p_rule_id: rule.id, p_assignments: current.map(t => ({ source_id: t.id, group_name: groups[t.id] })) });
        if (error) throw error; setPreview([]); toast({ title: `${data} equipos incorporados a la fase nacional` });
      })}><ArrowRight />Confirmar paso a fase nacional</Button>
    </div>}
  </section>;
}