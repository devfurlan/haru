import Link from 'next/link';

import { prisma } from '@haru/database';

import { Container } from './container';

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtLimit(n: number | null): string {
  return n === null ? 'ilimitado' : n.toLocaleString('pt-BR');
}

/** Seção de planos da landing - lê o catálogo dinâmico (tabela Plan). */
export async function Pricing() {
  // Resiliente: se o catálogo não puder ser lido (ex.: DB fora no build), a seção
  // simplesmente não renderiza - não derruba o build/landing inteiro.
  let plans;
  try {
    plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
  } catch (err) {
    console.error('[pricing] catálogo indisponível', err);
    return null;
  }

  if (plans.length === 0) return null;

  return (
    <section id="precos" className="py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Planos simples, sem pegadinha
          </h2>
          <p className="text-muted-foreground mt-3">
            Atendimento e agendamento por IA no WhatsApp em todos os planos. Garantia de 30 dias.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const custom = p.priceMonthlyCents <= 0;
            return (
              <div
                key={p.tier}
                className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
                <h3 className="font-serif text-xl font-semibold">{p.name}</h3>
                <div className="mt-2">
                  {custom ? (
                    <p className="text-2xl font-semibold">Sob consulta</p>
                  ) : (
                    <p>
                      <span className="text-3xl font-semibold">{fmtBRL(p.priceMonthlyCents)}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </p>
                  )}
                  {!custom && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      ou {fmtBRL(p.priceAnnualCents)}/ano (~20% off)
                    </p>
                  )}
                </div>

                <ul className="text-muted-foreground mt-6 flex-1 space-y-2 text-sm">
                  <li>🤖 Bot IA no WhatsApp + lembretes</li>
                  <li>📅 {fmtLimit(p.appointmentsPerMonth)} agendamentos/mês</li>
                  <li>💬 {fmtLimit(p.aiMessagesPerMonth)} mensagens de IA/mês</li>
                  <li>{p.onlinePayments ? '✅' : '—'} Pagamentos online</li>
                  <li>{p.team ? `✅ Equipe (${fmtLimit(p.maxStaff)} usuários)` : '— 1 profissional'}</li>
                  <li>{p.webhooks ? '✅' : '—'} Webhooks (Discord/Slack/n8n)</li>
                </ul>

                <Link
                  href="/signup"
                  className="bg-foreground text-background mt-6 rounded-md px-4 py-2 text-center text-sm font-medium hover:opacity-90"
                >
                  {custom ? 'Falar com a gente' : 'Começar'}
                </Link>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
