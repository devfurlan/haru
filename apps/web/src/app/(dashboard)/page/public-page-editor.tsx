'use client';

import { Check, Copy, ExternalLink, Instagram, Mail, Phone } from 'lucide-react';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { formatPhoneBR } from '@haru/shared';

import { AMENITIES } from '@/lib/amenities';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Switch } from '@/components/ui/switch';

import { updatePublicBooking, updateTenant } from '../settings/actions';
import { AddressAutocomplete } from './address-autocomplete';
import { CoverUploader } from './cover-uploader';
import { LogoUploader } from './logo-uploader';

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
});
const money = (cents: number) => BRL.format(Math.round(cents / 100));

export interface PublicPageEditorProps {
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  about: string | null;
  segment: string | null;
  email: string | null;
  instagram: string | null;
  phone: string | null;
  logoUrl: string | null;
  covers: string[];
  amenities: string[];
  publicBookingEnabled: boolean;
  publicBookingConfirmation: 'PENDING' | 'CONFIRMED';
  services: { name: string; priceCents: number }[];
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-ink-70 text-xs font-semibold">
        {label}
        {hint && <span className="text-ink-30 ml-1 font-medium">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'rounded-xl border border-edge bg-cream px-3.5 py-3 text-sm text-ink outline-none placeholder:text-ink-30 focus:border-green-deep';

function SaveButton({ label = 'Salvar' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="coral" disabled={pending}>
      {pending ? 'Salvando…' : label}
    </Button>
  );
}

function Saved({ state }: { state: { error: string } | { ok: true } | undefined }) {
  if (!state) return null;
  if ('error' in state) return <p className="text-coral-deep text-sm">{state.error}</p>;
  return <p className="text-green-emph text-sm">Salvo.</p>;
}

export function PublicPageEditor(props: PublicPageEditorProps) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.demandae.com').replace(
    /\/$/,
    '',
  );

  // Estado controlado - alimenta o preview ao vivo E o submit do form.
  const [name, setName] = useState(props.name);
  const [slug, setSlug] = useState(props.slug);
  const [description, setDescription] = useState(props.description ?? '');
  const [about, setAbout] = useState(props.about ?? '');
  const [instagram, setInstagram] = useState(props.instagram ?? '');
  const [email, setEmail] = useState(props.email ?? '');
  const [covers, setCovers] = useState(props.covers);
  const [amenities, setAmenities] = useState<Set<string>>(new Set(props.amenities));
  const [enabled, setEnabled] = useState(props.publicBookingEnabled);
  const [copied, setCopied] = useState(false);

  const [tenantState, saveTenant] = useActionState(updateTenant, undefined);
  const [bookingState, saveBooking] = useActionState(updatePublicBooking, undefined);

