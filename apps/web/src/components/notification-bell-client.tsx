'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

import { formatRelativeShort } from '@/lib/relative-time';
import { cn } from '@/lib/utils';

import { markAllNotificationsRead } from './notification-bell-actions';

export interface NotifItem {
  id: string;
  channel: 'ACCOUNT' | 'PRODUCT';
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  /** ISO string ou null (não lida). */
  readAt: string | null;
  /** ISO string. */
  createdAt: string;
}

/**
 * Sino de notificações: badge de não-lidas + painel com as duas seções (Conta e
 * Novidades). Abrir marca tudo como lido (otimista no cliente + persiste no servidor).
 * Fecha por clique fora (backdrop) - é só visualização, sem formulário.
 */
export function NotificationBellClient({
  notifications,
  unread,
}: {
  notifications: NotifItem[];
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unread);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && localUnread > 0) {
      setLocalUnread(0);
      markAllNotificationsRead().catch(() => {});
    }
  }

  const account = notifications.filter((n) => n.channel === 'ACCOUNT');
  const product = notifications.filter((n) => n.channel === 'PRODUCT');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={localUnread > 0 ? `Notificações (${localUnread} não lidas)` : 'Notificações'}
        className="hover:bg-accent relative flex h-9 w-9 items-center justify-center rounded-md transition-colors"
      >
        <Bell className="text-muted-foreground h-5 w-5" />
        {localUnread > 0 && (
          <span className="bg-coral text-cream absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
            {localUnread > 9 ? '9+' : localUnread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="bg-background absolute left-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border shadow-lg">
            <div className="border-b px-4 py-2.5">
              <p className="text-sm font-semibold">Notificações</p>
            </div>
            {notifications.length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                Nenhuma novidade por aqui ainda.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Section title="Conta" items={account} onNavigate={() => setOpen(false)} />
                <Section title="Novidades" items={product} onNavigate={() => setOpen(false)} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NotifItem[];
  onNavigate: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-muted-foreground bg-muted/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide">
        {title}
      </p>
      <ul>
        {items.map((n) => (
          <li key={n.id} className="border-b last:border-b-0">
            <div className={cn('px-4 py-3', !n.readAt && 'bg-coral/5')}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                <span className="text-muted-foreground mt-0.5 shrink-0 text-[11px]">
                  {formatRelativeShort(new Date(n.createdAt))}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{n.body}</p>
              {n.ctaHref && n.ctaLabel && (
                <Link
                  href={n.ctaHref}
                  onClick={onNavigate}
                  className="text-coral mt-1.5 inline-block text-xs font-semibold hover:underline"
                >
                  {n.ctaLabel} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
