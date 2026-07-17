import {
  CalendarDays,
  Clock,
  Coins,
  Gift,
  Globe,
  LayoutGrid,
  MessageCircle,
  Repeat,
  Scissors,
  Settings,
  Star,
  Upload,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavGroupId = 'dia' | 'negocio';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: NavGroupId;
  /** Só OWNER vê. */
  adminOnly?: boolean;
  /** Só aparece com o addon "Atendente IA" ativo (o inbound do bot é quem cria as
   * conversas; sem o addon a caixa fica vazia). */
  addonOnly?: boolean;
  /** Aparece na barra inferior do mobile (4 primeiros). */
  mobile?: boolean;
  /** Recebe o badge coral de handoff (contagem de conversas esperando você). */
  badge?: 'handoff';
}

// Rotas mantidas em inglês (decisão do plano); só os rótulos são PT-BR. `/team` e
// `/page` são novas. Configurações e Página pública/Equipe têm gating refinado nas
// fases seguintes; por ora só Configurações é adminOnly (como já era /settings).
export const NAV_ITEMS: NavItem[] = [
  {
    key: 'inicio',
    label: 'Início',
    href: '/dashboard',
    icon: LayoutGrid,
    group: 'dia',
    mobile: true,
  },
  {
    key: 'agenda',
    label: 'Agenda',
    href: '/appointments',
    icon: CalendarDays,
    group: 'dia',
    mobile: true,
  },
  {
    key: 'conversas',
    label: 'Conversas',
    href: '/conversations',
    icon: MessageCircle,
    group: 'dia',
    mobile: true,
    badge: 'handoff',
    addonOnly: true,
  },
  { key: 'clientes', label: 'Clientes', href: '/clients', icon: User, group: 'dia', mobile: true },
  {
    key: 'servicos',
    label: 'Serviços',
    href: '/services',
    icon: Scissors,
    group: 'negocio',
    adminOnly: true,
  },
  {
    key: 'importar',
    label: 'Importar',
    href: '/import',
    icon: Upload,
    group: 'negocio',
    adminOnly: true,
  },
  {
    key: 'fidelidade',
    label: 'Fidelidade',
    href: '/loyalty',
    icon: Gift,
    group: 'negocio',
    adminOnly: true,
  },
  {
    // Avaliações do estabelecimento (todos os planos). adminOnly: responder é ação de dono.
    key: 'avaliacoes',
    label: 'Avaliações',
    href: '/reviews',
    icon: Star,
    group: 'negocio',
    adminOnly: true,
  },
  {
    // Assinatura de serviços DO CLIENTE ao estabelecimento (feature Time+). adminOnly: mostra
    // MRR/receita do dono, então só o dono vê. Página faz o gate de tier com upsell pro Solo.
    key: 'assinaturas',
    label: 'Assinaturas',
    href: '/assinaturas-clientes',
    icon: Repeat,
    group: 'negocio',
    adminOnly: true,
  },
  { key: 'equipe', label: 'Equipe', href: '/team', icon: Users, group: 'negocio', adminOnly: true },
  {
    // Comissões/financeiro por profissional (feature Multi+). adminOnly: mostra o corte da
    // casa e o que pagar. A página faz o gate de feature (hasCommissions) com upsell.
    key: 'comissoes',
    label: 'Comissões',
    href: '/comissoes',
    icon: Coins,
    group: 'negocio',
    adminOnly: true,
  },
  {
    key: 'horarios',
    label: 'Horários',
    href: '/schedule',
    icon: Clock,
    group: 'negocio',
    adminOnly: true,
  },
  {
    key: 'pagina',
    label: 'Página pública',
    href: '/page',
    icon: Globe,
    group: 'negocio',
    adminOnly: true,
  },
  {
    key: 'config',
    label: 'Configurações',
    href: '/settings',
    icon: Settings,
    group: 'negocio',
    adminOnly: true,
  },
];

export const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: 'dia', label: 'Dia a dia' },
  { id: 'negocio', label: 'Seu negócio' },
];

/** Iniciais (até 2) de um nome, em maiúsculas. */
export function initialsOf(name: string | null | undefined, fallback = '?'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + second).toUpperCase() || fallback;
}
