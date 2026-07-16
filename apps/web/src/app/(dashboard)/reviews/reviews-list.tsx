'use client';

import { useState, useTransition } from 'react';

import { cn } from '@/lib/utils';

import { replyToReviewAction } from './actions';

export interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string | null;
  whenLabel: string;
  ownerReply: string | null;
  contactRequested: boolean;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm tracking-tight" aria-label={`${n} de 5 estrelas`}>
      <span className="text-coral">{'★'.repeat(n)}</span>
      <span className="text-ink-30">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="border-line bg-paper shadow-soft rounded-2xl border p-4">
      <div className="text-ink-50 text-[10.5px] font-bold uppercase tracking-[0.12em]">{label}</div>
      <div className={cn('mt-1.5 font-serif text-3xl', valueClass ?? 'text-ink')}>{value}</div>
      <div className="text-ink-50 text-xs font-medium">{sub}</div>
    </div>
  );
}

export function ReviewsList({
  tenantName,
  avg,
  count,
  distribution,
  replied,
  contactRequests,
  reviews,
}: {
  tenantName: string;
  avg: number | null;
  count: number;
  distribution: [number, number, number, number, number];
  replied: number;
  contactRequests: number;
  reviews: ReviewRow[];
}) {
  const maxBar = Math.max(1, ...distribution);
  const repliedPct = count > 0 ? Math.round((replied / count) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
      <div>
        <h1 className="text-ink font-serif text-[28px] tracking-tight">Avaliações</h1>
        <p className="text-ink-50 mt-1 text-sm">
          O que seus clientes acharam - e o que você pode responder.
        </p>
      </div>

      {count === 0 ? (
        <div className="border-line bg-paper shadow-soft text-ink-50 rounded-[18px] border px-6 py-12 text-center text-sm">
          Ainda sem avaliações. Elas chegam depois que o cliente é atendido - o convite sai sozinho
          ~1h após o horário.
        </div>
      ) : (
        <>
          {/* KPIs + distribuição */}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[repeat(3,minmax(0,1fr))_1.4fr]">
            <Stat
              label="Média"
              value={avg != null ? avg.toFixed(1).replace('.', ',') : '-'}
              sub={`${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}
              valueClass="text-coral"
            />
            <Stat label="Respondidas" value={`${repliedPct}%`} sub={`${replied} de ${count}`} />
            <Stat
              label="Pedem contato"
              value={String(contactRequests)}
              sub={contactRequests > 0 ? 'precisam de você' : 'tudo em dia'}
              valueClass={contactRequests > 0 ? 'text-coral' : 'text-ink'}
            />
            <div className="border-line bg-paper shadow-soft flex flex-col justify-center gap-1.5 rounded-2xl border p-4">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const n = distribution[star - 1];
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-ink-50 w-6 flex-none text-xs font-semibold">{star}★</span>
                    <div className="bg-line h-1.5 flex-1 overflow-hidden rounded-full">
                      {/* ponytail: width runtime, Tailwind nao gera */}
                      <div
                        className="bg-green-bright h-full rounded-full"
                        style={{ width: `${(n / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="text-ink-50 w-6 flex-none text-right text-xs">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista */}
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} tenantName={tenantName} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewCard({ review, tenantName }: { review: ReviewRow; tenantName: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.ownerReply ?? '');
  const [reply, setReply] = useState(review.ownerReply);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const low = review.rating <= 2;

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await replyToReviewAction({ reviewId: review.id, text: next });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setReply(next && next.trim() ? next.trim() : null);
      setEditing(false);
    });
  }

  return (
    <div
      className={cn(
        'border-line bg-paper shadow-soft rounded-[18px] border p-4',
        review.contactRequested && 'border-coral/40',
      )}
    >
      <div className="flex items-center gap-3">
        <Stars n={review.rating} />
        <span className="text-ink truncate text-sm font-semibold">
          {review.customerName ?? 'Cliente'}
        </span>
        {low && (
          <span className="bg-coral-tint text-coral-deep flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold">
            Nota baixa
          </span>
        )}
        {review.contactRequested && (
          <span className="bg-coral flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold text-white">
            Pediu contato
          </span>
        )}
        <span className="text-ink-30 ml-auto flex-none text-xs">{review.whenLabel}</span>
      </div>

      {review.comment && (
        <p className="text-ink-70 mt-2.5 text-sm leading-relaxed">{review.comment}</p>
      )}

      {/* Resposta do dono */}
      {reply && !editing ? (
        <div className="border-line bg-cream-2 mt-3 rounded-xl border p-3">
          <div className="text-ink-50 text-[10.5px] font-bold uppercase tracking-[0.1em]">
            Resposta de {tenantName}
          </div>
          <p className="text-ink-70 mt-1 text-sm leading-relaxed">{reply}</p>
          <button
            type="button"
            onClick={() => {
              setText(reply);
              setEditing(true);
            }}
            className="text-green-deep mt-2 text-xs font-semibold hover:underline"
          >
            Editar resposta
          </button>
        </div>
      ) : editing ? (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Responda publicamente - com educação, mesmo (ou principalmente) nas notas baixas."
            className="border-edge bg-paper text-ink focus:border-green-deep min-h-[80px] w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none"
          />
          {error && <p className="text-destructive mt-1.5 text-xs">{error}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={pending || !text.trim()}
              onClick={() => save(text)}
              className="bg-green-deep rounded-lg px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {pending ? 'Salvando…' : 'Publicar resposta'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="text-ink-50 rounded-lg px-3 py-2 text-xs font-semibold hover:underline"
            >
              Cancelar
            </button>
            {reply && (
              <button
                type="button"
                disabled={pending}
                onClick={() => save(null)}
                className="text-destructive ml-auto rounded-lg px-3 py-2 text-xs font-semibold hover:underline"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setText('');
            setEditing(true);
          }}
          className="border-edge text-green-deep hover:bg-cream-2 mt-3 rounded-lg border px-3.5 py-2 text-xs font-semibold"
        >
          Responder
        </button>
      )}
    </div>
  );
}
