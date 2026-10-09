export const STAFF_POSITIONS = {
  primer_entrenador: 'Primer Entrenador',
  segundo_entrenador: 'Segundo Entrenador',
  delegado: 'Delegado',
  auxiliar: 'Auxiliar',
} as const;

export interface RegistrationMember {
  key: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  jersey_number: string;
  dni: string;
  no_dni: boolean;
  roster_role: 'player' | 'staff';
  staff_position: string;
}

export function titleCase(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es').replace(/(^|[\s'’-])(\p{L})/gu, (_, separator, letter) => separator + letter.toLocaleUpperCase('es'));
}

export function validateRoster(members: RegistrationMember[], occupied: number[] = [], today = new Date().toISOString().slice(0, 10)): string[] {
  const errors: string[] = [];
  if (!members.length) return ['Añade al menos un participante.'];
  if (members.length > 200) return ['La plantilla admite como máximo 200 miembros.'];
  const jerseys = new Set(occupied);
  const documents = new Set<string>();
  members.forEach((member, index) => {
    const prefix = `Miembro ${index + 1}: `;
    if (!member.first_name.trim() || !member.last_name.trim()) errors.push(prefix + 'nombre y apellidos son obligatorios.');
    if (member.first_name.trim().length > 100 || member.last_name.trim().length > 150) errors.push(prefix + 'nombre o apellidos demasiado largos.');
    const parsed = new Date(member.birth_date + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(member.birth_date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== member.birth_date || member.birth_date > today) errors.push(prefix + 'introduce una fecha de nacimiento válida que no sea futura.');
    if (!/^\d{1,3}$/.test(member.jersey_number)) errors.push(prefix + 'el dorsal es obligatorio y debe ser un número entre 0 y 999.');
    else if (jerseys.has(Number(member.jersey_number))) errors.push(prefix + 'el dorsal ya está utilizado en esta plantilla.');
    else jerseys.add(Number(member.jersey_number));
    if (!['player', 'staff'].includes(member.roster_role)) errors.push(prefix + 'selecciona jugador o cuerpo técnico.');
    if (member.roster_role === 'staff' && !Object.prototype.hasOwnProperty.call(STAFF_POSITIONS, member.staff_position)) errors.push(prefix + 'selecciona un cargo del cuerpo técnico.');
    if (!member.no_dni) {
      const dni = member.dni.toUpperCase();
      if (!/^[A-Z0-9][0-9]{7}[A-Z]$/.test(dni)) errors.push(prefix + 'DNI/NIE: 9 caracteres, primero letra o número, siete números y una letra final, sin espacios ni guiones.');
      else if (documents.has(dni)) errors.push(prefix + 'este DNI/NIE ya está incluido en la plantilla.');
      else documents.add(dni);
    }
  });
  return errors;
}

export function registrationPayload(members: RegistrationMember[]) {
  return members.map(member => ({
    first_name: titleCase(member.first_name), last_name: titleCase(member.last_name), birth_date: member.birth_date,
    jersey_number: Number(member.jersey_number), dni: member.no_dni ? null : member.dni.toUpperCase(),
    no_dni: member.no_dni, roster_role: member.roster_role,
    staff_position: member.roster_role === 'staff' ? member.staff_position : null,
  }));
}
