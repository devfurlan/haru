import { Bell, ChevronRight, Heart, HelpCircle, Lock, User } from 'lucide-react';
import Link from 'next/link';

import { requireCustomerAccount } from '@/lib/customer-auth';
import { formatPhoneBR } from '@haru/shared';

import { CustomerSignOutButton } from '../customer-sign-out-button';
import { AvatarEditor } from './avatar-editor';

export const dynamic = 'force-dynamic';

const TERMS_URL = 'https://www.demandae.com/termos';
const PRIVACY_URL = 'https://www.demandae.com/privacidade';

function Row({
  href,
  external,
  icon,
  label,
}: {
  href: string;
  external?: boolean;
  icon?: React.ReactNode;
  label: string;
}) {
  const className =
    'flex items-center gap-3.5 px-1 py-[15px] transition-opacity active:opacity-60';
  const content = (
    <>
      {icon ? <span className="text-green-deep">{icon}</span> : null}
      <span className="text-ink flex-1 text-[15px] font-semibold">{label}</span>
      <ChevronRight className="h-[18px] w-[18px] text-[#c3b79c]" />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default async function CustomerProfilePage() {
  const account = await requireCustomerAccount();
  const subtitle = account.phone ? formatPhoneBR(account.phone) : account.email;

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="text-ink font-serif text-[28px] tracking-tight">Perfil</h1>

      <div className="pt-[18px]">
        <AvatarEditor
          name={account.name ?? subtitle}
          subtitle={account.name ? subtitle : undefined}
          avatarUrl={account.avatarUrl}
        />
      </div>

      {/* Ajustes da conta */}
      <div className="divide-y divide-[#ece3cf] pt-[22px]">
        <Row href="/conta/perfil/dados" icon={<User className="h-[21px] w-[21px]" />} label="Meus dados" />
        <Row
          href="/conta/perfil/notificacoes"
          icon={<Bell className="h-[21px] w-[21px]" />}
          label="Notificações"
        />
        <Row
          href="/conta/buscar?tab=favoritos"
          icon={<Heart className="h-[21px] w-[21px]" />}
          label="Favoritos"
        />
        <Row
          href="/conta/perfil/senha"
          icon={<Lock className="h-[21px] w-[21px]" />}
          label="Alterar senha"
        />
      </div>

      {/* Sobre / legal */}
      <p className="text-sub mb-1 mt-7 px-1 text-[12px] font-semibold uppercase tracking-wide">
        Sobre
      </p>
      <div className="divide-y divide-[#ece3cf]">
        <Row href={TERMS_URL} external label="Termos de Uso" />
        <Row href={PRIVACY_URL} external label="Política de Privacidade" />
      </div>

      {/* No desktop o "Sair" já fica fixo no header; aqui só no mobile (sem header). */}
      <div className="mt-7 md:hidden">
        <CustomerSignOutButton />
      </div>
    </div>
  );
}
