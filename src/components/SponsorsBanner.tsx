import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  tier: string | null;
}

interface Props {
  eventId: string;
  /** Optional minimum sponsors before showing. Defaults to 1. */
  minSponsors?: number;
}

const normalizeTier = (t: string | null | undefined) => (t || '').toLowerCase().trim();

/**
 * Compact rotating banner that cycles through Premium + Oro sponsors
 * assigned to the current tournament. Renders nothing if no sponsors match.
 */
export const SponsorsBanner = ({ eventId, minSponsors = 1 }: Props) => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('sponsor_events')
        .select('sponsor:sponsors(id, name, logo_url, website, tier)')
        .eq('event_id', eventId);
      if (cancelled) return;
      const filtered: Sponsor[] = ((data || []) as any[])
        .map(r => r.sponsor as Sponsor)
        .filter(Boolean)
        .filter(s => ['premium', 'oro'].includes(normalizeTier(s.tier)))
        // Premium first, then oro; stable within tier
        .sort((a, b) => {
          const order = (t: string | null) => (normalizeTier(t) === 'premium' ? 0 : 1);
          return order(a.tier) - order(b.tier);
        });
      setSponsors(filtered);
      setIndex(0);
    };
    load();
    return () => { cancelled = true; };
  }, [eventId]);

  useEffect(() => {
    if (sponsors.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % sponsors.length), 4000);
    return () => clearInterval(t);
  }, [sponsors.length]);

  if (sponsors.length < minSponsors) return null;
  const current = sponsors[index];
  if (!current) return null;

  const content = (
    <div className="flex items-center justify-center gap-3 px-4 py-2 sm:py-3">
      {current.logo_url && (
        <img
          src={current.logo_url}
          alt={current.name}
          className="h-8 sm:h-10 max-w-[120px] sm:max-w-[180px] object-contain"
          loading="lazy"
        />
      )}
      <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
        {current.name}
      </span>
    </div>
  );

  return (
    <div className="my-4 sm:my-6 rounded-lg border bg-gradient-to-r from-primary/5 via-background to-primary/5 overflow-hidden transition-opacity duration-500">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 text-center pt-1.5">
        Patrocinador
      </div>
      {current.website ? (
        <a href={current.website} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
          {content}
        </a>
      ) : content}
    </div>
  );
};
