import { isoDateInTz } from '@haru/shared';

import { isVisit, type ApptStatus } from '../lapsed-clients';

import type { ChannelPayload } from './prefer-own-channels';

/**
 * Núcleo PURO do lembrete de retorno (sem IO, testável com tsx). Decide, por serviço,
 * se um cliente está chegando na hora de voltar - e monta a copy dos 3 canais.
 *
 * Ciclo HÍBRIDO por (cliente + serviço): mediana dos intervalos reais entre visitas
 * (robusta a outlier) quando há histórico; senão o returnCycleDays do serviço (fallback
 * do dono); sem nenhum dos dois, não cutuca. A janela ("faltam ~leadDays") é matemática
 * de instantes UTC -> tz-safe por construção; o fuso do tenant só entra pra colapsar
 * visitas do mesmo dia e no texto. hasFuture/opt-out/min-gap/escolha-de-1 ficam no caller.
 */

const DAY_MS = 86_400_000;
// Precisa de >=2 DIAS-de-visita distintos pra existir um intervalo (mediana).
const MIN_VISIT_DAYS = 2;

// --- Knobs (fonte única; dispatcher e teste importam daqui) ------------------
/** Dispara quando faltam <= LEAD_DAYS pra data prevista (ou pouco depois, até a cerca). */
export const LEAD_DAYS = 3;
/** Fronteira com o win-back reativo: goneDays < LAPSE_DAYS = turf do retorno; >= = sumido.
 *  Mesmo valor do card de "clientes sumidos" (dashboard/page.tsx) - não sobrepõem. */
export const LAPSE_DAYS = 60;
/** Anti-spam POR CONTATO: não manda 2 lembretes de retorno dentro dessa janela. */
export const MIN_GAP_DAYS = 14;
/** Janela e teto de horários concretos ofertados. */
export const SLOT_HORIZON_DAYS = 10;
export const SLOT_LIMIT = 3;
/** Janela de atribuição de conversão (agendou até N dias após o lembrete). */
export const ATTRIBUTION_DAYS = 10;

export interface ReturnApptInput {
  serviceId: string;
  startsAt: Date;
  status: ApptStatus;
  priceCents: number;
}

export interface ReturnParams {
  leadDays: number;
  lapseDays: number;
  tz: string;
}

export interface ReturnCandidate {
  serviceId: string;
  cycleDays: number;
  /** = startsAt da última visita do serviço; chave de dedup por ciclo. */
  cycleAnchor: Date;
  predictedNext: Date;
  daysUntil: number;
  priceCents: number;
  source: 'median' | 'config';
}

/** Mediana dos gaps consecutivos entre DIAS-de-visita já colapsados. N dias -> N-1 gaps. */
function cycleFromHistory(visitDayNums: number[]): number | null {
  if (visitDayNums.length < MIN_VISIT_DAYS) return null;
  const gaps: number[] = [];
  for (let i = 1; i < visitDayNums.length; i++) gaps.push(visitDayNums[i] - visitDayNums[i - 1]);
  gaps.sort((a, b) => a - b);
  const mid = gaps.length >> 1;
  const med = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return med >= 1 ? Math.round(med) : null; // ponytail: guarda contra colapso residual
}

/**
 * Candidatos de UM contato, por serviço. O caller aplica hasFuture, opt-out, min-gap e
 * escolhe 1 serviço (o mais urgente). Só entra serviço com ciclo estimável, dentro da
 * janela de disparo e antes de virar lapsed.
 */
