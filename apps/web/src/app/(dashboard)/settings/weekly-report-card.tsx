'use client';

// Card de config do Relatório semanal (em /settings). Salva na hora (otimista), como os
// switches de avisos. Dia e horário não aparecem porque são fixos: segunda de manhã.

import { Info } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import type { WeeklyReportChannel } from '@haru/database';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';

import { updateWeeklyReportSettings } from './weekly-report-actions';

export function WeeklyReportCard({
  enabled: initialEnabled,
  channel: initialChannel,
  ownerWhatsappAlertsEnabled,
}: {
  enabled: boolean;
  channel: WeeklyReportChannel;
  ownerWhatsappAlertsEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [channel, setChannel] = useState<WeeklyReportChannel>(initialChannel);
  const [, startTransition] = useTransition();

  function save(patch: { enabled?: boolean; channel?: WeeklyReportChannel }, revert: () => void) {
    startTransition(async () => {
      const res = await updateWeeklyReportSettings(patch);
      if ('error' in res) {
        revert();
        toast.error(res.error);
      }
    });
  }

  function toggleEnabled(next: boolean) {
    setEnabled(next);
    save({ enabled: next }, () => setEnabled(!next));
  }

  function pickChannel(next: WeeklyReportChannel) {
    if (next === channel) return;
    const prev = channel;
    setChannel(next);
    save({ channel: next }, () => setChannel(prev));
  }

  // O WhatsApp do relatório sai pelo mesmo opt-in dos alertas do dono. Se ele escolheu um
  // canal que inclui WhatsApp mas nunca ligou os alertas, o canal não sai - avisa em vez
  // de deixar o dono achando que está recebendo.
  const whatsappBlocked = channel !== 'EMAIL' && !ownerWhatsappAlertsEnabled;

  return (
    <div className="border-line bg-paper shadow-soft rounded-[18px] border p-[18px]">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-ink font-serif text-[16px]">Relatório semanal</div>
          <div className="text-ink-50 mt-0.5 text-[12px] font-medium leading-snug">
            Toda segunda de manhã, um resumo da semana anterior: faturamento, comparecimento,
            horários que ficaram vazios e o que fazer a respeito.
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggleEnabled} />
      </div>

      {enabled && (
        <div className="border-edge mt-3.5 border-t border-dotted pt-3.5">
          <div className="text-ink text-[13.5px] font-semibold">Onde receber</div>
          <div className="text-ink-50 mb-2.5 mt-0.5 text-[11.5px] font-medium leading-snug">
            E-mail traz o relatório completo. WhatsApp traz o resumo curto com link pro painel.
          </div>
          <SegmentedControl
            aria-label="Canal do relatório semanal"
            value={channel}
            onChange={pickChannel}
            options={[
              { label: 'E-mail', value: 'EMAIL' },
              { label: 'WhatsApp', value: 'WHATSAPP' },
              { label: 'Os dois', value: 'BOTH' },
            ]}
          />
          {whatsappBlocked && (
            <div className="bg-coral-tint text-coral-deep mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11.5px] leading-relaxed">
              <Info className="mt-0.5 size-[15px] flex-none" strokeWidth={2} />
              Pra receber por WhatsApp, ligue os alertas do dono em Avisos e cadastre seu telefone.
              Até lá, {channel === 'BOTH' ? 'só o e-mail sai' : 'o relatório não é enviado'}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
