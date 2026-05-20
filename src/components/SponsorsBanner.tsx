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
  minSponsors?: number;
}

const normalizeTier = (t: string | null | undefined) => (t || '').toLowerCase().trim();

/**
 * Marquee-style banner that scrolls Premium + Oro sponsors right-to-left in a loop.
 * Renders nothing if no sponsors match.
 */
export const SponsorsBanner = ({ eventId, minSponsors = 1 }: Props) => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

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
        .sort((a, b) => {
          const order = (t: string | null) => (normalizeTier(t) === 'premium' ? 0 : 1);
          return order(a.tier) - order(b.tier);
        });
      setSponsors(filtered);
    };
    load();
    return () => { cancelled = true; };
  }, [eventId]);

  if (sponsors.length < minSponsors) return null;

  // Duplicate the list so the marquee loops seamlessly
  const loop = [...sponsors, ...sponsors];
  // Speed: ~6s per sponsor card so it feels smooth regardless of count
  const durationSec = Math.max(20, sponsors.length * 6);

  const renderItem = (s: Sponsor, i: number) => {
    const content = (
      <div className="flex items-center gap-3 px-6 sm:px-10 shrink-0">
        {s.logo_url ? (
          <img
            src={s.logo_url}
            alt={s.name}
            className="h-[72px] sm:h-24 w-auto max-w-[270px] sm:max-w-[360px] object-contain"
            loading="lazy"
          />
        ) : null}
        <span className="text-sm sm:text-base font-semibold text-foreground whitespace-nowrap">
          {s.name}
        </span>
      </div>
    );
    return (
      <div key={`${s.id}-${i}`} className="shrink-0">
        {s.website ? (
          <a href={s.website} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
            {content}
          </a>
        ) : content}
      </div>
    );
  };

  return (
    <div className="my-4 sm:my-6 rounded-lg border bg-gradient-to-r from-primary/5 via-background to-primary/5 overflow-hidden">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 text-center pt-1.5">
        Patrocinadores
      </div>
      <div className="relative overflow-hidden py-3 sm:py-4">
        <div
          className="flex items-center w-max sponsors-marquee-track"
          style={{ animation: `sponsors-marquee ${durationSec}s linear infinite` }}
        >
          {loop.map(renderItem)}
        </div>
      </div>
      <style>{`
        @keyframes sponsors-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .sponsors-marquee-track:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
};
