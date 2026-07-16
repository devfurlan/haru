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

/** Pente: mesmos paths do chip "Salão" da home (home/niches.tsx). */
const COMB = (
  <>
    <path d="M3 9h18V7.5A1.5 1.5 0 0 0 19.5 6H4.5A1.5 1.5 0 0 0 3 7.5z" />
    <path d="M6.5 9v9M10 9v6.5M13.5 9v9M17 9v6.5" />
  </>
);

/** Brilho: mesmos paths do chip "Estética" da home (home/niches.tsx). */
const SPARKLE = (
  <>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
    <path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
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

// ============================================================================

export const SALAO: NicheContent = {
  metaTitle: 'Sistema de agendamento para salão de beleza · Demandaê',
  metaDescription:
    'Agenda online para salão de beleza: sua cliente marca sozinha pelo app ou pela web, cada profissional com sua agenda, pagamento antecipado, pacotes e clube de assinatura. Garantia de 30 dias.',

  eyebrow: 'Para salões de beleza',
  title: (
    <>
      A agenda do seu salão, cheia e <span className="italic text-[#0C7E41]">sem furo</span>.
    </>
  ),
  subtitle:
    'Sua cliente marca sozinha pelo app ou pela web, recebe lembrete e não esquece. Você cuida do atendimento, dos pacotes e da fidelidade num sistema só.',

  painsTitle: (
    <>
      Você abriu o salão pra <span className="text-green-bright italic">atender</span>. Não pra
      caçar horário.
    </>
  ),
  painsSubtitle:
    'Quatro coisas que a gente ouve de todo salão. E o que o Demandaê faz com cada uma.',
  pains: [
    {
      complaint: 'Serviço de química é longo, e um encaixe errado atrasa o dia todo.',
      solution:
        'A agenda respeita a duração real de cada serviço e não deixa marcar uma em cima da outra.',
    },
    {
      complaint: 'Cliente marca coloração e não aparece. Perdi a manhã.',
      solution: 'Lembrete automático e pagamento antecipado reduzem a falta no serviço longo.',
    },
    {
      complaint: 'Tenho vários profissionais, cada um com sua cartela de clientes.',
      solution: 'Cada profissional com agenda e serviços próprios, sem conflito de horário.',
    },
    {
      complaint: 'Vivo puxando cliente sumida no WhatsApp, uma por uma.',
      solution:
        'Lista de clientes inativas e programa de fidelidade trazem de volta no automático.',
    },
  ],

  steps: [
    {
      title: 'Você cadastra',
      body: 'Seus serviços, seus preços e cada profissional do salão. Leva minutos, e a gente ajuda.',
    },
    {
      title: 'A cliente agenda',
      body: 'Sozinha, pelo app ou pela sua página. Escolhe a profissional, o serviço e a hora, sem te perguntar nada.',
    },
    {
      title: 'Você fatura',
      body: 'Recebe no Pix ou no cartão, fideliza e fecha o mês com pacotes e clube de assinatura.',
    },
  ],

  featuresTitle: (
    <>
      O que o salão usa <span className="italic text-[#0C7E41]">todo</span> dia.
    </>
  ),
  features: [
    {
      icon: 'team',
      time: true,
      title: 'Agenda por profissional',
      body: 'Cada profissional com seus serviços e horários. Sem duas marcações na mesma cadeira.',
    },
    {
      icon: 'calendar',
      title: 'Duração certa por serviço',
      body: 'Química leva o tempo que leva. A agenda bloqueia o horário todo e não encaixa em cima.',
    },
    {
      icon: 'card',
      time: true,
      title: 'Pagamento antecipado',
      body: 'Pix ou cartão na hora de marcar. Quem já pagou, falta menos.',
    },
    {
      icon: 'repeat',
      time: true,
      title: 'Pacotes e clube',
      body: 'Pacote de hidratação ou clube mensal. Receita que entra antes do mês começar.',
    },
    {
      icon: 'star',
      title: 'Fidelidade',
      body: 'Carimbo digital a cada atendimento. A cliente volta pra fechar o cartão, sem você lembrar.',
    },
    {
      icon: 'phone',
      title: 'App e página pública',
      body: 'Sua cliente marca em dois toques, vê o histórico e volta sem te chamar.',
    },
  ],

  faqs: [
    {
      q: 'Dá pra bloquear a duração certa de cada serviço?',
      a: 'Dá. Cada serviço tem a própria duração, e a agenda bloqueia o horário todo. Química longa não vira encaixe em cima de outra cliente.',
    },
    {
      q: 'Serve pra salão com uma profissional só?',
      a: 'Serve. É o plano Solo, feito pra quem toca tudo sozinha: agenda, página pública, app da cliente e fidelidade.',
    },
    {
      q: 'Consigo vender pacotes de hidratação ou tratamento?',
      a: 'Consegue. Você monta pacotes e clube de assinatura, e o sistema controla quantas sessões a cliente já usou. Está nos planos Time e Multi.',
    },
    {
      q: 'Minhas clientes vão ver salão concorrente?',
      a: 'Não. O Demandaê não é marketplace: a página é sua, com a sua marca, e ninguém vê a concorrência do lado. Sua base de clientes é sua.',
    },
    {
      q: 'Como divulgo pras minhas clientes?',
      a: 'Você ganha um link único - demandae.com/seusalao - pra colocar na bio do Instagram, no status do WhatsApp e no Google. Quem clica cai direto na sua agenda.',
    },
    {
      q: 'Já uso outra ferramenta. E aí?',
      a: 'A gente te ajuda na migração: serviços, clientes e horários futuros. Você não recomeça do zero.',
    },
  ],

  mock: {
    tenant: 'Salão Ateliê',
    pros: ['Carla', 'Fernanda', 'Juliana'],
    stats: { count: '18', countLabel: 'atendimentos', revenue: 'R$ 2.960', occupancy: '82%' },
    service: {
      name: 'Coloração',
      meta: '2h · R$ 210 · com qualquer profissional',
      icon: COMB,
    },
    blocks: [
      { pro: 1, row: 1, rowSpan: 2, variant: 'green', title: 'Coloração', who: 'Marina · 2h' },
      { pro: 2, row: 1, variant: 'paper', title: 'Escova', who: 'Bia' },
      { pro: 3, row: 1, variant: 'free' },
      { pro: 3, row: 2, variant: 'paper', title: 'Corte', who: 'Lia' },
      { pro: 2, row: 3, variant: 'live', title: 'Hidratação', who: 'Duda · agora' },
      { pro: 3, row: 3, rowSpan: 2, variant: 'green', title: 'Progressiva', who: 'Sofia · 2h' },
    ],
  },
};

// ============================================================================

export const CLINICA_ESTETICA: NicheContent = {
  metaTitle: 'Sistema de agendamento para clínica de estética · Demandaê',
  metaDescription:
    'Agenda online para clínica de estética: o paciente agenda sozinho, recebe lembrete e mantém o protocolo em dia. Controle de pacotes, sessões, retornos e histórico num painel só. Garantia de 30 dias.',

  eyebrow: 'Para clínicas de estética',
  title: (
    <>
      A agenda da sua clínica, com <span className="italic text-[#0C7E41]">controle</span> de
      retorno e pacote.
    </>
  ),
  subtitle:
    'Seu paciente agenda sozinho, recebe lembrete e mantém o protocolo em dia. Você acompanha sessões, retornos e histórico num painel só.',

  painsTitle: (
    <>
      Você estudou pra <span className="text-green-bright italic">cuidar</span> da pele. Não pra
      virar recepcionista.
    </>
  ),
  painsSubtitle:
    'Quatro coisas que a gente ouve de toda clínica. E o que o Demandaê faz com cada uma.',
  pains: [
    {
      complaint: 'Protocolo é em várias sessões, e o paciente some no meio.',
      solution: 'Controle de pacotes e sessões restantes, com lembrete automático de retorno.',
    },
    {
      complaint: 'Perco a conta de quem já fez o quê.',
      solution: 'Histórico completo de cada paciente, sessão por sessão.',
    },
    {
      complaint: 'Falta em procedimento agendado é prejuízo grande.',
      solution:
        'Confirmação e lembrete em camadas (WhatsApp, e-mail e push) e pagamento antecipado.',
    },
    {
      complaint: 'Minha recepção passa o dia remarcando no telefone.',
      solution: 'O paciente remarca sozinho pelo app ou pela web, sem ocupar a recepção.',
    },
  ],

  steps: [
    {
      title: 'Você cadastra',
      body: 'Seus procedimentos, seus horários e quem atende na clínica. Leva minutos, e a gente ajuda.',
    },
    {
      title: 'O paciente agenda',
      body: 'Sozinho, pelo app ou pela sua página. Escolhe a sessão e a hora, e recebe o lembrete antes.',
    },
    {
      title: 'Você acompanha',
      body: 'Controla os pacotes, vê quantas sessões faltam e mantém o retorno de cada paciente em dia.',
    },
  ],

  featuresTitle: (
    <>
      O que a clínica usa <span className="italic text-[#0C7E41]">todo</span> dia.
    </>
  ),
  features: [
    {
      icon: 'repeat',
      time: true,
      title: 'Pacotes e sessões',
      body: 'O paciente contrata um protocolo e o sistema conta quantas sessões faltam, pra você e pra ele.',
    },
    {
      icon: 'file',
      title: 'Ficha do paciente',
      body: 'Histórico de sessões e evolução, sessão por sessão, no lugar da planilha que some.',
    },
    {
      icon: 'bell',
      title: 'Lembrete em camadas',
      body: 'WhatsApp, e-mail e push antes da sessão. O paciente não perde o retorno.',
    },
    {
      icon: 'card',
      time: true,
      title: 'Pagamento antecipado',
      body: 'Pix ou cartão na hora de marcar. Falta em procedimento cai.',
    },
    {
      icon: 'calendar',
      title: 'Retorno marcado',
      body: 'Deixe o próximo retorno agendado desde a primeira sessão, sem depender da memória.',
    },
    {
      icon: 'phone',
      title: 'App e página pública',
      body: 'O paciente agenda e remarca sozinho, sem ocupar a recepção.',
    },
  ],

  faqs: [
    {
      q: 'Dá pra controlar pacote de sessões e quantas faltam?',
      a: 'Dá. O paciente contrata o protocolo, e o sistema desconta cada sessão agendada e mostra quantas sobraram, pra você e pra ele. Está nos planos Time e Multi.',
    },
    {
      q: 'Consigo registrar histórico e evolução do paciente?',
      a: 'Cada paciente tem ficha com o histórico de sessões e o que já foi feito, sessão por sessão, no lugar da planilha que some.',
    },
    {
      q: 'Serve pra clínica com uma profissional só?',
      a: 'Serve. É o plano Solo, feito pra quem atende sozinha: agenda, página pública, app do paciente e fidelidade.',
    },
    {
      q: 'O paciente precisa baixar app?',
      a: 'Não. O app existe pra quem prefere, mas qualquer paciente agenda pela sua página web, direto do navegador, sem instalar nada.',
    },
    {
      q: 'Como divulgo pros meus pacientes?',
      a: 'Você ganha um link único - demandae.com/suaclinica - pra colocar na bio do Instagram, no status do WhatsApp e no Google. Quem clica cai direto na sua agenda.',
    },
    {
      q: 'Já uso outra ferramenta. E aí?',
      a: 'A gente te ajuda na migração: procedimentos, pacientes e horários futuros. Você não recomeça do zero.',
    },
  ],

  mock: {
    tenant: 'Clínica Lumina',
    pros: ['Dra. Marina', 'Dra. Helena', 'Paulo'],
    stats: { count: '14', countLabel: 'sessões', revenue: 'R$ 2.380', occupancy: '80%' },
    // meta curto: "Sessão de protocolo" já ocupa 2 linhas no card do telefone (mesma
    // razão da podologia) - meta de 2 linhas deixaria o card fora de paridade.
    service: { name: 'Sessão de protocolo', meta: '1h · R$ 180', icon: STETHOSCOPE },
    blocks: [
      { pro: 1, row: 1, rowSpan: 2, variant: 'green', title: 'Protocolo', who: 'Marcos · 1h' },
      { pro: 2, row: 1, variant: 'paper', title: 'Avaliação', who: 'Bia' },
      { pro: 3, row: 1, variant: 'free' },
      { pro: 3, row: 2, variant: 'paper', title: 'Limpeza', who: 'Lia' },
      { pro: 2, row: 3, variant: 'live', title: 'Drenagem', who: 'Sônia · agora' },
      { pro: 3, row: 3, rowSpan: 2, variant: 'green', title: 'Retorno', who: 'Ivo · 40min' },
    ],
  },
};

// ============================================================================

export const ESTETICA: NicheContent = {
  metaTitle: 'Sistema de agendamento para estética e spa · Demandaê',
  metaDescription:
    'Agenda online para espaço de estética e spa: seu cliente marca sozinho pelo app ou pela web, recebe lembrete e volta sempre. Agendamento recorrente, pacotes e clube de assinatura num sistema só. Garantia de 30 dias.',

  eyebrow: 'Para profissionais de estética',
  title: (
    <>
      A agenda do seu espaço de estética,{' '}
      <span className="italic text-[#0C7E41]">no automático</span>.
    </>
  ),
  subtitle:
    'Seu cliente marca sozinho, recebe lembrete e volta sempre. Você cuida do atendimento, dos pacotes e da recorrência num sistema só.',

  painsTitle: (
    <>
      Você abriu o espaço pra <span className="text-green-bright italic">atender</span>. Não pra
      lembrar cliente na mão.
    </>
  ),
  painsSubtitle:
    'Quatro coisas que a gente ouve de todo espaço de estética. E o que o Demandaê faz com cada uma.',
  pains: [
    {
      complaint: 'Meus atendimentos são recorrentes, mas fico lembrando cada cliente na mão.',
      solution: 'Agendamento recorrente e lembrete automático. O cliente volta sem você puxar.',
    },
    {
      complaint: 'Vendo pacote de sessões e controlo no caderno.',
      solution: 'Pacotes e clube de assinatura na plataforma, com controle do que já foi usado.',
    },
    {
      complaint: 'Furo de horário me custa caro num dia cheio.',
      solution: 'Lembrete em camadas e pagamento antecipado reduzem a falta.',
    },
    {
      complaint: 'Atendo em vários serviços e me perco na agenda.',
      solution: 'Agenda organizada por serviço e profissional, com a duração certa de cada um.',
    },
  ],

  steps: [
    {
      title: 'Você cadastra',
      body: 'Seus atendimentos, seus preços e quem atende no espaço. Leva minutos, e a gente ajuda.',
    },
    {
      title: 'O cliente agenda',
      body: 'Sozinho, pelo app ou pela sua página. Escolhe o serviço e a hora, e recebe o lembrete antes.',
    },
    {
      title: 'Você fatura',
      body: 'Recebe no Pix ou no cartão, controla os pacotes e fecha o mês com o clube de assinatura.',
    },
  ],

  featuresTitle: (
    <>
      O que o espaço usa <span className="italic text-[#0C7E41]">todo</span> dia.
    </>
  ),
  features: [
    {
      icon: 'repeat',
      time: true,
      title: 'Pacotes e clube',
      body: 'Pacote de sessões ou clube mensal, com controle do que o cliente já usou.',
    },
    {
      icon: 'calendar',
      title: 'Agendamento recorrente',
      body: 'Horário fixo toda semana, quinzena ou mês. O cliente volta sem você puxar.',
    },
    {
      icon: 'bell',
      title: 'Lembrete automático',
      body: 'WhatsApp, e-mail e push antes do atendimento. Menos furo, agenda cheia.',
    },
    {
      icon: 'card',
      time: true,
      title: 'Pagamento antecipado',
      body: 'Pix ou cartão na hora de marcar. Quem já pagou, falta menos.',
    },
    {
      icon: 'team',
      time: true,
      title: 'Agenda por profissional',
      body: 'Cada profissional com seus serviços e horários, com a duração certa de cada um.',
    },
    {
      icon: 'phone',
      title: 'App e página pública',
      body: 'Seu cliente marca em dois toques, vê o histórico e volta sem te chamar.',
    },
  ],

  faqs: [
    {
      q: 'Dá pra montar pacote de sessões?',
      a: 'Dá. Você monta pacotes e clube de assinatura, e o sistema controla o que a cliente já usou. Está nos planos Time e Multi.',
    },
    {
      q: 'Serve pra quem atende sozinho?',
      a: 'Serve. É o plano Solo, feito pra quem toca o espaço sozinho: agenda, página pública, app do cliente e fidelidade.',
    },
    {
      q: 'Consigo agendamento recorrente pro mesmo cliente?',
      a: 'Consegue. Você deixa o horário fixo semanal, quinzenal ou mensal, e o cliente volta sem você puxar um por um.',
    },
    {
      q: 'Meus clientes vão ver espaço concorrente?',
      a: 'Não. O Demandaê não é marketplace: a página é sua, com a sua marca, e ninguém vê a concorrência do lado. Sua base de clientes é sua.',
    },
    {
      q: 'Como divulgo pros meus clientes?',
      a: 'Você ganha um link único - demandae.com/seuespaco - pra colocar na bio do Instagram, no status do WhatsApp e no Google. Quem clica cai direto na sua agenda.',
    },
    {
      q: 'Já uso outra ferramenta. E aí?',
      a: 'A gente te ajuda na migração: serviços, clientes e horários futuros. Você não recomeça do zero.',
    },
  ],

  mock: {
    tenant: 'Espaço Aura',
    pros: ['Bia', 'Renata', 'Camila'],
    stats: { count: '16', countLabel: 'atendimentos', revenue: 'R$ 2.140', occupancy: '84%' },
    // meta curto: "Massagem relaxante" ocupa 2 linhas no card do telefone (mesma razão
    // da podologia) - meta de 2 linhas deixaria o card fora de paridade.
    service: { name: 'Massagem relaxante', meta: '1h · R$ 130', icon: SPARKLE },
    blocks: [
      { pro: 1, row: 1, rowSpan: 2, variant: 'green', title: 'Massagem', who: 'Marina · 1h' },
      { pro: 2, row: 1, variant: 'paper', title: 'Sobrancelha', who: 'Duda' },
      { pro: 3, row: 1, variant: 'free' },
      { pro: 3, row: 2, variant: 'paper', title: 'Limpeza', who: 'Lia' },
      { pro: 2, row: 3, variant: 'live', title: 'Depilação', who: 'Sofia · agora' },
      { pro: 3, row: 3, rowSpan: 2, variant: 'green', title: 'Drenagem', who: 'Ivo · 50min' },
    ],
  },
};
