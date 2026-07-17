// Papéis e permissões do PAINEL DO DONO. Puro (sem DB/server-only) - importável no client (nav)
// e no servidor (guards em auth.ts, escopo nas páginas/actions).
//
// Os 3 papéis já existem como dado, sem enum novo:
//   OWNER (role=OWNER) = Dono          -> tudo
//   PROFESSIONAL (STAFF + isProfessional) = Profissional -> só a PRÓPRIA agenda; sem dinheiro/config
//   SUPPORT (STAFF + !isProfessional)  = Apoio/Recepção   -> agenda de TODOS; sem dinheiro/config
//
// `isProfessional` é uma CAPACIDADE (tem agenda / aparece no booking), ortogonal ao papel - o
// dono normalmente também é profissional. Por isso o papel de permissão é derivado, não um enum.

import type { UserRole } from '@haru/database';

export type PanelRole = 'OWNER' | 'PROFESSIONAL' | 'SUPPORT';

export function panelRole(u: { role: UserRole; isProfessional: boolean }): PanelRole {
  if (u.role === 'OWNER') return 'OWNER';
  return u.isProfessional ? 'PROFESSIONAL' : 'SUPPORT';
}

/** Dinheiro (faturamento, comissões, MRR, receita por cliente) só o dono vê. */
export function canSeeMoney(role: PanelRole): boolean {
  return role === 'OWNER';
}

/** Configuração do negócio (serviços, horários, fidelidade, página, equipe, integrações,
 *  responder avaliações, importar) só o dono mexe. */
export function canManageShop(role: PanelRole): boolean {
  return role === 'OWNER';
}

/** Alcance da agenda/clientes: o profissional vê só os PRÓPRIOS; dono e apoio veem todos. */
export function dataScope(role: PanelRole): 'all' | 'own' {
  return role === 'PROFESSIONAL' ? 'own' : 'all';
}

/** Rótulo PT-BR do papel (badges/UI). */
export const PANEL_ROLE_LABEL: Record<PanelRole, string> = {
  OWNER: 'Dono',
  PROFESSIONAL: 'Profissional',
  SUPPORT: 'Apoio',
};

/** Onde cada papel abre o painel (a equipe não tem a home cheia de dinheiro por padrão, mas
 *  vê um Início reduzido - então todos caem em /dashboard; só o CONTEÚDO muda). */
export function landingPath(): string {
  return '/dashboard';
}
