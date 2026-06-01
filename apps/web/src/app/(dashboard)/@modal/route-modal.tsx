'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RouteModalProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Dialog que envolve uma rota interceptada. Começa aberto; ao fechar faz
 * `router.back()` pra voltar pra rota de origem (ex.: /appointments). A rota
 * "de verdade" continua existindo pra acesso direto/refresh — ver os page.tsx
 * fora do slot @modal.
 *
 * Como é um modal com formulário/ação, NÃO fecha ao clicar fora (overlay) nem
 * com ESC — só pelo X ou pelo botão "Cancelar" — pra evitar perda acidental
 * do que foi digitado.
 */
export function RouteModal({ title, description, children }: RouteModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Aguarda a animação de saída antes de desmontar a rota interceptada.
      router.back();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl" dismissable={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