export function returnCandidates(
  appts: ReturnApptInput[],
  cycleCfg: Map<string, number | null>, // serviceId -> Service.returnCycleDays
  now: Date,
  p: ReturnParams,
): ReturnCandidate[] {
  const nowMs = now.getTime();
  const dayset = new Map<string, Set<string>>(); // serviceId -> {YYYY-MM-DD local}
  const lastMs = new Map<string, number>();
  const price = new Map<string, number>();

  for (const a of appts) {
    if (!isVisit(a, nowMs)) continue; // reuso exato da regra do win-back
    let days = dayset.get(a.serviceId);
    if (!days) dayset.set(a.serviceId, (days = new Set()));
    days.add(isoDateInTz(a.startsAt, p.tz)); // tz só aqui: colapsa mesmo dia local
    lastMs.set(a.serviceId, Math.max(lastMs.get(a.serviceId) ?? 0, a.startsAt.getTime()));
    price.set(a.serviceId, a.priceCents);
  }

  const out: ReturnCandidate[] = [];
  for (const [serviceId, days] of dayset) {
    const dayNums = [...days].sort().map((d) => Date.parse(`${d}T00:00:00Z`) / DAY_MS);
    const median = cycleFromHistory(dayNums);
    const cfg = cycleCfg.get(serviceId) ?? null;
    // returnCycleDays=0/negativo = não-setado (0 dispararia pra sempre).
    const cycleDays = median ?? (cfg && cfg > 0 ? cfg : null);
    if (cycleDays == null) continue; // sem dado -> não cutuca

    const last = lastMs.get(serviceId)!;
    const goneDays = Math.floor((nowMs - last) / DAY_MS);
    if (goneDays >= p.lapseDays) continue; // virou lapsed: turf do win-back

    const predictedNext = new Date(last + cycleDays * DAY_MS);
    const daysUntil = Math.floor((predictedNext.getTime() - nowMs) / DAY_MS);
    if (daysUntil > p.leadDays) continue; // cedo demais

    out.push({
      serviceId,
      cycleDays,
      cycleAnchor: new Date(last),
      predictedNext,
      daysUntil,
      priceCents: price.get(serviceId)!,
      source: median != null ? 'median' : 'config',
    });
  }
  return out;
}

/**
 * Copy PT-BR casual, tom de reencontro (nunca cobrança). Um branch `hasSlots` alimenta os
 * 3 canais: push/email carregam os horários concretos (canais próprios, sem custo de
 * template); o WhatsApp é sempre GENÉRICO (nome + serviço + link) - o link já leva à
 * página com os horários reais, evitando um 2º template Meta.
 */
export function returnReminderCopy(a: {
  name: string;
  tenantName: string;
  serviceName: string;
  professionalName: string | null;
  slots: string[]; // rótulos prontos ("Qui 15h"), até SLOT_LIMIT
  link: string;
  /** Destino absoluto do "não quero mais esses lembretes" (rodapé do email). */
  unsubscribeUrl: string;
  pushData: Record<string, unknown>;
  whatsappTemplate: string | undefined;
}): ChannelPayload {
  const has = a.slots.length > 0;
  const withPro = a.professionalName ? ` com ${a.professionalName}` : '';
  const top = a.slots.slice(0, SLOT_LIMIT);
  const lead = has
    ? `Faz um tempinho desde seu último ${a.serviceName}${withPro} em <strong>${a.tenantName}</strong>. Separei uns horários que abriram:<br><br><strong>${top.join('<br>')}</strong><br><br>Bora marcar o próximo?`
    : `Faz um tempinho desde seu último ${a.serviceName}${withPro} em <strong>${a.tenantName}</strong>. Que tal já deixar o próximo marcado?`;
  // Rodapé de descadastro: protege a reputação do domínio (email é o canal em que apostamos).
  const unsub = `<br><br><span style="font-size:12px;color:#9ca3af">Não quer mais esses lembretes? <a href="${a.unsubscribeUrl}" style="color:#9ca3af">Desativar aqui</a>.</span>`;

  return {
    push: {
      title: has ? `Bora marcar seu ${a.serviceName}?` : `Tá na hora do seu ${a.serviceName}?`,
      body: has
        ? `${top.join(' · ')}${withPro} em ${a.tenantName}. Toca pra marcar.`
        : `Faz um tempinho${withPro}. Bora remarcar em ${a.tenantName}?`,
      data: a.pushData,
    },
    email: {
      subject: has
        ? `Uns horários pro seu ${a.serviceName} em ${a.tenantName}`
        : `Bora marcar seu ${a.serviceName}?`,
      body: lead + unsub,
      cta: 'Escolher horário',
      link: a.link,
    },
    whatsapp: {
      template: a.whatsappTemplate,
      params: [a.name, a.serviceName, a.link],
    },
  };
}
