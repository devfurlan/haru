'use client';

import { ArrowLeft, Star } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { customerRequestOwnerContact, customerSubmitReview } from '@/app/(customer)/actions';
import { TenantAvatar } from '@/components/customer/tenant-avatar';
import type { CustomerAppointmentItem } from '@/lib/customer';
import { cn } from '@/lib/utils';

// Frase abaixo das estrelas, por nota (índice = quantidade de estrelas).
const LABELS = [
  '',
  'Eita, o que houve?',
  'Podia ser melhor',
  'Foi ok',
  'Gostei bastante',
  'Perfeito, virou ritual!',
];
// Tags rápidas: conjunto muda conforme a nota (elogio vs. ressalva).
const CHIPS_BONS = [
  'Atendimento nota dez',
  'Pontualidade',
  'Ambiente agradável',
  'Resultado impecável',
  'Preço justo',
];
const CHIPS_RUINS = [
  'Atraso no horário',
  'Atendimento frio',
  'Resultado abaixo',
  'Ambiente',
  'Preço',
];

// Fluxo de avaliação (tela cheia, espelha o painel v2 do Claude Design): estrelas com
// rótulo dinâmico -> tags contextuais + comentário opcional -> tela de agradecimento.
// A nota é POR ESTABELECIMENTO (uma por cliente/tenant, editável); ancorada neste
// atendimento só pra dar contexto. As tags escolhidas são dobradas no comentário.
export function AvaliarClient({
  item,
  initialRating,
  initialComment,
}: {
  item: CustomerAppointmentItem;
  initialRating: number;
  initialComment: string;
}) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [chips, setChips] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState(initialComment);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Nudge de nota baixa: pedido de contato ao dono (só aparece no agradecimento, rating <= 2).
  const [contactRequested, setContactRequested] = useState(false);
  const [contactPending, startContact] = useTransition();

  function askOwnerContact() {
    startContact(async () => {
      const res = await customerRequestOwnerContact({ tenantId: item.tenant.id });
      if (res && 'error' in res) {
        setError(res.error);
        return;
      }
      setContactRequested(true);
    });
  }

  const chipList = rating >= 4 ? CHIPS_BONS : CHIPS_RUINS;

  function pickRating(n: number) {
    setRating(n);
    setChips({}); // conjuntos elogio/ressalva diferem: troca de nota limpa a seleção
  }

  function submit() {
    if (rating < 1) {
      setError('Escolha de 1 a 5 estrelas.');
      return;
    }
    setError(null);
    const tags = chipList.filter((c) => chips[c]);
    const finalComment = [tags.join(' · '), comment.trim()].filter(Boolean).join('\n');
    startTransition(async () => {
      const res = await customerSubmitReview({
        tenantId: item.tenant.id,
        rating,
        comment: finalComment,
      });
      if (res && 'error' in res) {
        setError(res.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="bg-green-deep relative min-h-[calc(100vh-59px)] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(520px 320px at 82% 6%,rgba(47,211,122,.22),transparent),radial-gradient(460px 320px at 10% 94%,rgba(255,90,54,.14),transparent)',
          }}
        />
        <div className="relative mx-auto max-w-[520px] px-8 py-[88px] text-center">
          <div className="bg-green-bright mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full">
            <Star className="h-9 w-9 fill-[#0A3324] text-[#0A3324]" />
          </div>
          <p className="text-cream mt-6 font-serif text-[36px] leading-[1.1] tracking-[-0.01em]">
            Valeu pela <em className="text-green-bright italic">nota</em>!
          </p>
          <p className="mx-auto mt-2.5 text-[15px] leading-[1.55] text-[#8fbfa4]">
            Sua avaliação de ★ {rating},0 já foi pro {item.tenant.name}. Isso ajuda outros clientes
            a escolher melhor.
          </p>

          {/* Nota baixa: oferece resgate pelo dono. A avaliação continua pública. */}
          {rating <= 2 ? (
            <div className="mx-auto mt-6 max-w-[420px] rounded-[16px] border border-[rgba(250,245,234,0.18)] bg-[rgba(250,245,234,0.06)] p-5">
              {contactRequested ? (
                <p className="text-[14px] leading-[1.5] text-[#cfe6d8]">
                  Pronto. O {item.tenant.name} foi avisado e pode te procurar pra resolver.
                </p>
              ) : (
                <>
                  <p className="text-cream text-[14.5px] font-semibold">Não rolou dessa vez?</p>
                  <p className="mt-1 text-[13px] leading-[1.5] text-[#8fbfa4]">
                    Se quiser, o {item.tenant.name} pode entrar em contato pra resolver.
                  </p>
                  <button
                    type="button"
                    onClick={askOwnerContact}
                    disabled={contactPending}
                    className="bg-coral mt-3.5 rounded-[12px] px-5 py-3 text-[13.5px] font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-60"
                  >
                    {contactPending ? 'Enviando…' : 'Quero que entrem em contato'}
                  </button>
                </>
              )}
            </div>
          ) : null}

          {/* Nota boa: convida a voltar. */}
          {rating >= 4 ? (
            <Link
              href={`/${item.tenant.slug}`}
              className="text-green-bright mt-6 inline-block text-[14px] font-bold hover:underline"
            >
              Gostou? Agende sua próxima →
            </Link>
          ) : null}

          <div className="mt-7 flex justify-center gap-2.5">
            <Link
              href="/conta/agendamentos"
              className="bg-coral rounded-[14px] px-7 py-3.5 text-[14px] font-bold text-white transition-transform active:scale-[0.97]"
            >
              Voltar ao histórico
            </Link>
            <Link
              href="/conta"
              className="text-cream rounded-[14px] border border-[rgba(250,245,234,0.28)] px-7 py-3.5 text-[14px] font-bold transition-colors hover:bg-[rgba(250,245,234,0.08)]"
            >
              Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-5 py-7 md:px-8">
      {/* Cabeçalho compacto: voltar + "Avaliar atendimento" + data */}
      <div className="flex items-center gap-3.5">
        <Link
          href={`/conta/agendamentos/${item.id}`}
          aria-label="Voltar"
          className="border-edge bg-paper text-green-deep flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] border transition-transform active:scale-[0.95]"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </Link>
        <div className="min-w-0">
          <p className="text-ink text-[15px] font-semibold">Avaliar atendimento</p>
          <p className="text-sub truncate text-[12.5px] font-medium capitalize">{item.whenLabel}</p>
        </div>
      </div>

      {/* Estabelecimento avaliado */}
      <div className="border-line bg-paper mt-5 flex items-center gap-3.5 rounded-[18px] border p-[15px]">
        <TenantAvatar name={item.tenant.name} logoUrl={item.tenant.logoUrl} size={48} radius={14} />
        <div className="min-w-0">
          <p className="text-ink truncate font-serif text-[17px]">{item.tenant.name}</p>
          <p className="text-sub mt-0.5 truncate text-[12.5px] font-medium">
            {item.serviceName}
            {item.professionalName ? ` · com ${item.professionalName}` : ''}
          </p>
        </div>
      </div>

      {/* Estrelas */}
      <div className="mt-8 text-center">
        <p className="text-ink font-serif text-[27px] leading-[1.15] tracking-[-0.01em]">
          Como foi <em className="text-green-deep italic">dessa vez</em>?
        </p>
        <div className="mt-5 flex justify-center gap-2.5" role="radiogroup" aria-label="Nota">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                onClick={() => pickRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-[1.14] active:scale-95"
              >
                <Star
                  className={cn('h-11 w-11', active ? 'fill-coral text-coral' : 'text-[#c3b79c]')}
                  strokeWidth={1.6}
                />
              </button>
            );
          })}
        </div>
        <p className="text-sub mt-2.5 min-h-[22px] font-serif text-[15px] italic">
          {LABELS[rating]}
        </p>
      </div>

      {/* Tags + comentário (só depois de dar uma nota) */}
      {rating > 0 ? (
        <div className="mt-6">
          <p className="text-ink text-[14px] font-semibold">
            {rating >= 4 ? 'O que brilhou?' : 'O que pegou?'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chipList.map((c) => {
              const on = !!chips[c];
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChips((s) => ({ ...s, [c]: !s[c] }))}
                  className={cn(
                    'rounded-full border px-[17px] py-2.5 text-[12.5px] font-bold transition-colors',
                    on
                      ? 'bg-green-deep border-green-deep text-cream'
                      : 'border-edge bg-paper text-ink hover:bg-cream-2',
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <p className="text-ink mt-6 text-[14px] font-semibold">
            Quer contar mais? <span className="text-ink-30 font-medium">(opcional)</span>
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Escreva aqui o que você achou do atendimento, do ambiente, do profissional…"
            className="border-edge bg-paper text-ink focus:border-green-deep mt-2.5 min-h-[88px] w-full resize-none rounded-[15px] border px-4 py-3.5 text-sm outline-none placeholder:text-[#9aa8a0]"
          />

          {error ? <p className="text-destructive mt-2 text-sm">{error}</p> : null}

          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="bg-coral mt-5 w-full rounded-[15px] py-4 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? 'Enviando…' : 'Enviar avaliação'}
          </button>
        </div>
      ) : error ? (
        <p className="text-destructive mt-4 text-center text-sm">{error}</p>
      ) : null}
    </div>
  );
}
