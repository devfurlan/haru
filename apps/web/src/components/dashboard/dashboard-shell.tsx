'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { signOut } from '@/app/(auth)/actions';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

import { initialsOf, NAV_GROUPS, NAV_ITEMS, type NavItem } from './nav-config';

export interface DashboardShellProps {
  tenantName: string;
  tenantLogoUrl: string | null;
  live: boolean;
  userName: string | null;
  userEmail: string;
  userAvatarUrl: string | null;
  isAdmin: boolean;
  /** Addon "Atendente IA" ativo. Gate da aba Conversas (sem addon, inbox fica vazio). */
  addonActive: boolean;
  /** Conversas esperando você (badge coral). Populado na fase de Conversas. */
  handoffCount?: number;
  /** Sino de notificações (server component) injetado pelo layout. */
  notification?: React.ReactNode;
  /** Banners (billing/uso) - full-width no topo do conteúdo. */
  banners?: React.ReactNode;
  children: React.ReactNode;
}

function useIsActive() {
  const pathname = usePathname();
  return React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );
}

function StatusDot() {
  return (
    <span
      className="bg-green-bright animate-pulse-ring size-[7px] flex-none rounded-full"
      aria-hidden
    />
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="bg-coral ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">
      {count}
    </span>
  );
}

function Avatar({
  src,
  initials,
  className,
}: {
  src: string | null;
  initials: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn('object-cover', className)} />;
  }
  return <span className={className}>{initials}</span>;
}

