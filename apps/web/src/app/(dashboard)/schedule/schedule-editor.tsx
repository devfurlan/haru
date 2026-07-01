'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

/** Estado inicial: um mapa de byDay por profissional. */
function initialByProf(
  professionals: ProfessionalSchedule[],
): Record<string, Record<number, RangeRow[]>> {
  const out: Record<string, Record<number, RangeRow[]>> = {};
  for (const p of professionals) out[p.id] = blocksToState(p.blocks);
  return out;
}

export function ScheduleEditor({ professionals }: ScheduleEditorProps) {
  const [selectedId, setSelectedId] = useState<string>(professionals[0]?.id ?? '');
  // Guarda o estado editado de cada profissional para não perder ao trocar de aba.
  const [byProf, setByProf] = useState<Record<string, Record<number, RangeRow[]>>>(() =>
    initialByProf(professionals),
  );
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  if (professionals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum profissional com agenda. Marque um membro da equipe como profissional em
        Configurações para definir os horários dele.
      </p>
    );
  }

  const multi = professionals.length > 1;
  const byDay = byProf[selectedId] ?? {};

  function updateRange(weekday: number, index: number, key: 'start' | 'end', value: string) {
    setByProf((prev) => {
      const cur = prev[selectedId] ?? {};
      const ranges = [...(cur[weekday] ?? [])];
      ranges[index] = { ...ranges[index], [key]: value };
      return { ...prev, [selectedId]: { ...cur, [weekday]: ranges } };
    });
  }

  function addRange(weekday: number) {
    setByProf((prev) => {
      const cur = prev[selectedId] ?? {};
      const last = (cur[weekday] ?? []).at(-1);
      const fallback = last ? { start: last.end, end: last.end } : { start: '09:00', end: '18:00' };
      return { ...prev, [selectedId]: { ...cur, [weekday]: [...(cur[weekday] ?? []), fallback] } };
    });
  }

  function removeRange(weekday: number, index: number) {
    setByProf((prev) => {
      const cur = prev[selectedId] ?? {};
      const next = { ...cur, [weekday]: (cur[weekday] ?? []).filter((_, i) => i !== index) };
      return { ...prev, [selectedId]: next };
    });
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
      if (result && 'error' in result) {
        setFeedback({ kind: 'error', message: result.error });
      } else {
        setFeedback({ kind: 'success', message: 'Horários salvos.' });
      }
    });
  }

  return (
    <div className="space-y-3">
      {multi && (
        <div className="flex flex-wrap gap-2">
          {professionals.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={p.id === selectedId ? 'default' : 'outline'}
              onClick={() => {
                setFeedback(null);
                setSelectedId(p.id);
              }}
            >
              {p.name ?? 'Sem nome'}
            </Button>
          ))}
        </div>
      )}

      {WEEKDAYS.map((day) => {
        const ranges = byDay[day.value] ?? [];
        return (
          <Card key={day.value}>
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
              <div className="w-24 shrink-0 pt-2 text-sm font-medium">{day.label}</div>

              <div className="flex-1 space-y-2">
                {ranges.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Fechado</div>
                ) : (
                  ranges.map((range, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={range.start}
                        onChange={(e) => updateRange(day.value, index, 'start', e.target.value)}
                        className="w-32"
                        step={300}
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={range.end}
                        onChange={(e) => updateRange(day.value, index, 'end', e.target.value)}
                        className="w-32"
                        step={300}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRange(day.value, index)}
                        title="Remover intervalo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <Button variant="outline" size="sm" onClick={() => addRange(day.value)}>
                <Plus className="h-4 w-4" />
                {ranges.length === 0 ? 'Abrir' : 'Adicionar'}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {feedback && (
        <p
          className={
            feedback.kind === 'error' ? 'text-sm text-destructive' : 'text-sm text-emerald-600'
          }
        >
          {feedback.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar horários'}
        </Button>
      </div>
    </div>
  );
}
