import { ChevronRight, Lock, Phone } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerProfile } from '@/lib/customer';
import { formatPhoneBR, maskCpfCnpjInput } from '@haru/shared';

import { CustomerSignOutButton } from '../customer-sign-out-button';
import { AvatarEditor } from './avatar-editor';
import { CustomerNotificationsCard } from './notifications-card';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

const TERMS_URL = 'https://www.demandae.com/termos';
const PRIVACY_URL = 'https://www.demandae.com/privacidade';

/** "YYYY-MM-DD" de uma data guardada como meia-noite UTC (pro input type="date"). */
function toYMD(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function AccessRow({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-1 py-3.5 transition-opacity active:opacity-60"
    >
      <span className="text-green-deep">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="text-ink block text-[15px] font-semibold">{label}</span>
        <span className="text-sub block text-[12.5px]">{hint}</span>
      </span>
      <ChevronRight className="h-[18px] w-[18px] text-[#c3b79c]" />
    </Link>
  );
}

export default async function CustomerProfilePage() {
  const account = await requireCustomerAccount();
  const profile = await getCustomerProfile(account);
  const subtitle = account.phone ? formatPhoneBR(account.phone) : account.email;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-8 md:py-9">
      <AvatarEditor
        name={account.name ?? subtitle}
        subtitle={account.name ? subtitle : undefined}
        avatarUrl={account.avatarUrl}
      />

      <div className="mt-7 grid gap-5 md:grid-cols-2 md:items-start">
        {/* Dados pessoais (inclui excluir conta) */}
        <ProfileForm
          name={profile.name ?? ''}
          email={profile.email}
          documentDefault={profile.document ? maskCpfCnpjInput(profile.document) : ''}
          birthDateDefault={profile.birthDate ? toYMD(profile.birthDate) : ''}
        />

        <div className="space-y-5">
          <CustomerNotificationsCard appointmentEmailsEnabled={account.appointmentEmailsEnabled} />

          <Card>
            <CardHeader>
              <CardTitle>Acesso</CardTitle>
              <CardDescription>Senha e telefone de confirmação.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-[#ece3cf] py-0">
              <AccessRow
                href="/conta/perfil/senha"
                icon={<Lock className="h-[20px] w-[20px]" />}
                label="Alterar senha"
                hint="Mínimo de 8 caracteres."
              />
              <AccessRow
                href="/conta/perfil/telefone"
                icon={<Phone className="h-[20px] w-[20px]" />}
                label="Telefone"
                hint={account.phone ? formatPhoneBR(account.phone) : 'Confirme seu WhatsApp'}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
            <a
              href={TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sub text-[13px] font-semibold"
            >
              Termos de Uso
            </a>
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sub text-[13px] font-semibold"
            >
              Política de Privacidade
            </a>
          </div>

          {/* No desktop o "Sair" já fica no header; aqui aparece no mobile (sem header). */}
          <div className="md:hidden">
            <CustomerSignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