export function DashboardShell({
  tenantName,
  tenantLogoUrl,
  live,
  userName,
  userEmail,
  userAvatarUrl,
  isAdmin,
  addonActive,
  handoffCount = 0,
  notification,
  banners,
  children,
}: DashboardShellProps) {
  const isActive = useIsActive();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const tenantInitials = initialsOf(tenantName, 'D');
  const userInitial = initialsOf(userName || userEmail, 'U');
  const roleLabel = isAdmin ? 'Administrador' : 'Equipe';
  const visibleItems = NAV_ITEMS.filter(
    (i) => (isAdmin || !i.adminOnly) && (addonActive || !i.addonOnly),
  );
  const mobileItems = visibleItems.filter((i) => i.mobile);
  const moreItems = visibleItems.filter((i) => i.group === 'negocio');
  const statusText = live ? 'No ar pros seus clientes' : 'Página pausada';

  return (
    <div className="bg-cream flex h-screen overflow-hidden">
      {/* ══ SIDEBAR (desktop, lg+) ══ */}
      <aside className="text-on-emerald pt-5.5 hidden w-[242px] flex-none flex-col px-3.5 pb-4 [background:radial-gradient(560px_320px_at_18%_-8%,rgba(47,211,122,.13),transparent_62%),radial-gradient(480px_380px_at_85%_112%,rgba(255,90,54,.10),transparent_60%),var(--emerald)] lg:flex">
        <Link
          href="/dashboard"
          aria-label="Demandaê"
          className="text-cream mb-4 ml-2 self-start no-underline"
        >
          <Logo color="coral" size="sm" />
        </Link>

        {/* estabelecimento */}
        <div className="bg-green-card border-green-bright/18 mb-4 flex items-center gap-3 rounded-2xl border p-3">
          <Avatar
            src={tenantLogoUrl}
            initials={tenantInitials}
            className="text-green-bright bg-green-bright/16 flex size-10 flex-none items-center justify-center rounded-xl font-serif text-[15px]"
          />
          <div className="min-w-0 flex-1">
            <div className="text-on-emerald truncate font-serif text-[14.5px] font-semibold leading-tight">
              {tenantName}
            </div>
            <div className="text-on-emerald-mut mt-0.5 flex items-center gap-1.5 text-[11px] font-medium">
              {live && <StatusDot />}
              {statusText}
            </div>
          </div>
        </div>

        {/* nav agrupada */}
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV_GROUPS.map((group) => {
            const groupItems = visibleItems.filter((i) => i.group === group.id);
            if (groupItems.length === 0) return null; // não mostra header de grupo vazio (equipe)
            return (
              <React.Fragment key={group.id}>
                <div className="text-on-emerald-faint px-3 pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-[0.14em] first:pt-1">
                  {group.label}
                </div>
                {groupItems.map((item) => (
                  <SidebarLink
                    key={item.key}
                    item={item}
                    active={isActive(item.href)}
                    handoffCount={handoffCount}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </nav>

        {/* usuário */}
        <div className="border-cream/12 mt-3 flex items-center gap-2.5 border-t pt-3">
          <Link
            href="/account"
            title="Minha conta"
            className="hover:bg-cream/8 -m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 no-underline"
          >
            <Avatar
              src={userAvatarUrl}
              initials={userInitial}
              className="bg-coral size-8.5 flex flex-none items-center justify-center rounded-full text-[13px] font-bold text-white"
            />
            <div className="min-w-0 flex-1">
              <div className="text-on-emerald truncate text-[13px] font-semibold">
                {userName || 'Você'}
              </div>
              <div className="text-on-emerald-faint truncate text-[11px] font-medium">
                {roleLabel} · minha conta
              </div>
            </div>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              title="Sair"
              className="text-on-emerald-mut hover:text-on-emerald hover:bg-cream/9 rounded-[10px] p-1.5"
            >
              <LogOut className="size-[17px]" />
            </button>
          </form>
        </div>
      </aside>

      {/* ══ RAIL (tablet, md..lg) ══ */}
      <aside className="text-on-emerald w-18 py-4.5 hidden flex-none flex-col items-center gap-1 [background:radial-gradient(300px_260px_at_30%_-8%,rgba(47,211,122,.13),transparent_62%),var(--emerald)] md:flex lg:hidden">
        <Link
          href="/dashboard"
          aria-label="Início"
          className="text-coral mb-3 font-serif text-2xl italic no-underline"
        >
          ê
        </Link>
        {visibleItems.map((item) => (
          <RailLink
            key={item.key}
            item={item}
            active={isActive(item.href)}
            handoffCount={handoffCount}
          />
        ))}
        <div className="flex-1" />
        <form action={signOut}>
          <button
            type="submit"
            title="Sair"
            className="text-on-emerald-mut hover:text-on-emerald hover:bg-cream/9 flex size-11 items-center justify-center rounded-[13px]"
          >
            <LogOut className="size-[19px]" />
          </button>
        </form>
        <Link
          href="/account"
          title="Minha conta"
          className="bg-coral mt-1.5 flex size-9 items-center justify-center rounded-full text-[13px] font-bold text-white no-underline"
        >
          {userInitial}
        </Link>
      </aside>

      {/* ══ TOPBAR (mobile) ══ */}
      <header className="bg-green-deep text-on-emerald fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 px-4 shadow-[0_6px_18px_rgba(10,51,36,.18)] md:hidden">
        <div className="text-cream">
          <Logo color="coral" size="sm" />
        </div>
        <div className="flex-1" />
        {live && (
          <span className="text-on-emerald-mut inline-flex items-center gap-1.5 text-[11px] font-medium">
            <StatusDot />
            No ar
          </span>
        )}
        {notification}
        <Link
          href="/account"
          aria-label="Minha conta"
          className="bg-coral size-7.5 flex items-center justify-center rounded-full text-xs font-bold text-white no-underline"
        >
          {userInitial}
        </Link>
      </header>

      {/* ══ CONTEÚDO ══ */}
      <main className="pb-19 min-w-0 flex-1 overflow-y-auto pt-14 md:pb-0 md:pt-0">
        {banners}
        {/* p-6 mantém parity com o layout antigo; páginas redesenhadas vivem dentro
            deste padding (trazem só max-width + ritmo vertical). */}
        <div className="p-6">{children}</div>
      </main>

      {/* ══ BOTTOM NAV (mobile) ══ */}
      <nav className="border-edge bg-paper fixed inset-x-0 bottom-0 z-40 flex border-t px-1 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(10,51,36,.08)] md:hidden">
        {mobileItems.map((item) => (
          <BottomLink
            key={item.key}
            item={item}
            active={isActive(item.href)}
            handoffCount={handoffCount}
          />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 py-1',
            moreItems.some((i) => isActive(i.href)) ? 'text-green-deep' : 'text-ink-30',
          )}
        >
          <MoreIcon />
          <span className="text-[10px] font-semibold">Mais</span>
        </button>
      </nav>

      {/* ══ SHEET "Mais" (mobile) ══ */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setMoreOpen(false)}
            className="bg-green-deep/45 absolute inset-0"
          />
          <div className="bg-paper px-4.5 absolute inset-x-0 bottom-0 rounded-t-[28px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-14px_40px_rgba(10,51,36,.3)]">
            <div className="bg-edge mx-auto mb-3 mt-1.5 h-1 w-10 rounded-full" />
            <div className="text-ink px-1 pb-2 font-serif text-[17px]">Seu negócio</div>
            {moreItems.map((item) => (
              <SheetLink key={item.key} item={item} onNavigate={() => setMoreOpen(false)} />
            ))}
            <Link
              href="/account"
              onClick={() => setMoreOpen(false)}
              className="border-edge text-ink flex items-center gap-3 border-t border-dotted py-3.5 text-sm font-semibold no-underline"
            >
              <span className="text-ink-70">
                <UserGlyph />
              </span>
              Minha conta
              <span className="text-ink-30 ml-auto">›</span>
            </Link>
            <form action={signOut} className="border-edge border-t border-dotted">
              <button
                type="submit"
                className="text-ink-50 flex w-full items-center gap-3 py-3.5 text-sm font-semibold"
              >
                <LogOut className="size-[19px]" />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  item,
  active,
  handoffCount,
}: {
  item: NavItem;
  active: boolean;
  handoffCount: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold no-underline transition-colors',
        active ? 'text-on-emerald bg-green-bright/15' : 'text-on-emerald-mut hover:bg-cream/9',
      )}
    >
      <Icon className="size-4.5 flex-none" strokeWidth={2.1} />
      {item.label}
      {item.badge === 'handoff' && <Badge count={handoffCount} />}
    </Link>
  );
}

function RailLink({
  item,
  active,
  handoffCount,
}: {
  item: NavItem;
  active: boolean;
  handoffCount: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        'relative flex size-11 items-center justify-center rounded-[13px] no-underline transition-colors',
        active ? 'text-on-emerald bg-green-bright/15' : 'text-on-emerald-mut hover:bg-cream/9',
      )}
    >
      <Icon className="size-5" strokeWidth={2.1} />
      {item.badge === 'handoff' && handoffCount > 0 && (
        <span className="border-green-deep bg-coral absolute right-1.5 top-1.5 size-2.5 rounded-full border-2" />
      )}
    </Link>
  );
}

function BottomLink({
  item,
  active,
  handoffCount,
}: {
  item: NavItem;
  active: boolean;
  handoffCount: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex flex-1 flex-col items-center gap-1 py-1 no-underline',
        active ? 'text-green-deep' : 'text-ink-30',
      )}
    >
      <Icon className="size-[21px]" strokeWidth={2.1} />
      <span className="text-[10px] font-semibold">{item.label}</span>
      {item.badge === 'handoff' && handoffCount > 0 && (
        <span className="bg-coral absolute left-[calc(50%+6px)] top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9.5px] font-bold text-white">
          {handoffCount}
        </span>
      )}
    </Link>
  );
}

function SheetLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="border-edge text-ink flex items-center gap-3 border-t border-dotted py-3.5 text-sm font-semibold no-underline"
    >
      <Icon className="text-ink-70 size-[19px]" strokeWidth={2.1} />
      {item.label}
      <span className="text-ink-30 ml-auto">›</span>
    </Link>
  );
}

function MoreIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
    >
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6" />
    </svg>
  );
}
