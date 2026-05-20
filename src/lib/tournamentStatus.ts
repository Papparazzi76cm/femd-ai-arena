// Tournament lifecycle status helper. All comparisons use Europe/Madrid date-only.

export type TournamentStatus = 'upcoming' | 'live' | 'finished';

interface EventLike {
  date: string;
  end_date?: string | null;
}

// Return a YYYY-MM-DD string in Europe/Madrid for a Date.
const toMadridDateString = (d: Date): string => {
  // en-CA gives ISO-like YYYY-MM-DD
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
};

export const getTournamentStatus = (event: EventLike, now: Date = new Date()): TournamentStatus => {
  if (!event?.date) return 'upcoming';
  const today = toMadridDateString(now);
  const start = toMadridDateString(new Date(event.date));
  const end = event.end_date ? toMadridDateString(new Date(event.end_date)) : start;

  if (today < start) return 'upcoming';
  if (today > end) return 'finished';
  return 'live';
};

export const getTournamentStatusLabel = (status: TournamentStatus): string => {
  switch (status) {
    case 'live': return 'En juego';
    case 'upcoming': return 'Próximamente';
    case 'finished': return 'Finalizado';
  }
};
