import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ParticipantMatch, RegistrationContext, RegistrationResult, rosterRegistrationService } from '@/services/rosterRegistrationService';
import { RegistrationMember, STAFF_POSITIONS, titleCase, validateRoster } from '@/services/rosterRegistrationValidation';

const newMember = (): RegistrationMember => ({ key: crypto.randomUUID(), first_name: '', last_name: '', birth_date: '', jersey_number: '', dni: '', no_dni: false, roster_role: 'player', staff_position: '', identity_resolution: undefined, matched_participant_id: null });

export function RosterRegistrationPage() {
  const location = useLocation();
  const token = location.hash.slice(1);
  const [context, setContext] = useState<RegistrationContext | null>(null);
  const [members, setMembers] = useState<RegistrationMember[]>(() => [newMember()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [participantMatches, setParticipantMatches] = useState<Record<string, ParticipantMatch[]>>({});
  const [matchingMember, setMatchingMember] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setFailure(''); setContext(null); setResult(null); setMembers([newMember()]);
    if (!/^[a-f0-9]{64}$/.test(token)) { setFailure('El enlace no es válido. Solicita el enlace completo al organizador.'); setLoading(false); return; }
    rosterRegistrationService.context(token).then(data => { if (active) { setContext(data); if (data.submitted) setResult(data.result); } })
      .catch(error => { if (active) setFailure(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  const update = (key: string, patch: Partial<RegistrationMember>) => {
    const identityChanged = 'first_name' in patch || 'last_name' in patch || 'no_dni' in patch;
    if (identityChanged) setParticipantMatches(previous => { const next = { ...previous }; delete next[key]; return next; });
    setMembers(previous => previous.map(member => member.key === key ? {
      ...member,
      ...patch,
      ...(identityChanged ? { identity_resolution: undefined, matched_participant_id: null } : {}),
    } : member));
  };

  const lookupParticipant = async (member: RegistrationMember): Promise<ParticipantMatch[] | null> => {
    if (!member.no_dni || !member.first_name.trim() || !member.last_name.trim()) return [];
    setMatchingMember(member.key);
    try {
      const matches = await rosterRegistrationService.findParticipantMatches(token, member.first_name, member.last_name);
      setParticipantMatches(previous => ({ ...previous, [member.key]: matches }));
      if (!matches.length) update(member.key, { identity_resolution: 'new', matched_participant_id: null });
      return matches;
    } catch (error) {
      setFailure((error as Error).message);
      return null;
    } finally {
      setMatchingMember(current => current === member.key ? null : current);
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!context || saving) return;
    const problems = validateRoster(members, context.occupied_numbers);
    setErrors(problems);
    if (problems.length) return;
    const membersToSubmit = [...members];
    for (let index = 0; index < membersToSubmit.length; index++) {
      const member = membersToSubmit[index];
      if (member.no_dni && !member.identity_resolution) {
        const matches = await lookupParticipant(member);
        if (matches === null || matches.length) return;
        membersToSubmit[index] = { ...member, identity_resolution: 'new', matched_participant_id: null };
      }
    }
    setSaving(true); setFailure('');
    try { setResult(await rosterRegistrationService.submit(token, membersToSubmit)); }
    catch (error) { setFailure((error as Error).message); }
    finally { setSaving(false); }
  };
  if (loading) return <p className="p-8 text-center" role="status">Cargando registro de plantilla…</p>;
  if (!context) return <div className="max-w-2xl mx-auto p-6"><h1 className="text-2xl font-bold mb-4">Registro de plantilla</h1><p role="alert">{failure}</p></div>;
  if (result || context.submitted) return <Card className="max-w-2xl mx-auto my-8 p-6 space-y-3"><h1 className="text-2xl font-bold">Plantilla registrada</h1><p>{context.team_name} · {context.event_title}</p><p role="status">{result?.registered ?? context.result?.registered ?? 0} miembros registrados correctamente. El organizador ya puede verlos en la plantilla del equipo.</p><p className="text-sm text-muted-foreground">Para corregir o añadir datos, contacta con el organizador. Este enlace ya se ha utilizado.</p></Card>;
  return <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-5">
    <h1 className="text-2xl font-bold">Registro de plantilla</h1>
    <p className="text-lg font-medium">{context.team_name}</p><p>{context.event_title}{context.category_name ? ` · ${context.category_name}` : ''}</p>
    <p className="text-sm text-muted-foreground">Completa todos los campos de cada jugador y miembro del cuerpo técnico. Cada miembro debe tener un dorsal distinto. Si no tiene DNI/NIE, marca «No tiene». Revisa toda la plantilla antes de enviarla: este enlace admite un único envío.</p>
    {context.occupied_numbers.length > 0 && <p className="text-sm">Dorsales ya registrados: {context.occupied_numbers.join(', ')}. Añade solamente los miembros que faltan.</p>}
    <form onSubmit={submit} noValidate className="space-y-4">
      <fieldset disabled={saving} className="space-y-4">
        {members.map((member, index) => <Card key={member.key} className="p-4 space-y-4">
          <div className="flex justify-between items-center gap-2"><h2 className="font-semibold">Miembro {index + 1}</h2><Button type="button" variant="outline" size="sm" disabled={members.length === 1} onClick={() => setMembers(previous => previous.filter(row => row.key !== member.key))}>Eliminar miembro {index + 1}</Button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1"><Label htmlFor={`${member.key}-role`}>Tipo de participante *</Label><select id={`${member.key}-role`} className="w-full border rounded-md h-10 bg-background px-3" value={member.roster_role} onChange={event => update(member.key, { roster_role: event.target.value as 'player' | 'staff', staff_position: '' })}><option value="player">Jugador</option><option value="staff">Cuerpo técnico</option></select></div>
            {member.roster_role === 'staff' && <div className="space-y-1"><Label htmlFor={`${member.key}-staff`}>Cargo *</Label><select id={`${member.key}-staff`} className="w-full border rounded-md h-10 bg-background px-3" required value={member.staff_position} onChange={event => update(member.key, { staff_position: event.target.value })}><option value="">Selecciona el cargo</option>{Object.entries(STAFF_POSITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
            <div className="space-y-1"><Label htmlFor={`${member.key}-jersey`}>Dorsal *</Label><Input id={`${member.key}-jersey`} required inputMode="numeric" maxLength={3} value={member.jersey_number} onChange={event => update(member.key, { jersey_number: event.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor={`${member.key}-first`}>Nombre *</Label><Input id={`${member.key}-first`} required maxLength={100} autoComplete="off" value={member.first_name} onChange={event => update(member.key, { first_name: event.target.value })} onBlur={() => update(member.key, { first_name: titleCase(member.first_name) })} /></div>
            <div className="space-y-1"><Label htmlFor={`${member.key}-last`}>Apellidos *</Label><Input id={`${member.key}-last`} required maxLength={150} autoComplete="off" value={member.last_name} onChange={event => update(member.key, { last_name: event.target.value })} onBlur={() => update(member.key, { last_name: titleCase(member.last_name) })} /></div>
            <div className="space-y-1"><Label htmlFor={`${member.key}-date`}>Fecha de nacimiento *</Label><Input id={`${member.key}-date`} required type="date" max={new Date().toISOString().slice(0, 10)} value={member.birth_date} onChange={event => update(member.key, { birth_date: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor={`${member.key}-dni`}>DNI/NIE *</Label><Input id={`${member.key}-dni`} required={!member.no_dni} disabled={member.no_dni} maxLength={9} autoComplete="off" value={member.dni} placeholder="12345678A / X1234567A" onChange={event => update(member.key, { dni: event.target.value.toUpperCase() })} /><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={member.no_dni} onChange={event => update(member.key, { no_dni: event.target.checked, dni: '' })} />No tiene DNI/NIE</label></div>
          </div>
          {member.no_dni && (member.first_name.trim() || member.last_name.trim()) && <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" disabled={!member.first_name.trim() || !member.last_name.trim() || matchingMember === member.key} onClick={() => lookupParticipant(member)}>
              {matchingMember === member.key ? 'Buscando coincidencias…' : 'Comprobar participante existente'}
            </Button>
            {(participantMatches[member.key] || []).length > 0 && <div className="rounded-md border p-3 space-y-3" role="status">
              <p className="font-medium text-sm">Existe un participante en la base de datos con el mismo nombre y apellidos.</p>
              {(participantMatches[member.key] || []).map(candidate => <div key={candidate.participant_id} className="flex items-center gap-3 rounded bg-muted/40 p-2">
                {candidate.last_team_logo_url && <img src={candidate.last_team_logo_url} alt="" className="w-9 h-9 object-contain" />}
                <div className="flex-1 text-sm">
                  <p className="font-medium">{candidate.participant_name}</p>
                  <p className="text-muted-foreground">Último torneo: {candidate.last_event_title || 'Sin participación registrada'} · Club: {candidate.last_team_name || 'No disponible'}</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => update(member.key, { identity_resolution: 'same', matched_participant_id: candidate.participant_id })}>Sí, es la misma persona</Button>
              </div>)}
              <Button type="button" size="sm" variant="ghost" onClick={() => update(member.key, { identity_resolution: 'new', matched_participant_id: null })}>No, crear una ficha nueva</Button>
            </div>}
            {member.identity_resolution === 'same' && <p className="text-sm text-green-700" role="status">Se vinculará al historial existente.</p>}
            {member.identity_resolution === 'new' && (participantMatches[member.key] || []).length > 0 && <p className="text-sm text-amber-700" role="status">Se creará una ficha nueva.</p>}
          </div>}
        </Card>)}
        <Button type="button" variant="outline" disabled={members.length >= 200} onClick={() => setMembers(previous => [...previous, newMember()])}>Añadir miembro</Button>
      </fieldset>
      {errors.length > 0 && <div role="alert" className="rounded-lg border border-destructive p-4"><p className="font-semibold">Revisa los siguientes datos:</p><ul className="list-disc pl-5 mt-2">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
      {failure && <p role="alert" className="text-destructive">{failure}</p>}
      <Button type="submit" disabled={saving}>{saving ? 'Registrando plantilla…' : `Registrar plantilla (${members.length} miembros)`}</Button>
    </form>
  </div>;
}
