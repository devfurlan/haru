'use client';

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  type ApplyResult,
  ENTITY_FIELDS,
  ENTITY_LABEL,
  type EntityId,
  type Mapping,
  type Row,
  SOURCE_LABEL,
  type SourceId,
} from '@/lib/import/mapping';

const SELECT_CLS =
  'flex h-11 w-full rounded-xl border border-edge bg-cream px-3.5 text-sm text-ink outline-none focus:border-green-deep';

const SOURCES: SourceId[] = ['appbarber', 'trinks', 'generic'];
const ENTITY_OPTIONS: { label: string; value: EntityId }[] = [
  { label: 'Clientes', value: 'contacts' },
  { label: 'Serviços', value: 'services' },
  { label: 'Agendamentos', value: 'appointments' },
];
const STEPS = ['Origem', 'Colunas', 'Prévia', 'Pronto'];
const DEST: Record<EntityId, { href: string; label: string }> = {
  contacts: { href: '/clients', label: 'Ver clientes' },
  services: { href: '/services', label: 'Ver serviços' },
  appointments: { href: '/appointments', label: 'Ver agenda' },
};
const BATCH = 500;

interface ParseData {
  headers: string[];
  rows: Row[];
  mapping: Mapping;
  total: number;
  truncated: boolean;
}
interface ApplyAgg {
  counts: ApplyResult['counts'];
  errorRows: { row: number; error: string }[];
}

/** Campo crítico não mapeado -> mensagem; null se está tudo pronto pra prévia. */
function criticalMissing(entity: EntityId, m: Mapping): string | null {
  if (entity === 'contacts')
    return !m.phone && !m.name ? 'Mapeie ao menos Telefone ou Nome.' : null;
  if (entity === 'services') {
    if (!m.name) return 'Mapeie o Nome do serviço.';
    if (!m.durationMinutes) return 'Mapeie a Duração.';
    return null;
  }
  if (!m.serviceName) return 'Mapeie o Serviço.';
  if (!m.date) return 'Mapeie a Data.';
  if (!m.customerPhone && !m.customerName) return 'Mapeie Telefone ou Nome do cliente.';
  return null;
}

