// Cliente da API mobile (/api/mobile/v1/*). Anexa o Bearer token da sessão Supabase
// em cada request. Os tipos espelham o JSON dos route handlers (datas viram string ISO).
import type { AvailableSlot } from '@haru/shared';

import { supabase } from './supabase';

const BASE = process.env.EXPO_PUBLIC_API_URL;
if (!BASE) throw new Error('Falta EXPO_PUBLIC_API_URL no .env');

export type Me = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  pendingPhone: string | null;
  phoneVerified: boolean;
  avatarUrl: string | null;
  document: string | null;
  birthDate: string | null;
  appointmentEmailsEnabled: boolean;
};

export type SupportTurn = { role: 'USER' | 'ASSISTANT'; body: string; createdAt: string };

export type PaymentLite = { status: string; amountCents: number } | null;

// Espelha CustomerAppointmentItem do web, com startsAt serializado como string ISO.
export type AppointmentItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceActive: boolean;
  durationMinutes: number;
  priceCents: number;
  professionalName: string | null;
  startsAt: string;
  whenLabel: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'NO_SHOW';
  seriesId: string | null;
  tenant: { id: string; name: string; slug: string; timezone: string; logoUrl: string | null };
  openWeekdays: number[];
  currentDateStr: string;
  isPast: boolean;
  isActive: boolean;
  payment: PaymentLite;
};

export type AppointmentsData = { upcoming: AppointmentItem[]; past: AppointmentItem[] };

// Estabelecimento no diretório de busca (GET /tenants/search).
export type DiscoverTenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  // Distância em km até o usuário - só quando a busca envia lat/lng e o estabelecimento
  // tem coords cadastradas; null pra quem bate o nome mas não tem GPS.
  distanceKm?: number | null;
};

// Favorito do cliente (GET /favorites). Mesmos campos, com o id do tenant explícito.
export type FavoriteTenant = {
  tenantId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  professionalIds: string[];
};

export type PublicTenant = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logoUrl: string | null;
  publicBookingEnabled: boolean;
  horizonDays: number;
  openWeekdays: number[];
  services: PublicService[];
  professionals: { id: string; name: string | null }[];
};

export type BookingResult = {
  ok: true;
  status: string;
  summary: string;
  appointmentId: string;
  paymentAvailable: boolean;
};

