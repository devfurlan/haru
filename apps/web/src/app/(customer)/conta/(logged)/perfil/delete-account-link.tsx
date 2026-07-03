'use client';

import { useState, useTransition } from 'react';

import { customerDeleteAccount } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Link discreto (dentro do card de dados) que abre a exclusão em dois passos de
 * retenção: o 1º tenta segurar o cliente (o que se perde + "Manter conta" como ação
 * principal); só o 2º confirma a exclusão irreversível. Sucesso redireciona no
 * servidor - só voltamos ao componente em caso de erro.
 */
export function DeleteAccountLink() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    // Reseta pro passo 1 depois da animação de fechar, pra não "piscar" ao reabrir.
    setTimeout(() => {
      setConfirming(false);
      setError(null);
    }, 200);
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await customerDeleteAccount();
      if (result && 'error' in result) setError(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive text-xs underline underline-offset-4 transition-colors"
        >
          Excluir minha conta
        </button>
      </DialogTrigger>

      <DialogContent dismissable={false} className="max-w-sm">
        {confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>Tem certeza?</DialogTitle>
              <DialogDescription>Esta ação é permanente e não pode ser desfeita.</DialogDescription>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Ao confirmar, apagamos sua conta, seus favoritos e as notificações. Você perde o
              acesso e precisará criar tudo de novo caso volte.
            </p>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={close} disabled={pending}>
                Manter minha conta
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={pending}
                className="text-destructive hover:text-destructive"
              >
                {pending ? 'Excluindo…' : 'Excluir definitivamente'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Antes de excluir sua conta</DialogTitle>
              <DialogDescription>Dá pra voltar atrás - veja o que acontece.</DialogDescription>
            </DialogHeader>
            <ul className="text-muted-foreground space-y-1.5 text-sm">
              <li>• Você perde o acesso a esta conta - não dá pra recuperar depois.</li>
              <li>• Seus favoritos e preferências de notificação são apagados.</li>
              <li>• Seus agendamentos continuam registrados nos estabelecimentos.</li>
            </ul>
            <p className="text-muted-foreground text-sm">
              Só quer parar de receber e-mails? Dá pra desligar as notificações sem excluir a conta.
            </p>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={close}>
                Manter minha conta
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                Quero excluir mesmo assim
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
