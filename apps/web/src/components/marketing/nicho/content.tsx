import type { ReactNode } from 'react';

import type { HeroContent } from '../home/hero';

/* Conteúdo das landings por nicho. O molde (hero, dores, como funciona, recursos, preços,
   prova, FAQ, fecho) é o MESMO pra todo nicho - só muda o que está aqui. Pra abrir um nicho
   novo (salão, estética, tatuagem), copie um destes objetos, troque a carne e crie a rota
   com `<NicheLanding content={...} />`. Nada de estrutura mora neste arquivo.

   IMPORTANTE: o slug de cada landing nova precisa entrar em RESERVED_SLUGS
   (packages/shared/src/reserved-slugs.ts), senão um tenant pode registrar o mesmo slug e a
   página pública dele fica inalcançável - rota estática ganha da dinâmica `[slug]`. */

export type Pain = { complaint: string; solution: string };
export type Step = { title: string; body: string };
export type Feature = { icon: IconKey; title: string; body: string; time?: boolean };
export type FaqItem = { q: string; a: string };

export type IconKey =
  | 'team'
  | 'card'
  | 'star'
  | 'repeat'
  | 'clock'
  | 'phone'
  | 'bell'
  | 'file'
  | 'check'
  | 'calendar';

/* `eyebrow`, `title`, `subtitle` e `mock` (o mockup do produto no hero: tenant, profissionais,
   stats, serviço e blocos da agenda) vêm de HeroContent - o hero é o mesmo componente da home,
   e o mock do nicho entra no lugar do dela. Mesmo layout em todo nicho, conteúdo coerente. */
export type NicheContent = HeroContent & {
  metaTitle: string;
  metaDescription: string;

  painsTitle: ReactNode;
  painsSubtitle: string;
  pains: Pain[];

  steps: Step[];

  featuresTitle: ReactNode;
  features: Feature[];

  faqs: FaqItem[];
};

// ============================================================================

/** Tesoura: mesmos paths do chip "Barbearia" da home (home/niches.tsx). */
const SCISSORS = (
  <>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </>
);

/** Estetoscópio: mesmos paths do chip "Clínica" da home (home/niches.tsx). */
const STETHOSCOPE = (
  <>
    <path d="M6 3v5a4 4 0 0 0 8 0V3" />
    <path d="M6 3H4.7M14 3h1.3" />
    <path d="M10 12v1.5a4.5 4.5 0 0 0 4.5 4.5 3 3 0 0 0 3-3v-1" />
    <circle cx="18.5" cy="12" r="1.7" />
  </>
);

