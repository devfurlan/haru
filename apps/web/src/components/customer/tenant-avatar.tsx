import { cn } from '@/lib/utils';

// Logo do estabelecimento (ou a inicial em Fraunces coral como fallback). Espelha
// apps/mobile/src/components/tenant-avatar.tsx. `size`/`radius` em px. Server component.
export function TenantAvatar({
  name,
  logoUrl,
  size = 48,
  radius = 15,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className={cn('shrink-0 overflow-hidden', className)}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="bg-coral/10 flex h-full w-full items-center justify-center">
          <span
            className="text-coral font-serif font-bold"
            style={{ fontSize: Math.round(size * 0.4) }}
          >
            {initial}
          </span>
        </div>
      )}
    </div>
  );
}