  const publicUrl = `${baseUrl}/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível fora de https - ignora */
    }
  }

  function toggleAmenity(key: string) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <h1 className="text-ink font-serif text-[28px] tracking-tight">Página pública</h1>
          <p className="text-ink-50 mt-1 text-sm">
            Sua vitrine na web - o cliente agenda por ela em segundos.
          </p>
        </div>
        <a
          href={`/${props.slug}`}
          target="_blank"
          rel="noopener"
          className="border-edge bg-paper text-ink-70 hover:bg-cream-2 inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-semibold no-underline"
        >
          Ver página pública
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        {/* ── COLUNA DE EDIÇÃO ── */}
        <div className="flex min-w-[340px] flex-1 flex-col gap-3.5">
          {/* Card único: dados + vitrine (tudo salva via updateTenant, que exige name+slug) */}
          <form action={saveTenant} className="flex flex-col gap-3.5">
            <div className="border-line bg-paper shadow-soft flex flex-col gap-3 rounded-2xl border p-[18px]">
              <div className="text-ink font-serif text-base">Endereço da página</div>
              <div className="flex items-center gap-2">
                <code className="border-edge bg-cream text-ink flex-1 truncate rounded-xl border px-3.5 py-2.5 font-mono text-[13px]">
                  {publicUrl}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="border-edge text-ink-70 hover:bg-cream-2 flex-none rounded-xl border px-3 py-2.5 text-xs font-semibold"
                >
                  {copied ? <Check className="size-4" /> : 'Copiar'}
                </button>
              </div>

              <LogoUploader logoUrl={props.logoUrl} />

              <Field label="Nome">
                <input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputCls}
                />
              </Field>

              <Field label="Slug" hint="mudar quebra links antigos">
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  pattern="[a-z0-9-]+"
                  required
                  className={`${inputCls} font-mono`}
                />
              </Field>

              <AddressAutocomplete defaultValue={props.address ?? ''} />

              <Field label="Descrição" hint="uma linha, aparece no topo">
                <input
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={256}
                  placeholder="Ex.: Barbearia especializada em cortes e barba."
                  className={inputCls}
                />
              </Field>

              <Field label="Contatos" hint="aparecem na página e no app">
                <div className="flex flex-wrap gap-2">
                  <div className="border-edge bg-cream flex min-w-[150px] flex-1 items-center gap-2 rounded-xl border pl-3">
                    <Instagram className="text-ink-30 size-4 flex-none" />
                    <input
                      name="instagram"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@seuinsta"
                      className="text-ink placeholder:text-ink-30 min-w-0 flex-1 bg-transparent py-3 pr-3 text-sm outline-none"
                    />
                  </div>
                  <div className="border-edge bg-cream flex min-w-[190px] flex-[1.2] items-center gap-2 rounded-xl border pl-3">
                    <Mail className="text-ink-30 size-4 flex-none" />
                    <input
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contato@seunegocio.com"
                      className="text-ink placeholder:text-ink-30 min-w-0 flex-1 bg-transparent py-3 pr-3 text-sm outline-none"
                    />
                  </div>
                </div>
                {props.phone && (
                  <p className="text-ink-50 text-[11px]">
                    WhatsApp {formatPhoneBR(props.phone)} - gerenciado na conexão do WhatsApp.
                  </p>
                )}
              </Field>
            </div>

            {/* Vitrine */}
            <div className="border-line bg-paper shadow-soft flex flex-col gap-4 rounded-2xl border p-[18px]">
              <div>
                <div className="text-ink font-serif text-base">Capricha na vitrine</div>
                <p className="text-ink-50 mt-0.5 text-xs">
                  Foto, história e mimos - o que faz o cliente escolher você.
                </p>
              </div>

              <CoverUploader covers={covers} onChange={setCovers} />

              <Field label="Sobre nós">
                <textarea
                  name="about"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={4}
                  maxLength={1200}
                  placeholder="Conte a história do seu negócio - o que te diferencia."
                  className={`${inputCls} resize-y leading-relaxed`}
                />
              </Field>

              <Field label="Comodidades" hint="o que tem por aí">
                <input type="hidden" name="amenitiesPresent" value="1" />
                {/* Inputs fora dos chips (form control dentro de <button> é HTML inválido). */}
                {[...amenities].map((key) => (
                  <input key={key} type="hidden" name="amenities" value={key} />
                ))}
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map(({ key, label, Icon }) => (
                    <Chip
                      key={key}
                      type="button"
                      selected={amenities.has(key)}
                      onClick={() => toggleAmenity(key)}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </Chip>
                  ))}
                </div>
              </Field>

              <div className="flex items-center justify-end gap-3">
                <Saved state={tenantState} />
                <SaveButton />
              </div>
            </div>
          </form>

          {/* Agendamento online (form separado - updatePublicBooking, não exige name/slug) */}
          <form
            action={saveBooking}
            className="border-line bg-paper shadow-soft flex flex-col gap-3 rounded-2xl border p-[18px]"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-ink font-serif text-base">Agendamento online</div>
                <p className="text-ink-50 mt-0.5 text-xs">
                  Desligado, a página vira só vitrine com seus contatos.
                </p>
              </div>
              <input type="hidden" name="enabled" value={enabled ? 'on' : 'off'} />
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {enabled && (
              <div className="flex flex-col gap-2">
                {(
                  [
                    [
                      'CONFIRMED',
                      'Confirmados na hora',
                      'O horário já fica reservado assim que o cliente agenda.',
                    ],
                    [
                      'PENDING',
                      'Pendentes - você confirma',
                      'O pedido cai em Pendentes na Agenda pra você aprovar.',
                    ],
                  ] as const
                ).map(([value, title, desc]) => (
                  <label
                    key={value}
                    className="border-edge has-[:checked]:border-green-deep has-[:checked]:bg-chip flex cursor-pointer items-start gap-2.5 rounded-xl border p-3"
                  >
                    <input
                      type="radio"
                      name="confirmation"
                      value={value}
                      defaultChecked={props.publicBookingConfirmation === value}
                      className="accent-green-deep mt-0.5 size-4"
                    />
                    <span>
                      <span className="text-ink block text-[13px] font-semibold">{title}</span>
                      <span className="text-ink-50 block text-[11px]">{desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Saved state={bookingState} />
              <SaveButton />
            </div>
          </form>
        </div>

        {/* ── PREVIEW AO VIVO ── */}
        <PagePreview
          name={name}
          segment={props.segment}
          address={props.address}
          description={description}
          about={about}
          instagram={instagram}
          phone={props.phone}
          logoUrl={props.logoUrl}
          covers={covers}
          amenities={amenities}
          enabled={enabled}
          services={props.services}
        />
      </div>
    </div>
  );
}

function PagePreview({
  name,
  segment,
  address,
  description,
  about,
  instagram,
  phone,
  logoUrl,
  covers,
  amenities,
  enabled,
  services,
}: {
  name: string;
  segment: string | null;
  address: string | null;
  description: string;
  about: string;
  instagram: string;
  phone: string | null;
  logoUrl: string | null;
  covers: string[];
  amenities: Set<string>;
  enabled: boolean;
  services: { name: string; priceCents: number }[];
}) {
  const [idx, setIdx] = useState(0);
  const cover = covers.length ? covers[Math.min(idx, covers.length - 1)] : null;
  const initials = name.trim().slice(0, 2).toUpperCase() || 'D';
  const meta = [segment, address].filter(Boolean).join(' · ');
  const shownAmenities = AMENITIES.filter((a) => amenities.has(a.key));

  return (
    <div className="flex w-[310px] flex-none flex-col gap-2.5">
      <div className="text-ink-50 text-[10.5px] font-bold uppercase tracking-[0.13em]">
        O que o cliente vê
      </div>
      <div className="border-edge bg-cream shadow-soft overflow-hidden rounded-3xl border">
        {/* capa */}
        <div className="bg-cream-2 relative h-[145px]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="text-ink-30 flex h-full items-center justify-center px-6 text-center text-[11px]">
              Sua foto de capa aparece aqui
            </div>
          )}
          {covers.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {covers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Foto ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={`size-[7px] rounded-full ${i === Math.min(idx, covers.length - 1) ? 'bg-paper' : 'bg-paper/50'}`}
                />
              ))}
            </div>
          )}
        </div>
        {/* header esmeralda */}
        <div className="text-on-emerald px-[18px] py-5 [background:radial-gradient(420px_220px_at_20%_-10%,rgba(47,211,122,.14),transparent_60%),var(--emerald)]">
          <div className="text-green-bright mb-2.5 flex size-[46px] items-center justify-center overflow-hidden rounded-xl bg-[rgba(47,211,122,.16)] font-serif text-base">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="font-serif text-xl">{name || 'Seu negócio'}</div>
          {meta && <div className="text-on-emerald-mut mt-0.5 text-[11.5px]">{meta}</div>}
        </div>
        {/* corpo */}
        <div className="flex flex-col gap-2 px-4 py-3.5">
          {(about || description) && (
            <div className="border-edge text-ink-70 border-b border-dotted pb-2.5 text-[11.5px] leading-relaxed">
              {(about || description).slice(0, 150)}
              {(about || description).length > 150 ? '…' : ''}
            </div>
          )}
          {(phone || instagram) && (
            <div className="border-edge text-ink-70 flex flex-wrap items-center gap-2.5 border-b border-dotted pb-2.5 text-[10.5px] font-semibold">
              {phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="text-green-emph size-2.5" />
                  {formatPhoneBR(phone)}
                </span>
              )}
              {instagram && (
                <span className="inline-flex items-center gap-1">
                  <Instagram className="text-green-emph size-2.5" />@{instagram.replace(/^@+/, '')}
                </span>
              )}
            </div>
          )}
          {services.slice(0, 3).map((s) => (
            <div
              key={s.name}
              className="border-edge flex items-baseline justify-between border-b border-dotted py-1.5 last:border-0"
            >
              <span className="text-ink text-xs font-semibold">{s.name}</span>
              <span className="text-ink font-serif text-[13px]">{money(s.priceCents)}</span>
            </div>
          ))}
          {shownAmenities.length > 0 && (
            <div className="border-edge flex flex-wrap gap-1.5 border-t border-dotted pt-2.5">
              {shownAmenities.map(({ key, label, Icon }) => (
                <span
                  key={key}
                  className="bg-chip text-green-emph inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[9.5px] font-semibold"
                >
                  <Icon className="size-2.5" />
                  {label}
                </span>
              ))}
            </div>
          )}
          <div className="bg-coral shadow-coral mt-1 rounded-full py-3 text-center text-[13px] font-semibold text-white">
            {enabled ? 'Agendar agora' : 'Ver contatos'}
          </div>
        </div>
      </div>
    </div>
  );
}
