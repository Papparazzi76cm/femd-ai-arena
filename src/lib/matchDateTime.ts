/** Tournament schedules use Spanish local time, independent of the operator's device. */
export const MATCH_TIME_ZONE = 'Europe/Madrid';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MATCH_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function parts(date: Date) {
  return Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
}
export function matchDateToInput(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Fecha del partido no válida.');
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function matchDateToUTC(value: string): string {
  // Values which already specify an offset are instants, and must not be converted twice.
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('Fecha del partido no válida.');
    return date.toISOString();
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error('Fecha y hora del partido no válidas.');
  const [, year, month, day, hour, minute, second = '00'] = match;
  const wall = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  if (new Date(wall).toISOString().slice(0, 19) !== `${year}-${month}-${day}T${hour}:${minute}:${second}`) throw new Error('Fecha y hora del partido no válidas.');
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const time = wall + delta;
    const p = parts(new Date(time));
    offsets.add(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - time);
  }
  const candidates = [...offsets].map(offset => new Date(wall - offset)).filter(date => {
    const p = parts(date);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` === `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }).sort((a, b) => a.getTime() - b.getTime());
  if (!candidates.length) throw new Error('Esa hora no existe en España por el cambio al horario de verano. Selecciona otra hora.');
  // On the autumn repeated hour, consistently select its first occurrence.
  return candidates[0].toISOString();
}
