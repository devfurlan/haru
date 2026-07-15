import { brl0, brl2, getActivePlans, type PlanRow } from '../plan-catalog';

import { Guarantees } from './guarantees';
import { PricingPreviewClient, type PlanVM } from './pricing-preview-client';

// Preços da vitrine lidos do catálogo dinâmico (tabela Plan, mesma fonte da /precos).
// Renomear/repreçar no admin reflete aqui na hora (a rota é force-dynamic). O toggle
// mensal/anual e os cards ficam no client (`PricingPreviewClient`); nome, preço, nº de
// profissionais e cota de lembretes/WhatsApp vêm do BD. Os demais bullets (Fidelidade,
// Clube de assinatura, etc.) são copy da vitrine, não colunas do catálogo, então ficam fixos.

const SUBTITLE: Record<string, string> = {
  ESSENCIAL: 'Pra quem toca tudo sozinho',
  PROFISSIONAL: 'Pra equipe no mesmo endereço',
  NEGOCIO: 'Pra operação maior',
};

// Bullets de marca por plano (copy da vitrine, NÃO são colunas do catálogo). O nº de
// profissionais e a cota de lembretes vêm do BD (derivados em buildVM); o resto é editorial.
const FEATURES: Record<string, string[]> = {
  ESSENCIAL: ['Agenda + painel', 'Página pública', 'App do cliente', 'Fidelidade'],
  PROFISSIONAL: ['Pagamento online', 'Clube de assinatura', 'Fila de espera'],
  NEGOCIO: ['Relatórios avançados', 'Comissões', 'Webhooks'],
};

function profLabel(plans: PlanRow[], i: number): string {
  const cur = plans[i].maxProfessionals;
  if (cur == null) return 'Profissionais ilimitados';
  const lower = i === 0 ? 1 : (plans[i - 1].maxProfessionals ?? 0) + 1;
  if (lower >= cur) return `${cur} profissional${cur > 1 ? 'is' : ''}`;
  return `${lower} a ${cur} profissionais`;
}

function lembretes(n: number | null): string {
  return n == null
    ? 'Lembretes ilimitados no WhatsApp'
    : `${n.toLocaleString('pt-BR')} lembretes WhatsApp/mês`;
}

function buildVM(plans: PlanRow[]): PlanVM[] {
  return plans.map((p, i) => {
    const custom = p.priceMonthlyCents <= 0;
    const feats: PlanVM['feats'] = [{ text: profLabel(plans, i) }];
    if (i > 0) feats.push({ text: `Tudo do ${plans[i - 1].name}, mais:`, strong: true });
    for (const t of FEATURES[p.tier] ?? []) feats.push({ text: t });
    feats.push({ text: lembretes(p.whatsappRemindersPerMonth) });

    return {
      tier: p.tier,
      name: p.name,
      subtitle: SUBTITLE[p.tier] ?? '',
      featured: p.tier === 'PROFISSIONAL',
      custom,
      monthly: custom ? 'Sob consulta' : brl0(p.priceMonthlyCents),
      annualMonthly: brl2(p.priceAnnualCents / 12),
      annualTotal: brl0(p.priceAnnualCents),
      feats,
    };
  });
}

export async function PricingPreview() {
  const vm = buildVM(await getActivePlans());

  return (
    <section className="border-t-line border-b-line bg-chip border-b border-t pb-[clamp(48px,6vw,68px)] pt-[clamp(56px,7vw,88px)]">
      <div className="mx-auto max-w-[1120px] px-[clamp(16px,4vw,40px)]">
        <div className="mx-auto mb-[clamp(24px,3vw,32px)] max-w-[640px] text-center">
          <div className="mb-[14px] inline-flex items-center gap-[9px]">
            <span className="bg-coral h-[2px] w-[20px] rounded-[2px]" />
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              Planos
            </span>
          </div>
          <h2 className="text-green-deep mx-auto mb-[12px] font-serif text-[clamp(28px,4.6vw,40px)] font-normal leading-[1.1] tracking-[-.02em]">
            Um preço. <span className="italic text-[#0C7E41]">Tudo</span> incluso.
          </h2>
          <p className="text-ink-70 mx-auto max-w-[460px] font-sans text-[16.5px] font-normal leading-[1.55]">
            Agendamentos ilimitados em todos. Sem taxa de setup, sem cobrança por uso.
          </p>
        </div>

        <PricingPreviewClient plans={vm} />

        {/* enterprise */}
        {/* Os `!` nos <a> abaixo não são estilo: `.dmd-home a { color: inherit }` e os
            `.dmd-home .hv-*:hover` vivem FORA de @layer no globals.css, e regra sem layer
            vence @layer utilities. Sem o `!`, text-green-deep/border-edge são descartados e
            o link cai pro ink. O style inline original ganhava desses seletores por ser inline. */}
        <div className="border-line bg-paper mx-auto mt-[24px] flex max-w-[920px] flex-wrap items-center gap-x-[24px] gap-y-[16px] rounded-[18px] border px-[22px] py-[20px] shadow-[var(--shadow-card)]">
          <div className="min-w-[220px] flex-1">
            <div className="text-ink font-sans text-[15px] font-semibold leading-[normal]">
              Operação maior?
            </div>
            <div className="text-ink-70 mt-[3px] font-sans text-[13.5px] font-normal leading-[1.5]">
              Rede, franquia ou fluxo próprio - a gente monta um Enterprise sob medida.
            </div>
          </div>
          <a
            href="/precos#enterprise"
            className="hv-bd-emerald border-edge! bg-cream text-green-deep! inline-flex flex-none items-center gap-[8px] rounded-[14px] border px-[20px] py-[13px] font-sans text-[14px] font-bold leading-[normal]"
          >
            Falar com a gente{' '}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </a>
        </div>

        <div className="mt-[22px] text-center">
          <a
            href="/precos"
            className="hv-coral text-green-deep! inline-flex items-center gap-[8px] font-sans text-[15px] font-bold leading-[normal]"
          >
            Ver todos os planos e o comparativo completo{' '}
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </a>
        </div>

        {/* Garantias fecham a seção de preços: são gancho de conversão, não seção própria. */}
        <Guarantees />
      </div>
    </section>
  );
}