export type PaymentResult =
  | {
      ok: true;
      method: string;
      checkoutUrl: string | null;
      pixQrCode: string | null;
      pixCopyPaste: string | null;
    }
  | { error: string; needsDocument?: boolean };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${BASE}/api/mobile/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const raw = await res.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Erro ${res.status} do servidor.`;
    throw new ApiError(res.status, message);
  }
  // 2xx sem JSON = o servidor da API não está servindo /api/mobile (dev server
  // desatualizado, HTML de 404, etc.). Vira erro claro em vez de quebrar a tela.
  if (body === null) {
    throw new ApiError(res.status, 'O servidor da API não retornou JSON. Ele está no ar e atualizado?');
  }
  return body as T;
}

export const api = {
  me: () => request<Me>('/me'),
  // Atualiza cadastro (nome/CPF/nascimento) e/ou a preferência de e-mails. Envia só os
  // campos presentes; o servidor aplica cada bloco de forma independente.
  updateMe: (input: {
    name?: string;
    document?: string;
    birthDate?: string;
    appointmentEmailsEnabled?: boolean;
  }) => request<{ ok: true }>('/me', { method: 'PATCH', body: JSON.stringify(input) }),
  deleteAccount: () => request<{ ok: true }>('/me', { method: 'DELETE' }),
  // Troca/confirma telefone via OTP por SMS (Twilio Verify), em 2 passos.
  sendPhoneCode: (phone: string) =>
    request<{ ok: true }>('/me/phone/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  changePhone: (phone: string, code: string) =>
    request<{ ok: true }>('/me/phone', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  // Foto de perfil: a imagem já vem reduzida (128px jpeg) em base64. Trocar apaga a antiga.
  uploadAvatar: (dataBase64: string) =>
    request<{ ok: true; avatarUrl: string }>('/me/avatar', {
      method: 'POST',
      body: JSON.stringify({ dataBase64 }),
    }),
  removeAvatar: () => request<{ ok: true }>('/me/avatar', { method: 'DELETE' }),
  appointments: () => request<AppointmentsData>('/appointments'),
  cancel: (id: string) => request<{ ok: true }>(`/appointments/${id}/cancel`, { method: 'POST' }),
  reschedule: (id: string, newStartsAtIso: string) =>
    request<{ ok: true }>(`/appointments/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ newStartsAtIso }),
    }),
  rescheduleSlots: (id: string, serviceId: string, dateStr: string) =>
    request<{ slots: AvailableSlot[] }>(`/appointments/${id}/reschedule-slots`, {
      method: 'POST',
      body: JSON.stringify({ serviceId, dateStr }),
    }),
  rebook: (sourceAppointmentId: string, slotIso: string) =>
    request<{ ok: true; status: string }>('/rebook', {
      method: 'POST',
      body: JSON.stringify({ sourceAppointmentId, slotIso }),
    }),
  rebookSlots: (sourceAppointmentId: string, serviceId: string, dateStr: string) =>
    request<{ slots: AvailableSlot[] }>('/rebook-slots', {
      method: 'POST',
      body: JSON.stringify({ sourceAppointmentId, serviceId, dateStr }),
    }),

  // --- Público (agendar do zero num negócio) + cadastro ---
  signup: (input: {
    email: string;
    password: string;
    name: string;
    phone: string;
    acceptTerms: boolean;
  }) => request<{ ok: true }>('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  // Pós-login com Google: garante o CustomerAccount (a sessão já existe). 409 = e-mail
  // já usado por conta de senha.
  oauthEnsure: () => request<{ ok: true }>('/auth/oauth', { method: 'POST' }),
  tenant: (slug: string) => request<PublicTenant>(`/tenants/${slug}`),
  // Diretório: com lat/lng ordena por proximidade; com q filtra por nome. Combináveis.
  searchTenants: (params: { q?: string; lat?: number; lng?: number }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.lat != null && params.lng != null) {
      sp.set('lat', String(params.lat));
      sp.set('lng', String(params.lng));
    }
    return request<{ results: DiscoverTenant[] }>(`/tenants/search?${sp.toString()}`);
  },

  // --- Favoritos (cross-tenant, por CustomerAccount) ---
  favorites: () => request<{ favorites: FavoriteTenant[] }>('/favorites'),
  addFavorite: (tenantId: string) =>
    request<{ ok: true }>('/favorites', { method: 'POST', body: JSON.stringify({ tenantId }) }),
  removeFavorite: (tenantId: string) =>
    request<{ ok: true }>(`/favorites/${tenantId}`, { method: 'DELETE' }),

  tenantSlots: (slug: string, serviceId: string, dateStr: string, professionalId?: string) =>
    request<{ slots: AvailableSlot[] }>(`/tenants/${slug}/slots`, {
      method: 'POST',
      body: JSON.stringify({ serviceId, dateStr, professionalId }),
    }),
  createBooking: (
    slug: string,
    input: {
      serviceId: string;
      professionalId?: string;
      slotIso: string;
      name: string;
      phone: string;
    },
  ) =>
    request<BookingResult>(`/tenants/${slug}/bookings`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // --- Pagamento (reusa o gateway do web; 200 sempre, inspecionar o retorno) ---
  pay: (slug: string, appointmentId: string, method: 'PIX' | 'CREDIT_CARD', document?: string) =>
    request<PaymentResult>(`/tenants/${slug}/pay`, {
      method: 'POST',
      body: JSON.stringify({ appointmentId, method, document }),
    }),

  // --- Suporte (bot de IA in-app) ---
  getSupport: () => request<{ history: SupportTurn[] }>('/support'),
  sendSupport: (text: string) =>
    request<{ reply: string }>('/support', { method: 'POST', body: JSON.stringify({ text }) }),

  // --- Push ---
  pushRegister: (expoPushToken: string, platform: string) =>
    request<{ ok: true }>('/push/register', {
      method: 'POST',
      body: JSON.stringify({ expoPushToken, platform }),
    }),
  pushUnregister: (expoPushToken: string) =>
    request<{ ok: true }>('/push/unregister', {
      method: 'POST',
      body: JSON.stringify({ expoPushToken }),
    }),
};
