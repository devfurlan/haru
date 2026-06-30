'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { customerCancelAppointment } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { CustomerAppointmentItem } from '@/lib/customer';

export function CancelDialog({ item }: { item: CustomerAppointmentItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await customerCancelAppointment(item.id);
      if (result && 'error' in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          Cancelar
        </Button>
      </DialogTrigger>
      <DialogContent dismissable={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar agendamento</DialogTitle>
          <DialogDescription>
            {item.serviceName} · {item.whenLabel} · {item.tenant.name}
          </DialogDescription>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Tem certeza que deseja cancelar? Esta ação não pode ser desfeita - se mudar de ideia, será
          preciso agendar de novo.
        </p>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Voltar
          </Button>
          <Button type="button" variant="destructive" onClick={handleCancel} disabled={pending}>
            {pending ? 'Cancelando…' : 'Cancelar agendamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
