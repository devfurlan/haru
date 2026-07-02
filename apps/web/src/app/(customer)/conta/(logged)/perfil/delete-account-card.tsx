'use client';

import { useState, useTransition } from 'react';

import { customerDeleteAccount } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      // Sucesso redireciona no servidor; só voltamos aqui em caso de erro.
      const result = await customerDeleteAccount();
      if (result && 'error' in result) setError(result.error);
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Excluir conta</CardTitle>
        <CardDescription>
          Apaga sua conta, favoritos e notificações de forma permanente. Seus agendamentos continuam
          registrados nos estabelecimentos. Não dá pra desfazer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Excluir minha conta</Button>
          </DialogTrigger>
          <DialogContent dismissable={false} className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir conta</DialogTitle>
              <DialogDescription>Esta ação é permanente e não pode ser desfeita.</DialogDescription>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Vamos apagar sua conta, seus favoritos e os tokens de notificação. Os agendamentos que
              você já fez continuam registrados nos estabelecimentos. Tem certeza?
            </p>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
                {pending ? 'Excluindo…' : 'Excluir conta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
