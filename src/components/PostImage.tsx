import { useState } from 'react';
import { ImageIcon, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PostImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Show a subtle gold-tinted placeholder while loading or if no image */
  variant?: 'card' | 'hero' | 'featured';
}

/**
 * Elegant image component for news posts.
 * - Shows a shimmering skeleton with brand-gold gradient while loading
 * - Falls back to a stylish placeholder if image fails or is missing
 * - Smooth fade-in once loaded
 */
export const PostImage = ({
  src,
  alt,
  className,
  imgClassName,
  variant = 'card',
}: PostImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const hasImage = !!src && !errored;

  const Icon = variant === 'featured' ? Newspaper : ImageIcon;

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden bg-muted',
        className
      )}
    >
      {/* Placeholder layer (always rendered behind the image) */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'bg-gradient-to-br from-muted via-muted/60 to-primary/10',
          hasImage && loaded ? 'opacity-0' : 'opacity-100',
          'transition-opacity duration-500'
        )}
        aria-hidden="true"
      >
        {hasImage && !loaded ? (
          // Loading shimmer
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : (
          // Empty / errored fallback
          <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
            <div className="p-3 sm:p-4 rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary/70" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium tracking-wide uppercase">
              FEMD Eventos
            </span>
          </div>
        )}
      </div>

      {hasImage && (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'relative w-full h-full object-cover transition-opacity duration-700',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
        />
      )}
    </div>
  );
};
