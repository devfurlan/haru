import {
  Accessibility,
  Baby,
  Car,
  Coffee,
  CreditCard,
  Wifi,
  Wind,
  type LucideIcon,
} from 'lucide-react';

// Comodidades da vitrine. As chaves batem com Tenant.amenities (validadas em
// (dashboard)/settings/actions.ts) e a ordem define como os selos aparecem.
// Fonte única - consumida pelo editor do painel e pela página pública /[slug].
export const AMENITIES: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'estacionamento', label: 'Estacionamento', Icon: Car },
  { key: 'wifi', label: 'Wi-Fi', Icon: Wifi },
  { key: 'acessivel', label: 'Acessível', Icon: Accessibility },
  { key: 'pix_cartao', label: 'Pix e cartão', Icon: CreditCard },
  { key: 'ar', label: 'Ar-condicionado', Icon: Wind },
  { key: 'cafe', label: 'Café na espera', Icon: Coffee },
  { key: 'kids', label: 'Espaço kids', Icon: Baby },
];
