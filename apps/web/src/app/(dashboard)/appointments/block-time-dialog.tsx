'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { createScheduleException, type CreateScheduleExceptionResult } from './actions';

const REASON_SUGGESTIONS = ['Almoço', 'Médico', 'Compromisso', 'Folga', 'Férias'];

interface BlockTimeDialogProps {
  open: boolean;
  /** Dia pré-selecionado (YYYY-MM-DD no fuso do tenant). */
  defaultDate: string;
  onClose: () => void;
  /** Chamado após criar com sucesso - para o pai fechar/atualizar. */
  onCreated: () => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="coral" disabled={pending}>
      {pending ? 'Bloqueando…' : 'Bloquear horário'}
    </Button>
  );
}

export function BlockTimeDialog({ open, defaultDate, onClose, onCreated }: BlockTimeDialogProps) {
  const [state, formAction] = useActionState<CreateScheduleExceptionResult, FormData>(
    createScheduleException,
    undefined,
  );

  const [allDay, setAllDay] = useState(false);
  const [multiDay, setMultiDay] = useState(false);
  const [reason, setReason] = useState('');

  // Fecha quando a ação retorna sucesso.
  useEffect(() => {
    if (state && 'ok' in state && state.ok) {
      onCreated();
    }
  }, [state, onCreated]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent dismissable={false}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            Bloquear um <em className="text-green-emph">horário</em>
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            Almoço, compromisso, folga - o horário some das opções do cliente na hora.
          </p>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">{multiDay ? 'Data inicial' : 'Data'}</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={defaultDate}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={multiDay}
              onChange={(e) => {
                setMultiDay(e.target.checked);
                // Vários dias só faz sentido como dia inteiro.
                if (e.target.checked) setAllDay(true);
              }}
              className="size-4"
            />
            Vários dias
          </label>

          {multiDay && (
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Data final</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={defaultDate} required />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="allDay"
              value="true"
              checked={allDay}
              disabled={multiDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="size-4"
            />
            Dia inteiro
          </label>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Início</Label>
                <Input id="startTime" name="startTime" type="time" defaultValue="08:00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime">Fim</Label>
                <Input id="endTime" name="endTime" type="time" defaultValue="09:00" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo <span className="font-medium text-ink-30">· opcional, só você vê</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {REASON_SUGGESTIONS.map((r) => (
                <Chip
                  key={r}
                  type="button"
                  selected={reason === r}
                  onClick={() => setReason((cur) => (cur === r ? '' : r))}
                >
                  {r}
                </Chip>
              ))}
            </div>
            <Input
              id="reason"
              name="reason"
              maxLength={120}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ou escreva um motivo"
            />
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
