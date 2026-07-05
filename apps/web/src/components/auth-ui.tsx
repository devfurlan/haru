'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { cn } from '@/lib/utils';

// Peças visuais compartilhadas das telas de auth (login/cadastro/recuperação), espelhando
// a linguagem do app: headline Fraunces com acento itálico verde, inputs "paper" com borda
// suave, senha com olho, divisória "ou" e CTA coral. Usadas por (auth) e conta/(public).

// Headline "Que bom te ver" com a palavra de destaque em Fraunces itálico verde.
export function AuthTitle({
  plain,
  accent,
  subtitle,
}: {
  plain: string;
  accent: string;
  subtitle?: string;
}) {
  return (
    <div className="mt-[26px]">
      <h1 className="text-ink font-serif text-[30px] leading-[33px] tracking-[-0.5px]">
        {plain} <em className="text-green-deep italic">{accent}</em>
      </h1>
      {subtitle ? (
        <p className="text-muted-foreground mt-2.5 text-[15px] leading-6">{subtitle}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  'border-edge bg-paper text-ink placeholder:text-[#9aa8a0] focus:border-green-deep w-full rounded-[14px] border px-4 py-[13px] text-base outline-none focus:border-[1.5px]';

export const AuthField = forwardRef<
  HTMLInputElement,
  { label: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function AuthField({ label, className, id, ...props }, ref) {
  return (
    <div>
      <label htmlFor={id} className="text-ink mb-1.5 block text-[12.5px] font-semibold">
        {label}
      </label>
      <input ref={ref} id={id} className={cn(inputCls, className)} {...props} />
    </div>
  );
});

export function AuthPassword({
  label,
  id,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-ink mb-1.5 block text-[12.5px] font-semibold">
        {label}
      </label>
      <div className="border-edge bg-paper focus-within:border-green-deep relative flex items-center rounded-[14px] border focus-within:border-[1.5px]">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="text-ink placeholder:text-[#9aa8a0] flex-1 bg-transparent px-4 py-[13px] text-base outline-none"
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="text-muted-foreground hover:text-foreground px-3"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function AuthDivider({ label = 'ou' }: { label?: string }) {
  return (
    <div className="my-[18px] flex items-center gap-3">
      <span className="bg-edge h-px flex-1" />
      <span className="text-xs text-[#9aa89e]">{label}</span>
      <span className="bg-edge h-px flex-1" />
    </div>
  );
}

// CTA coral com estado de envio (usa useFormStatus dentro de <form action>).
export function AuthSubmit({
  label,
  pendingLabel,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="bg-coral w-full rounded-2xl py-4 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
