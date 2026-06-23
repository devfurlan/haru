import Link from 'next/link';

import { prisma } from '@haru/database';

export const metadata = {
  title: 'Preços · Demandaê',
  description: 'Planos do Demandaê — agendamento e atendimento por IA no WhatsApp.',
};

// Catálogo dinâmico (tabela Plan): revalida periodicamente em vez de fixar no build.
export const revalidate = 600;

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtLimit(n: number | null): string {
  return n === null ? 'ilimitado' : n.toLocaleString('pt-BR');
}

export default async function PrecosPage() {
  // Resiliente a falha de DB no build: cai num fallback em vez de quebrar a página.
  let plans: Awaited<ReturnType<typeof prisma.plan.findMany>> = [];
  try {
    plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
  } catch (err) {
    console.error('[precos] catálogo indisponível', err);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Planos simples, sem pegadinha
        </h1>
        <p className="text-muted-foreground mt-3">
          Atendimento e agendamento por IA no WhatsApp em todos os planos. Garantia de 30 dias —
          se não curtir, devolvemos o valor.
        </p>
      </div>

      {plans.length === 0 && (
        <div className="mx-auto mt-12 max-w-md text-center">
          <p className="text-muted-foreground">
            Não foi possível carregar os planos agora. Crie sua conta para ver os valores e começar.
          </p>
          <Link
            href="/signup"
            className="bg-foreground text-background mt-6 inline-block rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Criar conta
          </Link>
        </div>
      )}

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const custom = p.priceMonthlyCents <= 0;
          return (
            <div key={p.tier} className="flex flex-col rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="font-serif text-xl font-semibold">{p.name}</h2>
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
                <li>{p.onlinePayments ? '✅' : '—'} Pagamentos online (Pix/cartão)</li>
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
    </section>
  );
}
