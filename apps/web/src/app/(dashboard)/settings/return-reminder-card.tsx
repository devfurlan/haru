'use client';

// Card de config do Lembrete de retorno (em /settings). Toggle único, salva na hora
// (otimista), como o relatório semanal. O ritmo padrão por serviço fica na tela de Serviços.

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Switch } from '@/components/ui/switch';

import { updateReturnReminderSettings } from './return-reminder-actions';

export function ReturnReminderCard({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [, startTransition] = useTransition();

  function toggle(next: boolean) {
    setEnabled(next); // otimista
    startTransition(async () => {
      const res = await updateReturnReminderSettings({ enabled: next });
      if ('error' in res) {
        setEnabled(!next); // reverte
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="border-line bg-paper shadow-soft rounded-[18px] border p-[18px]">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-ink font-serif text-[16px]">Lembrete de retorno</div>
          <div className="text-ink-50 mt-0.5 text-[12px] font-medium leading-snug">
            Quando chega a hora do próximo atendimento, a gente cutuca o cliente pra remarcar - com
            horários livres do profissional de sempre. Cai sozinho, prioriza app e e-mail.
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>

      {enabled && (
        <div className="border-edge text-ink-50 mt-3.5 border-t border-dotted pt-3.5 text-[11.5px] font-medium leading-snug">
          Dá pra definir um ritmo padrão por serviço (ex.: corte a cada 30 dias) na tela de Serviços
          - vira o palpite quando o cliente ainda não tem histórico.
        </div>
      )}
    </div>
  );
}