export const BARBEARIA: NicheContent = {
  metaTitle: 'Sistema de agendamento para barbearia · Demandaê',
  metaDescription:
    'Agenda online para barbearia: seu cliente marca sozinho pelo app ou pela web, cada barbeiro com sua agenda, pagamento antecipado, fidelidade e clube de assinatura. Garantia de 30 dias.',

  eyebrow: 'Para barbearias',
  title: (
    <>
      A agenda da sua barbearia, sem depender de WhatsApp{' '}
      <span className="italic text-[#0C7E41]">o dia todo</span>.
    </>
  ),
  subtitle:
    'Seu cliente marca sozinho pelo app ou pela web. Você cuida dos cortes, não da agenda. Pagamento, fidelidade e clube de assinatura, tudo num sistema só.',

  painsTitle: (
    <>
      Você abriu barbearia pra <span className="text-green-bright italic">cortar</span>. Não pra
      digitar.
    </>
  ),
  painsSubtitle:
    'Quatro coisas que a gente ouve de toda barbearia. E o que o Demandaê faz com cada uma.',
  pains: [
    {
      complaint: 'Passo o dia respondendo "tem horário?" no WhatsApp.',
      solution: 'Seu cliente vê os horários livres e marca sozinho, 24h por dia. Você só corta.',
    },
    {
      complaint: 'Cliente some e não volta.',
      solution:
        'Programa de fidelidade e clube de assinatura trazem o cliente de volta no automático.',
    },
    {
      complaint: 'Barbeiro novo entra, e a agenda vira bagunça.',
      solution: 'Cada barbeiro com sua própria agenda e seus serviços, sem conflito de horário.',
    },
    {
      complaint: 'Furo de horário é prejuízo.',
      solution: 'Pagamento antecipado no Pix ou cartão reduz o não comparecimento.',
    },
  ],

  steps: [
    {
      title: 'Você cadastra',
      body: 'Seus cortes, seus preços e cada barbeiro da equipe. Leva minutos, e a gente ajuda.',
    },
    {
      title: 'O cliente agenda',
      body: 'Sozinho, pelo app ou pela sua página. Escolhe o barbeiro, o serviço e a hora, sem te perguntar nada.',
    },
    {
      title: 'Você fatura',
      body: 'Recebe no Pix ou no cartão, carimba a fidelidade e fecha o mês com o clube de assinatura.',
    },
  ],

  featuresTitle: (
    <>
      O que a barbearia usa <span className="italic text-[#0C7E41]">todo</span> dia.
    </>
  ),
  features: [
    {
      icon: 'team',
      time: true,
      title: 'Agenda por barbeiro',
      body: 'Cada barbeiro com seus serviços e seus horários. Duas cadeiras, duas agendas, sem conflito.',
    },
    {
      icon: 'card',
      time: true,
      title: 'Pagamento antecipado',
      body: 'Pix ou cartão na hora de marcar. Quem já pagou, falta menos.',
    },
    {
      icon: 'star',
      title: 'Fidelidade',
      body: 'Carimbo digital a cada corte. O cliente volta pra fechar o cartão, sem você lembrar.',
    },
    {
      icon: 'repeat',
      time: true,
      title: 'Clube de assinatura',
      body: 'Corte todo mês na assinatura. Receita que entra antes do mês começar.',
    },
    {
      icon: 'clock',
      time: true,
      title: 'Fila de espera',
      body: 'Deu furo? O sistema chama quem está esperando e preenche o horário sozinho.',
    },
    {
      icon: 'phone',
      title: 'App e página pública',
      body: 'Seu cliente marca em dois toques, vê o histórico e volta sem te chamar.',
    },
  ],

  faqs: [
    {
      q: 'Serve pra barbearia com um barbeiro só?',
      a: 'Serve. É o plano Solo, feito pra quem toca tudo sozinho: agenda, página pública, app do cliente e fidelidade.',
    },
    {
      q: 'E se eu tiver 5 barbeiros?',
      a: 'O plano Time cobre até 6 profissionais, cada um com a própria agenda e os próprios serviços. Passou disso, o Multi vai até 15.',
    },
    {
      q: 'Meus clientes vão aparecer pra barbearia concorrente?',
      a: 'Não. O Demandaê não é marketplace: a página é sua, com a sua marca, e ninguém vê a concorrência do lado. Sua base de clientes é sua.',
    },
    {
      q: 'Consigo cobrar antecipado pra evitar furo?',
      a: 'Consegue, a partir do plano Time. O cliente paga no Pix ou no cartão na hora de marcar, e o dinheiro cai na sua conta.',
    },
    {
      q: 'Como divulgo pros meus clientes?',
      a: 'Você ganha um link único - demandae.com/suabarbearia - pra colocar na bio do Instagram, no status do WhatsApp e no Google. Quem clica cai direto na sua agenda.',
    },
    {
      q: 'Já uso outra ferramenta. E aí?',
      a: 'A gente te ajuda na migração: serviços, clientes e horários futuros. Você não recomeça do zero.',
    },
  ],

  mock: {
    tenant: 'Barbearia do Léo',
    pros: ['Léo', 'Bruno', 'Rafa'],
    stats: { count: '24', countLabel: 'atendimentos', revenue: 'R$ 3.240', occupancy: '86%' },
    service: {
      name: 'Corte + barba',
      meta: '45 min · R$ 70 · com qualquer barbeiro',
      icon: SCISSORS,
    },
    blocks: [
      {
        pro: 1,
        row: 1,
        rowSpan: 2,
        variant: 'green',
        title: 'Corte + barba',
        who: 'Marcos · 45min',
      },
      { pro: 2, row: 1, variant: 'paper', title: 'Corte', who: 'João' },
      { pro: 3, row: 1, variant: 'free' },
      { pro: 3, row: 2, variant: 'paper', title: 'Pezinho', who: 'Caio' },
      { pro: 2, row: 3, variant: 'live', title: 'Barba', who: 'Diego · agora' },
      {
        pro: 3,
        row: 3,
        rowSpan: 2,
        variant: 'green',
        title: 'Corte + barba',
        who: 'Tiago · 45min',
      },
    ],
  },
};

// ============================================================================

