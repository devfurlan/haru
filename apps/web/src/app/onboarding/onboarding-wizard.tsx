'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';

import { finishOnboarding, skipOnboarding } from './actions';
import { SEGMENTS, suggestionsFor, WEEKDAYS } from './suggestions';

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
});
const money = (cents: number) => (cents === 0 ? 'grátis' : BRL.format(Math.round(cents / 100)));
const STEP_LABELS = ['Seu negócio', 'Serviços', 'Horários', 'Sua página'];

const inputCls =
  'rounded-xl border border-edge bg-cream px-3.5 py-3 text-sm text-ink outline-none placeholder:text-ink-30 focus:border-green-deep';

export function OnboardingWizard({
  tenantName,
  slug,
  segment: initialSegment,
  address: initialAddress,
  plano,
}: {
  tenantName: string;
  slug: string;
  segment: string | null;
  address: string | null;
  plano: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  const [name, setName] = useState(tenantName);
  const [segment, setSegment] = useState<string | null>(initialSegment);
  const [address, setAddress] = useState(initialAddress ?? '');
  const [services, setServices] = useState<Set<string>>(
    () => new Set(suggestionsFor(initialSegment).map((s) => s.key)),
  );
  const [days, setDays] = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5, 6]));
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = suggestionsFor(segment);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.demandae.com').replace(/\/$/, '');
  const nextUrl = plano ? `/assinatura?plano=${encodeURIComponent(plano)}` : '/dashboard';

  function selectSegment(seg: string) {
    setSegment(seg);
    // Troca as sugestões de serviço p/ as do novo segmento (todas marcadas).
    setServices(new Set(suggestionsFor(seg).map((s) => s.key)));
  }

  function toggle<T>(set: Set<T>, setter: (s: Set<T>) => void, key: T) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  }

  async function publish() {
    setError(null);
    setPublishing(true);
    const res = await finishOnboarding({
      name,
      segment,
      address,
      serviceKeys: [...services],
      days: [...days],
    });
    setPublishing(false);
    if ('error' in res) setError(res.error);
    else setDone(true);
  }

  if (done) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6 py-10 text-on-emerald"
        style={{
          background:
            'radial-gradient(720px 380px at 22% -10%, rgba(47,211,122,.16), transparent 62%), radial-gradient(620px 460px at 85% 112%, rgba(255,90,54,.13), transparent 60%), var(--emerald)',
        }}
      >
        <div className="max-w-[420px] text-center">
          <div className="animate-seal-pop mx-auto mb-5 flex size-[84px] items-center justify-center rounded-full border-2 border-green-bright bg-[rgba(47,211,122,.16)]">
            <Check className="size-9 text-green-bright" strokeWidth={2.4} />
          </div>
          <div className="animate-rise font-serif text-4xl tracking-tight">
            Tudo <em className="text-green-bright">pronto</em>!
          </div>
          <p className="animate-rise mt-3 text-[15px] leading-relaxed text-on-emerald-mut">
            A página de <strong className="text-on-emerald">{name}</strong> já tá no ar e o app já
            mostra seus horários. Compartilha o link e deixa a agenda se preencher.
          </p>
          <div className="animate-rise mt-6">
            <Button variant="coral" size="pill" onClick={() => router.push(nextUrl)}>
              Ir pro painel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex max-w-[600px] flex-col gap-5 px-6 pb-16 pt-9">
        <div className="flex items-center justify-between">
          <span className="text-ink">
            <Logo size="sm" />
          </span>
          <button
            type="button"
            onClick={() => void skipOnboarding(plano)}
            className="text-xs font-semibold text-ink-50 hover:underline"
          >
            Terminar depois
          </button>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-50">
            Passo {step} de 4 · {STEP_LABELS[step - 1]}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-green-bright transition-[width] duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        <div key={step} className="animate-rise">
          {step === 1 && (
            <Step title="Como chama seu" emph="negócio" sub="É assim que você aparece no app e na sua página na web.">
              <Field label="Nome do estabelecimento">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: st.Lima Barber"
                  className={inputCls}
                />
              </Field>
              <Field label="Que tipo de lugar é?">
                <div className="flex flex-wrap gap-2">
                  {SEGMENTS.map((seg) => (
                    <Chip key={seg} selected={segment === seg} onClick={() => selectSegment(seg)}>
                      {seg}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Endereço" hint="opcional">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número e bairro"
                  className={inputCls}
                />
              </Field>
            </Step>
          )}

          {step === 2 && (
            <Step
              title="O que você"
              emph="oferece"
              sub="Já deixamos sugestões prontas - desmarca o que não faz. Dá pra ajustar tudo depois."
            >
              <div className="flex flex-col">
                {suggestions.map((s) => {
                  const on = services.has(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggle(services, setServices, s.key)}
                      className={cn(
                        'flex items-center gap-3 border-t border-dotted border-edge py-3.5 text-left first:border-0',
                        !on && 'opacity-55',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-[22px] flex-none items-center justify-center rounded-full border-2',
                          on ? 'border-green-deep bg-green-deep text-cream' : 'border-edge',
                        )}
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-ink">{s.name}</span>
                        <span className="block text-[11.5px] font-medium text-ink-50">
                          {s.durationMinutes} min
                        </span>
                      </span>
                      <span className="font-serif text-[15px] text-ink">{money(s.priceCents)}</span>
                    </button>
                  );
                })}
                <p className="border-t border-dotted border-edge pt-3.5 text-xs text-ink-50">
                  Você adiciona e ajusta mais em Serviços, quando quiser.
                </p>
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step
              title="Quando dá pra"
              emph="marcar"
              sub="Toca nos dias que você abre. Intervalos finos você ajusta depois em Horários."
            >
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => (
                  <Chip
                    key={d.n}
                    selected={days.has(d.n)}
                    onClick={() => toggle(days, setDays, d.n)}
                    className="w-[52px] justify-center px-0"
                  >
                    {d.label}
                  </Chip>
                ))}
              </div>
              <div className="flex items-center gap-2.5 text-[13px] font-medium text-ink-70">
                Das
                <span className="rounded-full bg-chip px-3 py-2 font-serif text-sm text-green-emph">9h</span>
                às
                <span className="rounded-full bg-chip px-3 py-2 font-serif text-sm text-green-emph">19h</span>
              </div>
              <p className="text-xs text-ink-50">Dia fechado nem aparece pro cliente. Relaxa.</p>
            </Step>
          )}

          {step === 4 && (
            <Step
              title="Sua página, no"
              emph="ar"
              punct=""
              sub="É por esse link (e pelo app) que seus clientes vão marcar."
            >
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-edge bg-cream px-3.5 py-3 font-mono text-[13px] text-ink">
                  {baseUrl.replace(/^https?:\/\//, '')}/{slug}
                </code>
              </div>
              <div className="overflow-hidden rounded-2xl border border-line">
                <div
                  className="px-4 py-4 text-on-emerald"
                  style={{
                    background:
                      'radial-gradient(420px 220px at 20% -10%, rgba(47,211,122,.14), transparent 60%), var(--emerald)',
                  }}
                >
                  <div className="font-serif text-lg">{name || 'Seu negócio'}</div>
                  <div className="mt-0.5 text-[11.5px] text-on-emerald-mut">
                    {[segment, 'agenda aberta'].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-xs text-ink-50">Seus serviços e horários já aparecem aqui.</span>
                  <span className="flex-none rounded-full bg-coral px-3.5 py-2 text-[11.5px] font-semibold text-white">
                    Agendar agora
                  </span>
                </div>
              </div>
              <p className="text-[11.5px] text-ink-50">
                Quem marcar recebe confirmação e lembrete sozinho - você não precisa fazer nada.
              </p>
            </Step>
          )}
        </div>

        {error && <p className="text-sm text-coral-deep">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="whitespace-nowrap rounded-full border border-edge px-4 py-3 text-[13px] font-semibold text-ink-70 hover:bg-cream-2"
            >
              ← Voltar
            </button>
          ) : (
            <div />
          )}
          {step < 4 ? (
            <Button
              variant="coral"
              size="pill"
              disabled={step === 1 && name.trim().length < 2}
              onClick={() => setStep((s) => s + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button variant="coral" size="pill" disabled={publishing} onClick={publish}>
              {publishing ? 'Publicando…' : 'Publicar minha página'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  emph,
  sub,
  punct = '?',
  children,
}: {
  title: string;
  emph: string;
  sub: string;
  punct?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-serif text-[27px] tracking-tight text-ink">
        {title} <em className="text-green-emph">{emph}</em>
        {punct}
      </div>
      <p className="mb-5 mt-1.5 text-[13.5px] text-ink-50">{sub}</p>
      <div className="flex flex-col gap-4 rounded-[18px] border border-line bg-paper p-5 shadow-soft">
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-ink-70">
        {label}
        {hint && <span className="ml-1 font-medium text-ink-30">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}
