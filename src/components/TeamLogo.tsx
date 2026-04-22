import { useState } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type TeamLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface TeamLogoProps {
  src?: string | null;
  alt?: string;
  size?: TeamLogoSize;
  className?: string;
  rounded?: boolean;
  /** When true, the container fills the parent width and keeps a 1:1 aspect ratio. */
  fluid?: boolean;
}

const SIZE_CLASSES: Record<TeamLogoSize, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-24 h-24 sm:w-32 sm:h-32',
};

const ICON_SIZE: Record<TeamLogoSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-12 h-12',
};

/**
 * TeamLogo: contenedor cuadrado normalizado para escudos de clubes.
 *
 * - Mantiene `aspect-square` para evitar desalineaciones entre tarjetas y filas.
 * - Si la URL falla, muestra un fallback con icono `Shield` (en vez del icono
 *   nativo de imagen rota del navegador).
 * - El alt se renderiza como `aria-label` y queda oculto visualmente, evitando
 *   el "alt text" recortado dentro del marco de la imagen rota.
 */
export const TeamLogo = ({
  src,
  alt = '',
  size = 'md',
  className,
  rounded = false,
  fluid = false,
}: TeamLogoProps) => {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  const sizeCls = fluid ? 'w-full h-auto' : SIZE_CLASSES[size];

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        'relative shrink-0 aspect-square overflow-hidden flex items-center justify-center bg-transparent',
        rounded ? 'rounded-full' : 'rounded-md',
        sizeCls,
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          onError={() => setErrored(true)}
          className="w-full h-full object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted/40">
          <Shield className={cn('text-muted-foreground/60', ICON_SIZE[size])} aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export default TeamLogo;
