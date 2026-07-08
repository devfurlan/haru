'use client';

import { X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Switch } from '@/components/ui/switch';
import { hhmmToMinutes, minutesToHHMM } from '@haru/shared';

import { saveSchedule } from './actions';

interface ScheduleBlockInput {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface ProfessionalSchedule {
  id: string;
  name: string | null;
  blocks: ScheduleBlockInput[];
}

interface ScheduleEditorProps {
  professionals: ProfessionalSchedule[];
}

interface RangeRow {
  start: string;
  end: string;
}

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function blocksToState(blocks: ScheduleBlockInput[]): Record<number, RangeRow[]> {
  const state: Record<number, RangeRow[]> = {};
  for (const day of WEEKDAYS) state[day.value] = [];
  for (const block of blocks) {
    state[block.weekday] ??= [];
    state[block.weekday].push({
      start: minutesToHHMM(block.startMinute),
      end: minutesToHHMM(block.endMinute),
    });
  }
  return state;
}

function initialByProf(
  professionals: ProfessionalSchedule[],
): Record<string, Record<number, RangeRow[]>> {
  const out: Record<string, Record<number, RangeRow[]>> = {};
  for (const p of professionals) out[p.id] = blocksToState(p.blocks);
  return out;
}

export function ScheduleEditor({ professionals }: ScheduleEditorProps) {
  const [selectedId, setSelectedId] = useState<string>(professionals[0]?.id ?? '');
  const [byProf, setByProf] = useState<Record<string, Record<number, RangeRow[]>>>(() =>
    initialByProf(professionals),
  );
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  if (professionals.length === 0) {
    return (
      <p className="text-sm text-ink-50">
        Nenhum profissional com agenda. Marque um membro da equipe como profissional em Equipe para
        definir os horários dele.
      </p>
    );
  }

  const multi = professionals.length > 1;
  const byDay = byProf[selectedId] ?? {};

  function mutate(weekday: number, fn: (ranges: RangeRow[]) => RangeRow[]) {
    setByProf((prev) => {
      const cur = prev[selectedId] ?? {};
      return { ...prev, [selectedId]: { ...cur, [weekday]: fn(cur[weekday] ?? []) } };
    });
  }

  function updateRange(weekday: number, index: number, key: 'start' | 'end', value: string) {
    mutate(weekday, (ranges) => ranges.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  function addRange(weekday: number) {
    mutate(weekday, (ranges) => {
      const last = ranges.at(-1);
      const next = last ? { start: last.end, end: last.end } : { start: '09:00', end: '19:00' };
      return [...ranges, next];
    });
  }

  function removeRange(weekday: number, index: number) {
    mutate(weekday, (ranges) => ranges.filter((_, i) => i !== index));
  }

  function setOpen(weekday: number, open: boolean) {
    if (open) addRange(weekday);
    else mutate(weekday, () => []);
  }

  function handleSave() {
    setFeedback(null);
    const blocks: ScheduleBlockInput[] = [];
    for (const day of WEEKDAYS) {
      for (const range of byDay[day.value] ?? []) {
        const startMinute = hhmmToMinutes(range.start);
        const endMinute = hhmmToMinutes(range.end);
        if (startMinute === null || endMinute === null) {
          setFeedback({ kind: 'error', message: `Horário inválido em ${day.label}` });
          return;
        }
        blocks.push({ weekday: day.value, startMinute, endMinute });
      }
    }
    startTransition(async () => {
      const result = await saveSchedule(selectedId, blocks);
      if (result && 'error' in result) setFeedback({ kind: 'error', message: result.error });
      else setFeedback({ kind: 'success', message: 'Horários salvos.' });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {multi && (
        <div className="flex flex-wrap gap-2">
          {professionals.map((p) => (
            <Chip
              key={p.id}
              dot
              selected={p.id === selectedId}
              onClick={() => {
                setFeedback(null);
                setSelectedId(p.id);
              }}
            >
              {p.name ?? 'Sem nome'}
            </Chip>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-[18px] border border-line bg-paper shadow-soft">
        {WEEKDAYS.map((day) => {
          const ranges = byDay[day.value] ?? [];
          const open = ranges.length > 0;
          return (
            <div
              key={day.value}
              className="flex min-h-[56px] items-center gap-4 border-t border-dotted border-edge px-[18px] py-3 first:border-0"
            >
              <div
                className={`w-[86px] flex-none font-serif text-[14.5px] ${open ? 'text-ink' : 'text-ink-30'}`}
              >
                {day.label}
              </div>
              <Switch checked={open} onCheckedChange={(next) => setOpen(day.value, next)} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {open ? (
                  <>
                    {ranges.map((range, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1.5 font-serif text-[13px] text-green-emph"
                      >
                        <input
                          type="time"
                          value={range.start}
                          step={300}
                          onChange={(e) => updateRange(day.value, index, 'start', e.target.value)}
                          className="w-[78px] bg-transparent text-center outline-none"
                        />
                        <span className="text-ink-30">–</span>
                        <input
                          type="time"
                          value={range.end}
                          step={300}
                          onChange={(e) => updateRange(day.value, index, 'end', e.target.value)}
                          className="w-[78px] bg-transparent text-center outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Remover intervalo"
                          onClick={() => removeRange(day.value, index)}
                          className="ml-0.5 text-green-emph/60 hover:text-green-emph"
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRange(day.value)}
                      className="px-1.5 text-xs font-semibold text-green-emph hover:underline"
                    >
                      + intervalo
                    </button>
                  </>
                ) : (
                  <span className="font-serif text-[13px] italic text-ink-30">Fechado</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3.5">
        {feedback && (
          <p className={feedback.kind === 'error' ? 'text-sm text-coral-deep' : 'text-sm text-green-emph'}>
            {feedback.message}
          </p>
        )}
        <p className="text-xs text-ink-50">Os novos horários valem na hora, no app e na página.</p>
        <Button variant="coral" onClick={handleSave} disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar horários'}
        </Button>
      </div>
    </div>
  );
}
