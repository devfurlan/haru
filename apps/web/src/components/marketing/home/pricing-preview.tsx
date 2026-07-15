import { brl0, brl2, getActivePlans, type PlanRow } from '../plan-catalog';

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
    <section
      style={{
        background: 'var(--green-tint)',
        borderTop: '1px solid var(--border-soft)',
        borderBottom: '1px solid var(--border-soft)',
        padding: 'clamp(56px,7vw,88px) 0 clamp(48px,6vw,68px)',
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div
          style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto clamp(24px,3vw,32px)' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              marginBottom: '14px',
            }}
          >
            <span
              style={{
                width: '20px',
                height: '2px',
                background: 'var(--coral)',
                borderRadius: '2px',
              }}
            />
            <span
              style={{
                font: '700 11px var(--font-ui)',
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: '#0C7E41',
              }}
            >
              Planos
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(28px,4.6vw,40px)/1.1 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.02em',
              margin: '0 auto 12px',
            }}
          >
            Um preço. <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>Tudo</span> incluso.
          </h2>
          <p
            style={{
              font: '400 16.5px/1.55 var(--font-ui)',
              color: 'var(--ink-70)',
              margin: '0 auto',
              maxWidth: '460px',
            }}
          >
            Agendamentos ilimitados em todos. Sem taxa de setup, sem cobrança por uso.
          </p>
        </div>

        <PricingPreviewClient plans={vm} />

        {/* enterprise */}
        <div
          style={{
            maxWidth: '920px',
            margin: '24px auto 0',
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '18px',
            padding: '20px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px 24px',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ font: '600 15px var(--font-ui)', color: 'var(--ink)' }}>
              Operação maior?
            </div>
            <div
              style={{
                font: '400 13.5px/1.5 var(--font-ui)',
                color: 'var(--ink-70)',
                marginTop: '3px',
              }}
            >
              Rede, franquia ou fluxo próprio - a gente monta um Enterprise sob medida.
            </div>
          </div>
          <a
            href="/precos#enterprise"
            className="hv-bd-emerald"
            style={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--cream)',
              color: 'var(--emerald)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '13px 20px',
              font: '700 14px var(--font-ui)',
            }}
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

        <div style={{ textAlign: 'center', marginTop: '22px' }}>
          <a
            href="/precos"
            className="hv-coral"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              font: '700 15px var(--font-ui)',
              color: 'var(--emerald)',
            }}
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
      </div>
    </section>
  );
}
