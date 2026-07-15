import { brl0, brl2, getActivePlans, type PlanRow } from '../plan-catalog';

// Monta os "view models" da /precos a partir do catálogo (mesma fonte da home).
// Nome, preço, nº de profissionais e cota de lembretes vêm do BD; os demais bullets são
// copy da vitrine (não há coluna pra eles). Enterprise não é card: é banner "sob consulta".

export type CardFeat = { t: string; heading?: boolean };
export type PrecosCard = {
  tier: string;
  name: string;
  subtitle: string;
  featured: boolean;
  monthly: string; // "R$ 69"
  annualMonthly: string; // "R$ 57,50"
  annualTotal: string; // "R$ 690"
  feats: CardFeat[];
};
export type PrecosData = {
  cards: PrecosCard[];
  // linhas dinâmicas da tabela de comparação: [Solo, Time, Multi, Enterprise]
  profCells: string[];
  reminderCells: string[];
};

const SUBTITLE: Record<string, string> = {
  ESSENCIAL: 'Para quem trabalha sozinho',
  PROFISSIONAL: 'Para barbearias e salões com equipe',
  NEGOCIO: 'Para operações maiores',
};

// Templates de features por tier (o `prof` e o `reminders` são injetados do BD nos pontos
// marcados; `heading` vira "Tudo do <plano anterior>, mais:").
type TmplItem = { t?: string; heading?: boolean; reminders?: boolean };
const FEATURE_TMPL: Record<string, TmplItem[]> = {
  ESSENCIAL: [
    { t: 'Agendamentos ilimitados' },
    { t: 'App do cliente + página com a sua marca' },
    { t: 'Painel de gestão completo' },
    { t: 'Programa de fidelidade' },
    { t: 'Lembretes por e-mail e push ilimitados' },
    { reminders: true },
    { t: 'Suporte direto com o fundador' },
  ],
  PROFISSIONAL: [
    { heading: true },
    { t: 'Pagamentos online' },
    { t: 'Clube de assinatura e pacotes' },
    { t: 'Fila de espera' },
    { t: 'Agenda individual por profissional' },
    { reminders: true },
  ],
  NEGOCIO: [
    { heading: true },
    { t: 'Relatórios avançados' },
    { t: 'Comissões por profissional' },
    { t: 'Webhooks e integrações' },
    { reminders: true },
    { t: 'Suporte prioritário' },
  ],
};

function profCard(max: number | null): string {
  if (max == null) return 'Profissionais ilimitados';
  if (max === 1) return '1 profissional';
  return `Até ${max} profissionais`;
}
function profCell(max: number | null): string {
  if (max == null) return 'Ilimitado';
  if (max === 1) return '1';
  return `Até ${max}`;
}
function reminderText(n: number | null): string {
  return n == null ? 'Lembretes por WhatsApp ilimitados' : `${n.toLocaleString('pt-BR')} lembretes por WhatsApp/mês`;
}

function buildCard(plans: PlanRow[], i: number): PrecosCard {
  const p = plans[i];
  const feats: CardFeat[] = [{ t: profCard(p.maxProfessionals) }];
  for (const item of FEATURE_TMPL[p.tier] ?? []) {
    if (item.reminders) feats.push({ t: reminderText(p.whatsappRemindersPerMonth) });
    else if (item.heading) feats.push({ t: `Tudo do ${plans[i - 1]?.name ?? 'plano anterior'}, mais:`, heading: true });
    else feats.push({ t: item.t! });
  }
  return {
    tier: p.tier,
    name: p.name,
    subtitle: SUBTITLE[p.tier] ?? '',
    featured: p.tier === 'PROFISSIONAL',
    monthly: brl0(p.priceMonthlyCents),
    annualMonthly: brl2(p.priceAnnualCents / 12),
    annualTotal: brl0(p.priceAnnualCents),
    feats,
  };
}

export async function getPrecosData(): Promise<PrecosData> {
  const plans = await getActivePlans();
  const cards = plans.map((_, i) => buildCard(plans, i));
  // Colunas da tabela: Solo/Time/Multi do BD + Enterprise "sob medida".
  const profCells = [...plans.map((p) => profCell(p.maxProfessionals)), 'Sob medida'];
  const reminderCells = [
    ...plans.map((p) => (p.whatsappRemindersPerMonth == null ? 'Ilimitado' : p.whatsappRemindersPerMonth.toLocaleString('pt-BR'))),
    'Sob medida',
  ];
  return { cards, profCells, reminderCells };
}
