'use client';

import { Calendar } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type BusinessHour = { name: string; value: string };

export function BusinessHoursDialog({ hours }: { hours: BusinessHour[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Calendar className="h-4 w-4" />
          Horários de atendimento
        </Button>
      </DialogTrigger>
      {/* Modal de visualização (sem formulário): pode fechar por overlay/ESC */}
      <DialogContent className="max-w-xs gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5" />
            Horários de atendimento
          </DialogTitle>
        </DialogHeader>
        <ul className="overflow-hidden rounded-lg border">
          {hours.map((h) => (
            <li
              key={h.name}
              className="flex items-center justify-between border-b px-4 py-2 text-sm last:border-b-0"
            >
              <span className="font-medium">{h.name}</span>
              <span className="text-muted-foreground">{h.value}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