export const PODOLOGIA: NicheContent = {
  metaTitle: 'Sistema de agendamento para podologia · Demandaê',
  metaDescription:
    'Agenda online para consultório de podologia: o paciente agenda sozinho, recebe lembrete e não esquece a sessão. Histórico, retornos, pacotes de sessão e painel num lugar só. Garantia de 30 dias.',

  eyebrow: 'Para podólogos',
  title: (
    <>
      A agenda do seu consultório de podologia, organizada{' '}
      <span className="italic text-[#0C7E41]">de verdade</span>.
    </>
  ),
  subtitle:
    'Seu paciente agenda sozinho, recebe lembrete e não esquece a sessão. Você acompanha retornos, pacotes e histórico num painel só.',

  painsTitle: (
    <>
      Você estudou pra <span className="text-green-bright italic">cuidar</span> de pé. Não pra caçar
      horário.
    </>
  ),
  painsSubtitle:
    'Quatro coisas que a gente ouve de todo consultório. E o que o Demandaê faz com cada uma.',
  pains: [
    {
      complaint: 'Paciente esquece a sessão e o horário fica vazio.',
      solution: 'Lembrete automático por WhatsApp, e-mail e push. Menos falta, agenda cheia.',
    },
    {
      complaint: 'Perco o controle de quem precisa voltar.',
      solution: 'Histórico de cada paciente e controle de retornos, tudo registrado.',
    },
    {
      complaint: 'Vendo pacotes de sessão no caderno.',
      solution:
        'Pacotes e clube de assinatura direto na plataforma, com controle de quantas sessões restam.',
    },
    {
      complaint: 'Minha agenda é no papel e some.',
      solution: 'Agenda digital que respeita seus horários e evita marcação dupla.',
    },
  ],

  steps: [
    {
      title: 'Você cadastra',
      body: 'Suas sessões, seus horários e quem atende no consultório. Leva minutos, e a gente ajuda.',
    },
    {
      title: 'O paciente agenda',
      body: 'Sozinho, pelo app ou pela sua página. Escolhe a sessão e a hora, e recebe o lembrete antes.',
    },
    {
      title: 'Você fatura',
      body: 'Recebe, controla os pacotes de sessão e acompanha quem ainda precisa voltar.',
    },
  ],

  featuresTitle: (
    <>
      O que o consultório usa <span className="italic text-[#0C7E41]">todo</span> dia.
    </>
  ),
  features: [
    {
      icon: 'bell',
      title: 'Lembrete automático',
      body: 'WhatsApp, e-mail e push antes da sessão. O paciente não esquece.',
    },
    {
      icon: 'file',
      title: 'Ficha do paciente',
      body: 'Histórico de sessões e de retornos, no lugar do caderno que some.',
    },
    {
      icon: 'repeat',
      time: true,
      title: 'Pacotes e clube',
      body: 'O paciente assina um pacote mensal de sessões e o sistema conta quantas restam.',
    },
    {
      icon: 'check',
      title: 'Controle de presença',
      body: 'Você aponta só quem faltou. O resto o sistema fecha sozinho no fim do dia.',
    },
    {
      icon: 'calendar',
      title: 'Agenda sem marcação dupla',
      body: 'Seus horários, seus intervalos e a duração de cada sessão, respeitados.',
    },
    {
      icon: 'phone',
      title: 'App e página pública',
      body: 'O paciente agenda pelo navegador ou pelo app, sem instalar nada se não quiser.',
    },
  ],

  faqs: [
    {
      q: 'Serve pra quem atende sozinho?',
      a: 'Serve. É o plano Solo, feito pra quem toca o consultório sozinho: agenda, página pública, app do paciente e fidelidade.',
    },
    {
      q: 'Dá pra controlar pacotes de sessão?',
      a: 'Dá. O paciente assina um pacote mensal de sessões, e o sistema desconta cada sessão agendada e mostra quantas sobraram - pra você e pra ele. Está nos planos Time e Multi.',
    },
    {
      q: 'O paciente precisa baixar app?',
      a: 'Não. O app existe pra quem prefere, mas qualquer paciente agenda pela sua página web, direto do navegador, sem instalar nada.',
    },
    {
      q: 'Consigo registrar histórico e retornos de cada paciente?',
      a: 'Cada paciente tem ficha com o histórico de sessões e o que já foi feito. Você aponta quem faltou e deixa o retorno marcado desde a primeira sessão.',
    },
    {
      q: 'Como divulgo pros meus pacientes?',
      a: 'Você ganha um link único - demandae.com/seuconsultorio - pra colocar na bio do Instagram, no status do WhatsApp e no Google. Quem clica cai direto na sua agenda.',
    },
    {
      q: 'Já uso outra ferramenta. E aí?',
      a: 'A gente te ajuda na migração: serviços, pacientes e horários futuros. Você não recomeça do zero.',
    },
  ],

  mock: {
    tenant: 'Clínica Passo Certo',
    pros: ['Dra. Marina', 'Dr. Paulo'],
    stats: { count: '12', countLabel: 'sessões', revenue: 'R$ 1.680', occupancy: '78%' },
    // meta curto de propósito: "Sessão de podologia" já ocupa 2 linhas no card do telefone,
    // e um meta de 2 linhas (como o da barbearia) deixaria o card com 4 - fora de paridade.
    service: { name: 'Sessão de podologia', meta: '1h · R$ 140', icon: STETHOSCOPE },
    blocks: [
      { pro: 1, row: 1, rowSpan: 2, variant: 'green', title: 'Sessão', who: 'Marcos · 1h' },
      { pro: 2, row: 1, variant: 'paper', title: 'Avaliação', who: 'Helena' },
      { pro: 2, row: 2, variant: 'free' },
      { pro: 1, row: 3, variant: 'live', title: 'Unha encravada', who: 'Sônia · agora' },
      { pro: 2, row: 3, rowSpan: 2, variant: 'green', title: 'Retorno', who: 'Ivo · 40min' },
    ],
  },
};
