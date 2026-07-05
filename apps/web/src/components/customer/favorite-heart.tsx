'use client';

import { Heart } from 'lucide-react';

import { cn } from '@/lib/utils';

// Botão de favoritar (coração cheio/contorno). Controlado: o pai é dono do estado
// otimista e chama addFavorite/removeFavorite. Fica dentro de cards clicáveis, então
// para a propagação do clique. Espelha o HeartIcon do mobile.
export function FavoriteHeart({
  favorited,
  onToggle,
  size = 20,
  className,
}: {
  favorited: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={favorited}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn('transition-transform active:scale-90', className)}
    >
      <Heart
        style={{ width: size, height: size }}
        strokeWidth={2}
        className={favorited ? 'fill-coral text-coral' : 'text-[#c3b79c]'}
      />
    </button>
  );
}
