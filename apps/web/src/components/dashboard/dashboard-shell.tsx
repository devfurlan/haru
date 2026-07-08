'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { signOut } from '@/app/(auth)/actions';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

import { initialsOf, NAV_GROUPS, NAV_ITEMS, type NavItem } from './nav-config';

const SIDEBAR_BG =
  'radial-gradient(560px 320px at 18% -8%, rgba(47,211,122,.13), transparent 62%), radial-gradient(480px 380px at 85% 112%, rgba(255,90,54,.10), transparent 60%), var(--emerald)';
const RAIL_BG =
  'radial-gradient(300px 260px at 30% -8%, rgba(47,211,122,.13), transparent 62%), var(--emerald)';

export interface DashboardShellProps {
  tenantName: string;
  tenantLogoUrl: string | null;
  live: boolean;
  userName: string | null;
  userEmail: string;
  userAvatarUrl: string | null;
  isAdmin: boolean;
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
    <span className="size-[7px] flex-none rounded-full bg-green-bright animate-pulse-ring" aria-hidden />
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">
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
  const visibleItems = NAV_ITEMS.filter((i) => isAdmin || !i.adminOnly);
  const mobileItems = visibleItems.filter((i) => i.mobile);
  const moreItems = visibleItems.filter((i) => i.group === 'negocio');
  const statusText = live ? 'No ar pros seus clientes' : 'Página pausada';

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* ══ SIDEBAR (desktop, lg+) ══ */}
      <aside
        className="hidden w-[242px] flex-none flex-col px-3.5 pb-4 pt-[22px] text-on-emerald lg:flex"
        style={{ background: SIDEBAR_BG }}
      >
        <Link href="/dashboard" aria-label="Demandaê" className="mb-4 ml-2 self-start text-cream no-underline">
          <Logo color="coral" size="sm" />
        </Link>

        {/* estabelecimento */}
        <div
          className="mb-4 flex items-center gap-3 rounded-2xl border p-3"
          style={{ background: 'var(--surface-emerald-card)', borderColor: 'rgba(47,211,122,.18)' }}
        >
          <Avatar
            src={tenantLogoUrl}
            initials={tenantInitials}
            className="flex size-10 flex-none items-center justify-center rounded-xl bg-[rgba(47,211,122,.16)] font-serif text-[15px] text-green-bright"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-[14.5px] font-semibold leading-tight text-on-emerald">
              {tenantName}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-on-emerald-mut">
              {live && <StatusDot />}
              {statusText}
            </div>
          </div>
        </div>

        {/* nav agrupada */}
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <React.Fragment key={group.id}>
              <div className="px-3 pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-emerald-faint first:pt-1">
                {group.label}
              </div>
              {visibleItems
                .filter((i) => i.group === group.id)
                .map((item) => (
                  <SidebarLink
                    key={item.key}
                    item={item}
                    active={isActive(item.href)}
                    handoffCount={handoffCount}
                  />
                ))}
            </React.Fragment>
          ))}
        </nav>

        {/* usuário */}
        <div className="mt-3 flex items-center gap-2.5 border-t border-[rgba(250,245,234,.12)] pt-3">
          <Link
            href="/account"
            title="Minha conta"
            className="-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 no-underline hover:bg-[rgba(250,245,234,.08)]"
          >
            <Avatar
              src={userAvatarUrl}
              initials={userInitial}
              className="flex size-[34px] flex-none items-center justify-center rounded-full bg-coral text-[13px] font-bold text-white"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-on-emerald">{userName || 'Você'}</div>
              <div className="truncate text-[11px] font-medium text-on-emerald-faint">
                {roleLabel} · minha conta
              </div>
            </div>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              title="Sair"
              className="rounded-[10px] p-1.5 text-on-emerald-mut hover:bg-[rgba(250,245,234,.09)] hover:text-on-emerald"
            >
              <LogOut className="size-[17px]" />
            </button>
          </form>
        </div>
      </aside>

      {/* ══ RAIL (tablet, md..lg) ══ */}
      <aside
        className="hidden w-[72px] flex-none flex-col items-center gap-1 py-[18px] text-on-emerald md:flex lg:hidden"
        style={{ background: RAIL_BG }}
      >
        <Link href="/dashboard" aria-label="Início" className="mb-3 font-serif text-2xl italic text-coral no-underline">
          ê
        </Link>
        {visibleItems.map((item) => (
          <RailLink key={item.key} item={item} active={isActive(item.href)} handoffCount={handoffCount} />
        ))}
        <div className="flex-1" />
        <form action={signOut}>
          <button
            type="submit"
            title="Sair"
            className="flex size-11 items-center justify-center rounded-[13px] text-on-emerald-mut hover:bg-[rgba(250,245,234,.09)] hover:text-on-emerald"
          >
            <LogOut className="size-[19px]" />
          </button>
        </form>
        <Link
          href="/account"
          title="Minha conta"
          className="mt-1.5 flex size-9 items-center justify-center rounded-full bg-coral text-[13px] font-bold text-white no-underline"
        >
          {userInitial}
        </Link>
      </aside>

      {/* ══ TOPBAR (mobile) ══ */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 bg-green-deep px-4 text-on-emerald shadow-[0_6px_18px_rgba(10,51,36,.18)] md:hidden">
        <div className="text-cream">
          <Logo color="coral" size="sm" />
        </div>
        <div className="flex-1" />
        {live && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-on-emerald-mut">
            <StatusDot />
            No ar
          </span>
        )}
        {notification}
        <Link
          href="/account"
          aria-label="Minha conta"
          className="flex size-[30px] items-center justify-center rounded-full bg-coral text-xs font-bold text-white no-underline"
        >
          {userInitial}
        </Link>
      </header>

      {/* ══ CONTEÚDO ══ */}
      <main className="min-w-0 flex-1 overflow-y-auto pb-[76px] pt-14 md:pb-0 md:pt-0">
        {banners}
        {/* p-6 mantém parity com o layout antigo; páginas redesenhadas vivem dentro
            deste padding (trazem só max-width + ritmo vertical). */}
        <div className="p-6">{children}</div>
      </main>

      {/* ══ BOTTOM NAV (mobile) ══ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-edge bg-paper px-1 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(10,51,36,.08)] md:hidden">
        {mobileItems.map((item) => (
          <BottomLink key={item.key} item={item} active={isActive(item.href)} handoffCount={handoffCount} />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center gap-[3px] py-[5px]',
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
            className="absolute inset-0 bg-[rgba(10,51,36,.45)]"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-paper px-[18px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-14px_40px_rgba(10,51,36,.3)]">
            <div className="mx-auto mb-3 mt-1.5 h-1 w-10 rounded-full bg-edge" />
            <div className="px-1 pb-2 font-serif text-[17px] text-ink">Seu negócio</div>
            {moreItems.map((item) => (
              <SheetLink key={item.key} item={item} onNavigate={() => setMoreOpen(false)} />
            ))}
            <Link
              href="/account"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 border-t border-dotted border-edge py-3.5 text-sm font-semibold text-ink no-underline"
            >
              <span className="text-ink-70">
                <UserGlyph />
              </span>
              Minha conta
              <span className="ml-auto text-ink-30">›</span>
            </Link>
            <form action={signOut} className="border-t border-dotted border-edge">
              <button
                type="submit"
                className="flex w-full items-center gap-3 py-3.5 text-sm font-semibold text-ink-50"
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
        active
          ? 'bg-[rgba(47,211,122,.15)] text-on-emerald'
          : 'text-on-emerald-mut hover:bg-[rgba(250,245,234,.09)]',
      )}
    >
      <Icon className="size-[18px] flex-none" strokeWidth={2.1} />
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
        active
          ? 'bg-[rgba(47,211,122,.15)] text-on-emerald'
          : 'text-on-emerald-mut hover:bg-[rgba(250,245,234,.09)]',
      )}
    >
      <Icon className="size-5" strokeWidth={2.1} />
      {item.badge === 'handoff' && handoffCount > 0 && (
        <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-green-deep bg-coral" />
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
        'relative flex flex-1 flex-col items-center gap-[3px] py-[5px] no-underline',
        active ? 'text-green-deep' : 'text-ink-30',
      )}
    >
      <Icon className="size-[21px]" strokeWidth={2.1} />
      <span className="text-[10px] font-semibold">{item.label}</span>
      {item.badge === 'handoff' && handoffCount > 0 && (
        <span className="absolute left-[calc(50%+6px)] top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9.5px] font-bold text-white">
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
      className="flex items-center gap-3 border-t border-dotted border-edge py-3.5 text-sm font-semibold text-ink no-underline"
    >
      <Icon className="size-[19px] text-ink-70" strokeWidth={2.1} />
      {item.label}
      <span className="ml-auto text-ink-30">›</span>
    </Link>
  );
}

function MoreIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6" />
    </svg>
  );
}