export function ImportWizard({
  serviceCount,
  professionalCount,
}: {
  serviceCount: number;
  professionalCount: number;
}) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<SourceId>('appbarber');
  const [entity, setEntity] = useState<EntityId>('contacts');
  const [file, setFile] = useState<File | null>(null);
  const [parseData, setParseData] = useState<ParseData | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [preview, setPreview] = useState<ApplyAgg | null>(null);
  const [result, setResult] = useState<ApplyAgg | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep(1);
    setFile(null);
    setParseData(null);
    setMapping({});
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function handleParse() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('entity', entity);
      fd.set('source', source);
      const res = await fetch('/api/import/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao ler o arquivo');
      setParseData(data);
      setMapping(data.mapping);
      setPreview(null);
      setStep(2);
      if (data.truncated) {
        toast.warning(
          `Arquivo grande: importando as primeiras ${data.rows.length} de ${data.total} linhas.`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao ler o arquivo';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function runApply(dryRun: boolean): Promise<ApplyAgg | null> {
    if (!parseData) return null;
    setLoading(true);
    setError(null);
    const counts = { create: 0, update: 0, skip: 0, error: 0 };
    const errorRows: { row: number; error: string }[] = [];
    try {
      for (let i = 0; i < parseData.rows.length; i += BATCH) {
        const slice = parseData.rows.slice(i, i + BATCH);
        const res = await fetch('/api/import/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity, mapping, rows: slice, dryRun }),
        });
        const data: ApplyResult & { error?: string } = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Falha na importação');
        counts.create += data.counts.create;
        counts.update += data.counts.update;
        counts.skip += data.counts.skip;
        counts.error += data.counts.error;
        data.rows.forEach((r, j) => {
          // linha humana: +1 do cabeçalho, +1 pra contar a partir de 1
          if (r.disposition === 'error' && errorRows.length < 100)
            errorRows.push({ row: i + j + 2, error: r.error ?? 'erro' });
        });
      }
      return { counts, errorRows };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha na importação';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function goPreview() {
    const missing = criticalMissing(entity, mapping);
    if (missing) {
      setError(missing);
      return;
    }
    const agg = await runApply(true);
    if (agg) {
      setPreview(agg);
      setStep(3);
    }
  }

  async function goCommit() {
    const agg = await runApply(false);
    if (agg) {
      setResult(agg);
      setStep(4);
      const done = agg.counts.create + agg.counts.update;
      toast.success(`Importação concluída: ${done} ${done === 1 ? 'registro' : 'registros'}.`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Stepper step={step} />

      {error && (
        <div className="border-coral/30 bg-coral/5 text-coral-deep flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardContent className="flex flex-col gap-6 p-6">
            <Field label="De onde vêm os dados?">
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((s) => (
                  <Chip key={s} selected={source === s} onClick={() => setSource(s)}>
                    {SOURCE_LABEL[s]}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="O que você quer importar?">
              <SegmentedControl
                options={ENTITY_OPTIONS}
                value={entity}
                onChange={(v) => {
                  setEntity(v);
                  setParseData(null);
                }}
              />
              {entity === 'appointments' && (
                <p className="text-ink-50 mt-2 text-xs">
                  {serviceCount === 0
                    ? 'Você ainda não tem serviços cadastrados - importe os serviços antes, senão os agendamentos vão dar erro.'
                    : professionalCount > 1
                      ? 'Sua planilha precisa ter a coluna do profissional (você tem mais de um).'
                      : 'Cada agendamento precisa de um serviço já cadastrado e uma data.'}
                </p>
              )}
            </Field>

            <Field label="Arquivo (.xlsx, .xls ou .csv)">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setParseData(null);
                  setError(null);
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" type="button" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" />
                  Escolher arquivo
                </Button>
                {file ? (
                  <span className="text-ink-70 inline-flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="text-green-emph size-4" />
                    {file.name}
                  </span>
                ) : (
                  <span className="text-ink-40 text-sm">Nenhum arquivo escolhido</span>
                )}
              </div>
            </Field>

            <div className="flex justify-end">
              <Button onClick={handleParse} disabled={!file || loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && parseData && (
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <div>
              <h2 className="text-ink font-serif text-xl">Confira o de-para das colunas</h2>
              <p className="text-ink-50 mt-1 text-sm">
                {parseData.total} linha{parseData.total === 1 ? '' : 's'} no arquivo. Ajuste
                qualquer coluna que não tenha casado certo.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {ENTITY_FIELDS[entity].map((f) => {
                const selected = mapping[f.id] ?? '';
                const samples = selected
                  ? parseData.rows
                      .slice(0, 3)
                      .map((r) => r[selected])
                      .filter(Boolean)
                      .join(' · ')
                  : '';
                return (
                  <div
                    key={f.id}
                    className="grid grid-cols-1 gap-1.5 sm:grid-cols-[220px_1fr] sm:items-center sm:gap-4"
                  >
                    <div>
                      <div className="text-ink text-sm font-medium">{f.label}</div>
                      {f.hint && <div className="text-ink-40 text-xs">{f.hint}</div>}
                    </div>
                    <div>
                      <select
                        className={SELECT_CLS}
                        value={selected}
                        onChange={(e) =>
                          setMapping((m) => ({ ...m, [f.id]: e.target.value || null }))
                        }
                      >
                        <option value="">— não importar —</option>
                        {parseData.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      {samples && (
                        <div className="text-ink-40 mt-1 truncate text-xs">ex.: {samples}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
              <Button onClick={goPreview} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                Ver prévia
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && preview && (
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <div>
              <h2 className="text-ink font-serif text-xl">Prévia</h2>
              <p className="text-ink-50 mt-1 text-sm">
                Nada foi gravado ainda. Confira antes de confirmar.
              </p>
            </div>

            <Counts counts={preview.counts} entity={entity} />

            {preview.errorRows.length > 0 && (
              <div className="border-edge bg-cream-2/50 rounded-2xl border">
                <div className="border-edge text-ink-70 border-b px-4 py-2.5 text-xs font-semibold">
                  Linhas com erro (não serão importadas)
                </div>
                <ul className="divide-edge max-h-60 divide-y overflow-y-auto">
                  {preview.errorRows.map((e, i) => (
                    <li key={i} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                      <span className="text-ink-40 flex-none font-mono text-xs">linha {e.row}</span>
                      <span className="text-coral-deep">{e.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-ink-40 text-xs">
              Rodar de novo o mesmo arquivo é seguro: registros já existentes viram atualização
              {entity === 'appointments' ? ' ou são pulados' : ''}, sem duplicar.
            </p>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="size-4" />
                Ajustar colunas
              </Button>
              <Button
                onClick={goCommit}
                disabled={loading || preview.counts.create + preview.counts.update === 0}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Importar {preview.counts.create + preview.counts.update} registro
                {preview.counts.create + preview.counts.update === 1 ? '' : 's'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && result && (
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3">
              <span className="bg-chip text-green-emph flex size-10 items-center justify-center rounded-full">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <h2 className="text-ink font-serif text-xl">Importação concluída</h2>
                <p className="text-ink-50 text-sm">
                  {ENTITY_LABEL[entity]} atualizados no seu painel.
                </p>
              </div>
            </div>

            <Counts counts={result.counts} entity={entity} />

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Importar outro
              </Button>
              <Button asChild>
                <Link href={DEST[entity].href}>{DEST[entity].label}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-ink text-sm font-medium">{label}</div>
      {children}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                'flex size-6 flex-none items-center justify-center rounded-full ' +
                (done || active ? 'bg-green-deep text-cream' : 'bg-cream-2 text-ink-40')
              }
            >
              {done ? <CheckCircle2 className="size-4" /> : n}
            </span>
            <span className={active ? 'text-ink' : 'text-ink-40'}>{label}</span>
            {n < STEPS.length && <span className="bg-edge mx-1 h-px w-5" />}
          </li>
        );
      })}
    </ol>
  );
}

function Counts({ counts, entity }: { counts: ApplyResult['counts']; entity: EntityId }) {
  const tiles: { n: number; label: string; cls: string }[] = [
    { n: counts.create, label: 'novos', cls: 'text-green-emph' },
    { n: counts.update, label: 'atualizações', cls: 'text-ink' },
  ];
  if (entity === 'appointments')
    tiles.push({ n: counts.skip, label: 'já existiam', cls: 'text-ink-50' });
  tiles.push({
    n: counts.error,
    label: 'com erro',
    cls: counts.error > 0 ? 'text-coral-deep' : 'text-ink-30',
  });

  return (
    <div className="flex flex-wrap gap-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="border-edge bg-paper min-w-[104px] flex-1 rounded-2xl border px-4 py-3"
        >
          <div className={'font-serif text-2xl ' + t.cls}>{t.n}</div>
          <div className="text-ink-50 text-xs">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
