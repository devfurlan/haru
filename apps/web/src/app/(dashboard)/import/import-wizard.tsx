'use client';

// Wizard de importação - fiel ao protótipo Claude Design "Importar Dados" (v2: planilha
// CSV/Excel, self-service, sem toque humano). 5 passos: Planilha/upload -> Conferir campos
// (abas por entidade) -> Revisar (duplicados + conflitos) -> Importando -> Pronto.
// Ligado aos endpoints reais /api/import/{parse,analyze,commit}.
// Tipografia pelas utilities font-sans/font-serif - não por `var(--font-serif)` num style
// inline: os tokens vivem em `@theme inline` (globals.css) e essa variável NÃO chega ao
// :root (medido no browser; só --font-sans chega, porque alimenta --default-font-family).
// Num shorthand `font:` uma família que não resolve derruba a declaração INTEIRA - tamanho,
// peso e leading junto.

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  type AnalyzeResult,
  type Counts,
  ENTITY_FIELDS,
  ENTITY_LABEL,
  ENTITY_ORDER,
  type EntityId,
  type Mapping,
  type Row,
} from '@/lib/import/mapping';
import { cn } from '@/lib/utils';

// ─── tokens de estilo ────────────────────────────────────────────────────────────────
const GREEN = '#1b7a4b';
const CORAL = '#c2401f';
const card = 'rounded-[18px] border border-line bg-paper shadow-[0_2px_10px_rgba(10,51,36,.05)]';

function Ic({
  size = 18,
  sw = 2.1,
  fill = 'none',
  stroke = 'currentColor',
  children,
}: {
  size?: number;
  sw?: number;
  fill?: string;
  stroke?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none"
    >
      {children}
    </svg>
  );
}
const CheckPath = () => <path d="M20 6 9 17l-5-5" />;
const entityIcon: Record<EntityId, React.ReactNode> = {
  contacts: (
    <Ic>
      <circle cx={12} cy={8} r={3.5} />
      <path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6" />
    </Ic>
  ),
  services: (
    <Ic>
      <circle cx={6} cy={6} r={2.6} />
      <circle cx={6} cy={18} r={2.6} />
      <path d="M20 4 8.2 15.9M14.5 14.5 20 20M8.2 8.1 12 12" />
    </Ic>
  ),
  appointments: (
    <Ic>
      <rect x={3} y={5} width={18} height={16} rx={3} />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Ic>
  ),
  history: (
    <Ic>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </Ic>
  ),
};

// ─── tipos locais ────────────────────────────────────────────────────────────────────
type Step = 'source' | 'map' | 'dedup' | 'importing' | 'done';
interface EntityInfo {
  entity: EntityId;
  headers: string[];
  rows: Row[];
  mapping: Mapping;
  count: number;
  truncated: boolean;
}
interface ParseData {
  entities: EntityInfo[];
  fileName: string;
}
const STEP_NAMES: [Step, string][] = [
  ['source', 'Planilha'],
  ['map', 'Conferir'],
  ['dedup', 'Revisar'],
  ['importing', 'Importar'],
  ['done', 'Pronto'],
];

/** Campos obrigatórios mapeados? null = ok; string = o que falta. */
function criticalMissing(entity: EntityId, m: Mapping): string | null {
  if (entity === 'contacts') return !m.phone && !m.name ? 'telefone ou nome' : null;
  if (entity === 'services') {
    if (!m.name) return 'nome do serviço';
    if (!m.durationMinutes) return 'duração';
    return null;
  }
  // appointments / history
  if (!m.serviceName) return 'serviço';
  if (!m.date) return 'data';
  if (!m.customerPhone && !m.customerName) return 'telefone ou nome do cliente';
  return null;
}

async function postJson(url: string, body: unknown): Promise<AnalyzeResult> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Falha na importação');
  return data;
}

export function ImportWizard() {
  const [step, setStep] = useState<Step>('source');
  const [parse, setParse] = useState<ParseData | null>(null);
  const [mappings, setMappings] = useState<Record<string, Mapping>>({});
  const [mapEntity, setMapEntity] = useState<EntityId>('contacts');
  const [analysis, setAnalysis] = useState<Record<string, AnalyzeResult>>({});
  const [dups, setDups] = useState<Record<string, 'merge' | 'ignore'>>({});
  const [conflicts, setConflicts] = useState<Record<string, 'skip' | 'import'>>({});
  const [barsDone, setBarsDone] = useState<Record<string, boolean>>({});
  const [importingEntity, setImportingEntity] = useState<EntityId | null>(null);
  const [commitCounts, setCommitCounts] = useState<Record<string, Counts>>({});
  const [commitErrors, setCommitErrors] = useState<
    Record<string, { row: number; error: string }[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploaded = parse !== null;
  const entities = parse?.entities ?? [];

  function reset() {
    setStep('source');
    setParse(null);
    setMappings({});
    setAnalysis({});
    setDups({});
    setConflicts({});
    setBarsDone({});
    setCommitCounts({});
    setCommitErrors({});
    setError(null);
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(list).forEach((f) => fd.append('file', f));
      const res = await fetch('/api/import/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao ler a planilha');
      const seed: Record<string, Mapping> = {};
      data.entities.forEach((i: EntityInfo) => (seed[i.entity] = i.mapping));
      setMappings(seed);
      setParse(data);
      setMapEntity(data.entities[0].entity);
      if (data.entities.some((i: EntityInfo) => i.truncated)) {
        toast.warning('Planilha grande: importando as primeiras 5.000 linhas por entidade.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao ler a planilha';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function setColumnTarget(entity: EntityId, header: string, field: string | null) {
    setMappings((prev) => {
      const m: Mapping = { ...prev[entity] };
      for (const k of Object.keys(m)) if (m[k] === header) m[k] = null;
      if (field) m[field] = header;
      return { ...prev, [entity]: m };
    });
  }

  async function runAnalyze() {
    if (!parse) return;
    // trava se alguma entidade tem campo crítico sem mapear
    for (const info of entities) {
      const miss = criticalMissing(info.entity, mappings[info.entity]);
      if (miss) {
        setMapEntity(info.entity);
        setError(`Em ${ENTITY_LABEL[info.entity]}, falta mapear: ${miss}.`);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const results: Record<string, AnalyzeResult> = {};
      await Promise.all(
        entities.map(async (info) => {
          results[info.entity] = await postJson('/api/import/analyze', {
            entity: info.entity,
            mapping: mappings[info.entity],
            rows: info.rows,
          });
        }),
      );
      setAnalysis(results);
      setStep('dedup');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao conferir';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function runCommit() {
    if (!parse) return;
    setStep('importing');
    setBarsDone({});
    setError(null);
    const order = ENTITY_ORDER.filter((e) => entities.some((i) => i.entity === e));
    const counts: Record<string, Counts> = {};
    const errs: Record<string, { row: number; error: string }[]> = {};
    const resolutions = { duplicates: dups, conflicts };
    try {
      for (const e of order) {
        setImportingEntity(e);
        const info = entities.find((x) => x.entity === e)!;
        const res = await postJson('/api/import/commit', {
          entity: e,
          mapping: mappings[e],
          rows: info.rows,
          resolutions,
        });
        counts[e] = res.counts;
        errs[e] = res.errors;
        setBarsDone((prev) => ({ ...prev, [e]: true }));
      }
      setCommitCounts(counts);
      setCommitErrors(errs);
      setStep('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao importar';
      setError(msg);
      toast.error(msg);
      setStep('dedup');
    }
  }

  // ── derivados da revisão ──
  const allPairs = useMemo(
    () => entities.flatMap((i) => analysis[i.entity]?.pairs ?? []),
    [entities, analysis],
  );
  const allConflicts = useMemo(
    () => entities.flatMap((i) => analysis[i.entity]?.conflicts ?? []),
    [entities, analysis],
  );
  const totalToImport = useMemo(
    () =>
      entities.reduce((s, i) => {
        const c = analysis[i.entity]?.counts;
        return s + (c ? c.create + c.update : 0);
      }, 0),
    [entities, analysis],
  );

  const idx = STEP_NAMES.findIndex(([s]) => s === step);

  return (
    <div className="mx-auto box-border flex w-full max-w-[900px] flex-col gap-[24px] px-[40px] pb-[80px] pt-[30px]">
      <style>{`@keyframes dm-pulse{0%{box-shadow:0 0 0 0 rgba(47,211,122,.5)}70%{box-shadow:0 0 0 8px rgba(47,211,122,0)}100%{box-shadow:0 0 0 0 rgba(47,211,122,0)}}@keyframes dm-spring{0%{transform:scale(0)}62%{transform:scale(1.14)}100%{transform:scale(1)}}`}</style>
      {/* top bar */}
      <div className="flex items-center gap-[12px]">
        <div
          onClick={reset}
          className="text-ink-50 mx-[-10px] my-[-8px] inline-flex cursor-pointer items-center gap-[6px] rounded-[10px] px-[10px] py-[8px] font-sans text-[12.5px] font-semibold leading-[1]"
        >
          <Ic size={15} sw={2.3}>
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </Ic>
          Importar
        </div>
        <div className="flex-1" />
        <div className="border-border bg-paper text-ink-50 inline-flex items-center gap-[7px] rounded-[99px] border px-[12px] py-[7px] font-sans text-[11.5px] font-semibold leading-[1]">
          <Ic size={13}>
            <rect x={3} y={3} width={18} height={18} rx={3} />
            <path d="M3 9h18M9 3v18" />
          </Ic>
          Planilha · CSV / Excel
        </div>
      </div>

      {/* stepper */}
      <Stepper current={idx} />

      {error && (
        <div className="bg-coral-tint flex items-start gap-[9px] rounded-[13px] border border-[#c2401f55] px-[15px] py-[12px] font-sans text-[13px] font-medium leading-[1.45] text-[#c2401f]">
          <Ic size={16} sw={2.2} stroke={CORAL}>
            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </Ic>
          <span>{error}</span>
        </div>
      )}

      {step === 'source' && (
        <SourceStep
          uploaded={uploaded}
          entities={entities}
          fileName={parse?.fileName ?? ''}
          loading={loading}
          helpOpen={helpOpen}
          onToggleHelp={() => setHelpOpen((v) => !v)}
          onPick={() => fileRef.current?.click()}
          onChange={handleFiles}
          onReplace={reset}
          onNext={() => setStep('map')}
          fileRef={fileRef}
        />
      )}

      {step === 'map' && parse && (
        <MapStep
          entities={entities}
          mappings={mappings}
          mapEntity={mapEntity}
          setMapEntity={setMapEntity}
          setColumnTarget={setColumnTarget}
          loading={loading}
          onBack={() => setStep('source')}
          onNext={runAnalyze}
        />
      )}

      {step === 'dedup' && (
        <DedupStep
          entities={entities}
          analysis={analysis}
          pairs={allPairs}
          conflicts={allConflicts}
          dups={dups}
          setDup={(id, v) => setDups((p) => ({ ...p, [id]: v }))}
          conflictChoices={conflicts}
          setConflict={(id, v) => {
            setConflicts((p) => ({ ...p, [id]: v }));
            if (v === 'import')
              toast.message('Vão ficar dois no mesmo horário. Só confirme se for de propósito.');
          }}
          total={totalToImport}
          onBack={() => setStep('map')}
          onImport={runCommit}
        />
      )}

      {step === 'importing' && (
        <ImportingStep entities={entities} importing={importingEntity} barsDone={barsDone} />
      )}

      {step === 'done' && (
        <DoneStep
          entities={entities}
          counts={commitCounts}
          errors={commitErrors}
          onRestart={reset}
        />
      )}
    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────────────
function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEP_NAMES.map(([, label], i) => {
        const done = i < current;
        const cur = i === current;
        const last = i === STEP_NAMES.length - 1;
        return (
          <div
            key={label}
            className={cn('flex min-w-0 items-center', last ? 'flex-none' : 'flex-1')}
          >
            <div className="flex flex-none flex-col items-center gap-[6px]">
              <div
                className={cn(
                  'box-border flex h-[30px] w-[30px] items-center justify-center rounded-[50%] border-2 font-sans text-[12px] font-bold leading-[1]',
                  done
                    ? 'border-green-deep bg-green-deep'
                    : cur
                      ? 'border-coral bg-coral'
                      : 'border-border bg-paper',
                  done || cur ? 'text-white' : 'text-ink-30',
                )}
              >
                {done ? (
                  <Ic size={15} sw={3}>
                    <CheckPath />
                  </Ic>
                ) : (
                  i + 1
                )}
              </div>
              <div
                className={cn(
                  'whitespace-nowrap font-sans text-[10.5px] font-semibold leading-[1.1]',
                  cur ? 'text-ink' : 'text-ink-50',
                )}
              >
                {label}
              </div>
            </div>
            {!last && (
              <div
                className={cn(
                  'mx-[8px] mt-[14px] h-[2px] flex-1 self-start rounded-[2px]',
                  i < current ? 'bg-green-deep' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Passo 1: Planilha / upload ────────────────────────────────────────────────────────
function SourceStep({
  uploaded,
  entities,
  fileName,
  loading,
  helpOpen,
  onToggleHelp,
  onPick,
  onChange,
  onReplace,
  onNext,
  fileRef,
}: {
  uploaded: boolean;
  entities: EntityInfo[];
  fileName: string;
  loading: boolean;
  helpOpen: boolean;
  onToggleHelp: () => void;
  onPick: () => void;
  onChange: (l: FileList | null) => void;
  onReplace: () => void;
  onNext: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <Overline>Passo 1 · Sua planilha</Overline>
        <h1 className="mt-[6px] font-serif text-[32px] font-medium leading-[1.05] tracking-[-.02em]">
          Sobe sua <em className="italic text-[#1b7a4b]">planilha</em>
        </h1>
        <div className="text-ink-70 mt-[8px] max-w-[60ch] font-sans text-[14px] font-medium leading-[1.55]">
          CSV ou Excel, de qualquer sistema. A gente lê, adivinha as colunas e te mostra tudo antes
          de salvar - sem digitar cliente por cliente, em minutos.
        </div>
      </div>

      <div className="flex flex-wrap gap-[10px]">
        <Pill tone="green">
          <Ic size={15} sw={2.4}>
            <CheckPath />
          </Ic>
          Confere cada linha
        </Pill>
        <Pill>
          <Ic size={15}>
            <circle cx={12} cy={12} r={9} />
            <path d="M12 7v5l3 2" />
          </Ic>
          Pronto em minutos
        </Pill>
        <Pill>
          <Ic size={15}>
            <path d="M12 3 4 6v6c0 4 3.4 7.4 8 9 4.6-1.6 8-5 8-9V6l-8-3z" />
          </Ic>
          Nada de tudo-ou-nada
        </Pill>
      </div>

      <div className="border-line flex items-start gap-[11px] rounded-[16px] border bg-[#fbf7ec] px-[17px] py-[15px]">
        <div className={cn(tileBase, 'bg-chip text-[#1b7a4b]')}>
          <Ic size={17}>
            <path d="M12 3 4 6v6c0 4 3.4 7.4 8 9 4.6-1.6 8-5 8-9V6l-8-3z" />
            <path d="M9 12l2 2 4-4" />
          </Ic>
        </div>
        <div className="text-ink-70 font-sans text-[13px] font-medium leading-[1.55]">
          <strong className={sb}>Manda do jeito que tá.</strong> Colunas fora de ordem, com nomes
          diferentes, colunas a mais, linhas em branco - a gente entende e você confirma no próximo
          passo. Só uma coluna de <strong className={sb}>nome</strong> e uma de{' '}
          <strong className={sb}>telefone</strong> já bastam pra começar.
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        className="hidden"
        onChange={(e) => onChange(e.target.files)}
      />

      {!uploaded ? (
        <div
          onClick={loading ? undefined : onPick}
          className={cn(
            'border-border flex flex-col items-center gap-[12px] rounded-[20px] border-2 border-dashed bg-[#fbf7ec] px-[24px] py-[40px] text-center',
            loading ? 'cursor-wait' : 'cursor-pointer',
          )}
        >
          <div className="border-line bg-paper flex h-[56px] w-[56px] items-center justify-center rounded-[16px] border text-[#1b7a4b]">
            <Ic size={26} sw={2}>
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
            </Ic>
          </div>
          <div className="text-ink font-sans text-[15px] font-semibold leading-[1.3]">
            {loading ? 'Lendo sua planilha…' : 'Arraste sua planilha aqui, ou clique pra escolher'}
          </div>
          <div className="text-ink-50 max-w-[44ch] font-sans text-[12px] font-medium leading-[1.4]">
            CSV, XLSX ou XLS · pode ser mais de um arquivo · seus dados só saem do navegador quando
            você confirmar.
          </div>
        </div>
      ) : (
        <>
          <div className={cn(card, 'px-[20px] py-[18px]')}>
            <div className="flex items-center gap-[13px]">
              <div
                className={cn(tileBase, 'bg-chip h-[42px] w-[42px] rounded-[12px] text-[#1b7a4b]')}
              >
                <Ic size={20} sw={2.2}>
                  <CheckPath />
                </Ic>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ink overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[14px] font-semibold leading-[1.25]">
                  {fileName}
                </div>
                <div className="text-ink-50 font-sans text-[12px] font-medium leading-[1.35]">
                  Planilha lida - nada foi salvo ainda
                </div>
              </div>
              <div
                onClick={onReplace}
                className="text-ink-50 flex-none cursor-pointer rounded-[10px] px-[10px] py-[8px] font-sans text-[12px] font-semibold leading-[1]"
              >
                Trocar
              </div>
            </div>
            <div className="border-border my-[15px] h-0 border-t border-dashed" />
            <Overline mb={10}>Li o seguinte na sua planilha</Overline>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[10px]">
              {entities.map((i) => (
                <div
                  key={i.entity}
                  className="border-line rounded-[14px] border bg-[#fbf7ec] px-[14px] py-[12px]"
                >
                  <div className="font-serif text-[24px] font-medium leading-[1]">
                    {i.count.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-ink-50 mt-[3px] font-sans text-[11.5px] font-medium leading-[1.3]">
                    {ENTITY_LABEL[i.entity].toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-ink-50 mt-[14px] flex items-center gap-[8px] font-sans text-[12px] font-medium leading-[1.45]">
              <Ic size={15}>
                <circle cx={12} cy={12} r={9} />
                <path d="M12 16v-4M12 8h.01" />
              </Ic>
              Coluna estranha ou faltando? No próximo passo você ajusta na mão - nada entra sem você
              ver.
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onNext} disabled={loading}>
              Conferir os campos
            </Button>
          </div>
        </>
      )}

      {/* help (self-service, sem WhatsApp) */}
      <div className="border-border border-t border-dashed pt-[14px]">
        <div
          onClick={onToggleHelp}
          className="text-ink-70 mx-[-8px] my-[-6px] inline-flex cursor-pointer items-center gap-[8px] rounded-[10px] px-[8px] py-[6px] font-sans text-[12.5px] font-semibold leading-[1]"
        >
          <Ic size={16}>
            <circle cx={12} cy={12} r={9} />
            <path d="M9.2 9a2.8 2.8 0 0 1 5.5.8c0 1.9-2.8 2.5-2.8 2.5" />
            <path d="M12 17h.01" />
          </Ic>
          Vim de outro sistema - e agora?
          <span
            className={cn(
              'inline-flex [transition:transform_.2s]',
              helpOpen ? '[transform:rotate(180deg)]' : '[transform:rotate(0deg)]',
            )}
          >
            <Ic size={15} sw={2.3}>
              <path d="M6 9l6 6 6-6" />
            </Ic>
          </span>
        </div>
        {helpOpen && (
          <div className={cn(card, 'mt-[12px] px-[20px] py-[18px]')}>
            <div className="text-ink-70 mb-[12px] font-sans text-[13px] font-medium leading-[1.55]">
              Qualquer planilha serve. Se o seu sistema atual não exporta bonito, dá pra montar do
              zero - é mais rápido do que parece.
            </div>
            <div className="flex flex-col gap-[11px]">
              {[
                <>
                  No sistema antigo, procure <strong className={sb}>Exportar</strong> ou{' '}
                  <strong className={sb}>Relatórios</strong> e salve em CSV ou Excel.
                </>,
                <>
                  Não tem exportação? Copie os clientes do painel antigo pra uma planilha -{' '}
                  <strong className={sb}>uma linha por pessoa</strong>.
                </>,
                <>
                  O que não pode faltar: uma coluna de <strong className={sb}>nome</strong> e uma de{' '}
                  <strong className={sb}>telefone</strong>. Preço, serviço e datas são bônus.
                </>,
              ].map((txt, n) => (
                <div key={n} className="flex items-start gap-[12px]">
                  <div className={stepNum}>{n + 1}</div>
                  <div className="text-ink-70 font-sans text-[13px] font-medium leading-[1.5]">
                    {txt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Passo 2: Conferir campos ──────────────────────────────────────────────────────────
function MapStep({
  entities,
  mappings,
  mapEntity,
  setMapEntity,
  setColumnTarget,
  loading,
  onBack,
  onNext,
}: {
  entities: EntityInfo[];
  mappings: Record<string, Mapping>;
  mapEntity: EntityId;
  setMapEntity: (e: EntityId) => void;
  setColumnTarget: (e: EntityId, header: string, field: string | null) => void;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const info = entities.find((i) => i.entity === mapEntity)!;
  const m = mappings[mapEntity];
  const fields = ENTITY_FIELDS[mapEntity];
  const fieldOfHeader = (h: string) => fields.find((f) => m[f.id] === h)?.id ?? '';
  const blocked = entities.some((i) => criticalMissing(i.entity, mappings[i.entity]));

  return (
    <div className="flex flex-col gap-[16px]">
      <div>
        <Overline>Passo 2 · Conferir campos</Overline>
        <h1 className="mt-[6px] font-serif text-[28px] font-medium leading-[1.08] tracking-[-.02em]">
          Adivinhei as colunas <em className="italic text-[#1b7a4b]">pra você</em>
        </h1>
        <div className="text-ink-50 mt-[4px] font-sans text-[13px] font-medium leading-[1.5]">
          Li o cabeçalho e associei cada coluna a um campo. Confere e corrige o que eu errei - cada
          coluna vira um campo, ou fica de fora.
        </div>
      </div>

      <div className="border-line text-ink-70 flex items-center gap-[9px] rounded-[13px] border bg-[#fbf7ec] px-[15px] py-[12px] font-sans text-[12px] font-medium leading-[1.45]">
        <Ic size={16} sw={2.2} stroke={GREEN}>
          <CheckPath />
        </Ic>
        Já limpei o que dava: ignorei colunas vazias e linhas em branco automaticamente.
      </div>

      {/* tabs por entidade */}
      <div className="flex flex-wrap gap-[8px]">
        {entities.map((i) => {
          const on = i.entity === mapEntity;
          const warn = !!criticalMissing(i.entity, mappings[i.entity]);
          return (
            <div
              key={i.entity}
              onClick={() => setMapEntity(i.entity)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-[8px] rounded-[99px] border-[1.5px] px-[14px] py-[9px] font-sans text-[12.5px] font-semibold leading-[1]',
                on
                  ? 'border-green-deep bg-green-deep text-on-emerald'
                  : 'border-border bg-paper text-ink-70',
              )}
            >
              {ENTITY_LABEL[i.entity]}
              <span className="font-sans text-[11px] font-semibold leading-[1] opacity-70">
                {i.count.toLocaleString('pt-BR')}
              </span>
              {warn && <span className="bg-coral h-[7px] w-[7px] rounded-[50%]" />}
            </div>
          );
        })}
      </div>

      {/* tabela de-para */}
      <div className={cn(card, 'overflow-hidden')}>
        <div className="border-line grid grid-cols-[1fr_24px_1fr] border-b bg-[#fbf7ec] px-[18px] py-[11px]">
          <div className="text-ink-50 font-sans text-[10px] font-bold uppercase leading-[1.2] tracking-[.1em]">
            Coluna na sua planilha
          </div>
          <div />
          <div className="text-ink-50 font-sans text-[10px] font-bold uppercase leading-[1.2] tracking-[.1em]">
            Campo no Demandaê
          </div>
        </div>
        {info.headers.map((h) => {
          const target = fieldOfHeader(h);
          const samples = info.rows
            .slice(0, 3)
            .map((r) => r[h])
            .filter(Boolean)
            .slice(0, 2)
            .join(' · ');
          return (
            <div
              key={h}
              className="border-border grid grid-cols-[1fr_24px_1fr] items-center border-t border-dotted px-[18px] py-[11px]"
            >
              <div className="min-w-0">
                <div className="text-ink overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[13.5px] font-semibold leading-[1.25]">
                  {h}
                </div>
                {samples && (
                  <div className="text-ink-30 overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[11.5px] font-medium leading-[1.3]">
                    ex: {samples}
                  </div>
                )}
              </div>
              <div className="text-ink-30 flex justify-center">
                <Ic size={16} sw={2.2}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </Ic>
              </div>
              <div className="flex min-w-0 items-center gap-[8px]">
                {target ? (
                  <Ic size={15} sw={2.4} stroke={GREEN}>
                    <CheckPath />
                  </Ic>
                ) : (
                  <span className="w-[15px] flex-none" />
                )}
                <select
                  value={target}
                  onChange={(e) => setColumnTarget(mapEntity, h, e.target.value || null)}
                  className={cn(
                    'border-border h-[38px] min-w-0 flex-1 rounded-[10px] border px-[10px] font-sans text-[13px] font-semibold leading-[1] outline-none',
                    target ? 'bg-paper text-ink' : 'text-ink-50 bg-[#fbf7ec]',
                  )}
                >
                  <option value="">Ignorar esta coluna</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-[12px]">
        <div
          className={cn(
            'min-w-[200px] flex-1 font-sans text-[12px] font-medium leading-[1.45]',
            blocked ? 'text-[#c2401f]' : 'text-ink-50',
          )}
        >
          {blocked
            ? 'Uma entidade ainda tem campo obrigatório sem destino (bolinha coral na aba).'
            : 'Tudo mapeado. Se algo tiver errado, é só trocar o campo da coluna.'}
        </div>
        <div
          onClick={onBack}
          className="text-ink-70 cursor-pointer rounded-[99px] px-[16px] py-[12px] font-sans text-[12.5px] font-semibold leading-[1]"
        >
          Voltar
        </div>
        <Button onClick={onNext} disabled={loading || blocked}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

// ─── Passo 3: Revisar (duplicados + conflitos) ──────────────────────────────────────────
function DedupStep({
  entities,
  analysis,
  pairs,
  conflicts,
  dups,
  setDup,
  conflictChoices,
  setConflict,
  total,
  onBack,
  onImport,
}: {
  entities: EntityInfo[];
  analysis: Record<string, AnalyzeResult>;
  pairs: AnalyzeResult['pairs'];
  conflicts: AnalyzeResult['conflicts'];
  dups: Record<string, 'merge' | 'ignore'>;
  setDup: (id: string, v: 'merge' | 'ignore') => void;
  conflictChoices: Record<string, 'skip' | 'import'>;
  setConflict: (id: string, v: 'skip' | 'import') => void;
  total: number;
  onBack: () => void;
  onImport: () => void;
}) {
  const checked = entities.reduce((s, i) => {
    const c = analysis[i.entity]?.counts;
    return s + (c ? c.create + c.update : 0);
  }, 0);
  return (
    <div className="flex flex-col gap-[16px]">
      <div>
        <Overline>Passo 3 · Revisar</Overline>
        <h1 className="mt-[6px] font-serif text-[28px] font-medium leading-[1.08] tracking-[-.02em]">
          Conferi cada linha <em className="italic text-[#1b7a4b]">pra você</em>
        </h1>
      </div>

      <div className="bg-green-deep text-on-emerald flex items-center gap-[13px] rounded-[16px] px-[18px] py-[16px]">
        <div
          className={cn(
            tileBase,
            'text-green-bright h-[38px] w-[38px] rounded-[11px] bg-[rgba(47,211,122,.18)]',
          )}
        >
          <Ic size={20} sw={2.2}>
            <CheckPath />
          </Ic>
        </div>
        <div className="text-on-emerald font-sans text-[13.5px] font-medium leading-[1.5]">
          <strong className="font-bold">{checked.toLocaleString('pt-BR')} registros</strong> foram
          conferidos.{' '}
          {pairs.length > 0 || conflicts.length > 0 ? (
            <>
              Achei{' '}
              {pairs.length > 0 && (
                <strong className="text-green-bright font-bold">
                  {pairs.length}{' '}
                  {pairs.length === 1 ? 'possível duplicado' : 'possíveis duplicados'}
                </strong>
              )}
              {pairs.length > 0 && conflicts.length > 0 && ' e '}
              {conflicts.length > 0 && (
                <strong className="text-green-bright font-bold">
                  {conflicts.length}{' '}
                  {conflicts.length === 1 ? 'conflito de horário' : 'conflitos de horário'}
                </strong>
              )}
              . Você decide o que fazer com cada um.
            </>
          ) : (
            <>Nenhum duplicado ou conflito. Pode importar com tranquilidade.</>
          )}
        </div>
      </div>

      {pairs.length > 0 && (
        <>
          <Overline mt={4}>Clientes duplicados</Overline>
          {pairs.map((d) => {
            const cur = dups[d.id] ?? 'merge';
            return (
              <div key={d.id} className={cn(card, 'px-[20px] py-[18px]')}>
                <div className="text-ink-50 mb-[12px] font-sans text-[12px] font-medium leading-[1.4]">
                  {d.reason}
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-[12px]">
                  <DupSide tag={d.leftTag} name={d.leftName} meta={d.leftMeta} />
                  <DupSide tag={d.rightTag} name={d.rightName} meta={d.rightMeta} />
                </div>
                <div className="mt-[13px] flex flex-wrap gap-[8px]">
                  <ChoiceChip
                    on={cur === 'merge'}
                    onClick={() => setDup(d.id, 'merge')}
                    hint="recomendado"
                  >
                    Mesclar
                  </ChoiceChip>
                  <ChoiceChip on={cur === 'ignore'} onClick={() => setDup(d.id, 'ignore')}>
                    Ignorar o da planilha
                  </ChoiceChip>
                </div>
              </div>
            );
          })}
        </>
      )}

      {conflicts.length > 0 && (
        <>
          <Overline mt={8}>Conflitos de agendamento</Overline>
          {conflicts.map((c) => {
            const cur = conflictChoices[c.id] ?? 'skip';
            return (
              <div
                key={c.id}
                className={cn(
                  card,
                  'border-coral border px-[20px] py-[18px] shadow-[0_2px_10px_rgba(255,90,54,.08)]',
                )}
              >
                <div className="mb-[11px] flex items-center gap-[9px]">
                  <div
                    className={cn(
                      tileBase,
                      'bg-coral-tint h-[30px] w-[30px] rounded-[9px] text-[#c2401f]',
                    )}
                  >
                    <Ic size={16} sw={2.3}>
                      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    </Ic>
                  </div>
                  <div className="text-ink font-sans text-[14.5px] font-semibold leading-[1.2]">
                    {c.when}
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-[12px]">
                  <DupSide tag="Na planilha" name={c.incomingLabel} meta={c.incomingMeta} bold />
                  <DupSide
                    tag="Já na sua agenda"
                    name={c.existingLabel}
                    meta={c.existingMeta}
                    bold
                  />
                </div>
                <div className="text-ink-50 mt-[11px] font-sans text-[12px] font-medium leading-[1.45]">
                  A gente não marca dois no mesmo horário. Como resolve?
                </div>
                <div className="mt-[10px] flex flex-wrap gap-[8px]">
                  <ChoiceChip
                    on={cur === 'skip'}
                    onClick={() => setConflict(c.id, 'skip')}
                    hint="recomendado"
                  >
                    Pular esse
                  </ChoiceChip>
                  <ChoiceChip
                    on={cur === 'import'}
                    danger
                    onClick={() => setConflict(c.id, 'import')}
                  >
                    Importar assim mesmo
                  </ChoiceChip>
                </div>
              </div>
            );
          })}
        </>
      )}

      <div className="mt-[6px] flex items-center gap-[12px]">
        <div
          onClick={onBack}
          className="text-ink-70 cursor-pointer rounded-[99px] px-[16px] py-[12px] font-sans text-[12.5px] font-semibold leading-[1]"
        >
          Voltar
        </div>
        <div className="flex-1" />
        <Button onClick={onImport}>Importar {total.toLocaleString('pt-BR')} registros</Button>
      </div>
    </div>
  );
}

function DupSide({
  tag,
  name,
  meta,
  bold,
}: {
  tag: string;
  name: string;
  meta: string;
  bold?: boolean;
}) {
  return (
    <div className="border-line rounded-[14px] border bg-[#fbf7ec] px-[15px] py-[13px]">
      <div className="text-ink-50 mb-[7px] font-sans text-[9.5px] font-bold uppercase leading-[1] tracking-[.1em]">
        {tag}
      </div>
      <div
        className={
          bold
            ? 'font-sans text-[14px] font-semibold leading-[1.2]'
            : 'font-serif text-[15px] font-semibold leading-[1.2]'
        }
      >
        {name}
      </div>
      <div className="text-ink-50 mt-[3px] font-sans text-[12px] font-medium leading-[1.4]">
        {meta}
      </div>
    </div>
  );
}

// ─── Passo 4: Importando ────────────────────────────────────────────────────────────────
function ImportingStep({
  entities,
  importing,
  barsDone,
}: {
  entities: EntityInfo[];
  importing: EntityId | null;
  barsDone: Record<string, boolean>;
}) {
  const order = ENTITY_ORDER.filter((e) => entities.some((i) => i.entity === e));
  const doneCount = order.filter((e) => barsDone[e]).length;
  const line =
    doneCount === order.length
      ? 'Quase lá…'
      : importing
        ? `Trazendo ${ENTITY_LABEL[importing].toLowerCase()}…`
        : 'Lendo sua planilha com cuidado…';
  return (
    <div className="flex flex-col items-center gap-[20px] pt-[12px] text-center">
      <div className="bg-green-deep text-green-bright flex h-[64px] w-[64px] items-center justify-center rounded-[20px] shadow-[0_12px_30px_rgba(10,51,36,.22)]">
        <span className="inline-flex animate-[dm-pulse_1.8s_infinite] rounded-[50%]">
          <Ic size={30} sw={2}>
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M4 21h16" />
          </Ic>
        </span>
      </div>
      <div>
        <div className="font-serif text-[26px] font-medium leading-[1.1] tracking-[-.02em]">
          {line}
        </div>
        <div className="text-ink-50 mt-[6px] font-serif text-[14px] font-normal italic leading-[1.4]">
          só um instante - guardando tudo com cuidado
        </div>
      </div>
      <div className="mt-[4px] flex w-full max-w-[520px] flex-col gap-[14px]">
        {order.map((e) => {
          const info = entities.find((i) => i.entity === e)!;
          const done = barsDone[e];
          const active = importing === e && !done;
          const pct = done ? 100 : active ? 65 : 0;
          return (
            <div
              key={e}
              className={cn(
                card,
                'px-[16px] py-[14px] text-left shadow-[0_2px_8px_rgba(10,51,36,.04)]',
              )}
            >
              <div className="mb-[9px] flex items-center justify-between">
                <div className="text-ink flex items-center gap-[8px] font-sans text-[13px] font-semibold leading-[1.2]">
                  {done && (
                    <span className="bg-chip flex h-[16px] w-[16px] items-center justify-center rounded-[50%] text-[#1b7a4b]">
                      <Ic size={10} sw={3.2}>
                        <CheckPath />
                      </Ic>
                    </span>
                  )}
                  {ENTITY_LABEL[e]}
                </div>
                <div className="text-ink-50 font-sans text-[12px] font-semibold leading-[1]">
                  {done
                    ? `${info.count.toLocaleString('pt-BR')} / ${info.count.toLocaleString('pt-BR')}`
                    : active
                      ? '…'
                      : `0 / ${info.count.toLocaleString('pt-BR')}`}
                </div>
              </div>
              <div className="h-[8px] overflow-hidden rounded-[99px] bg-[#efe9d8]">
                <div
                  className="h-full rounded-[99px] bg-[linear-gradient(90deg,#1b7a4b,var(--green))] [transition:width_.3s_ease]"
                  // ponytail: runtime, Tailwind nao gera
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Passo 5: Pronto ────────────────────────────────────────────────────────────────────
function DoneStep({
  entities,
  counts,
  errors,
  onRestart,
}: {
  entities: EntityInfo[];
  counts: Record<string, Counts>;
  errors: Record<string, { row: number; error: string }[]>;
  onRestart: () => void;
}) {
  const order = ENTITY_ORDER.filter((e) => entities.some((i) => i.entity === e));
  const total = order.reduce((s, e) => {
    const c = counts[e];
    return s + (c ? c.create + c.update : 0);
  }, 0);
  const dest: Partial<Record<EntityId, { href: string; label: string; meta: string }>> = {
    contacts: { href: '/clients', label: 'Ver meus clientes', meta: 'recém-chegados' },
    services: { href: '/services', label: 'Revisar serviços', meta: 'confira preço e duração' },
    appointments: { href: '/appointments', label: 'Conferir horários', meta: 'na agenda' },
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col items-center gap-[12px] pt-[6px] text-center">
        <div className="bg-green-bright flex h-[72px] w-[72px] animate-[dm-spring_.6s_cubic-bezier(.34,1.56,.64,1)] items-center justify-center rounded-[50%] shadow-[0_12px_30px_rgba(47,211,122,.35)]">
          <Ic size={36} sw={2.6} stroke="var(--emerald)">
            <CheckPath />
          </Ic>
        </div>
        <h1 className="mt-[6px] font-serif text-[32px] font-medium leading-[1.06] tracking-[-.02em]">
          Tá tudo <em className="italic text-[#1b7a4b]">aqui</em>
        </h1>
        <div className="text-ink-70 max-w-[50ch] font-sans text-[14px] font-medium leading-[1.5]">
          Conferi cada linha. {total.toLocaleString('pt-BR')} registros do seu sistema antigo agora
          são seus, aqui no Demandaê.
        </div>
      </div>

      <div className={cn(card, 'overflow-hidden')}>
        {order.map((e) => {
          const c = counts[e] ?? { create: 0, update: 0, skip: 0, error: 0 };
          const errCount = errors[e]?.length ?? 0;
          const parts = [
            `${c.create.toLocaleString('pt-BR')} novos`,
            c.update > 0 ? `${c.update} atualizados` : '',
            c.skip > 0 ? `${c.skip} pulados` : '',
          ].filter(Boolean);
          const ok = errCount === 0;
          return (
            <div
              key={e}
              className="border-border flex items-center gap-[13px] border-t border-dotted px-[18px] py-[14px]"
            >
              <div
                className={cn(
                  tileBase,
                  'h-[34px] w-[34px] rounded-[10px]',
                  ok ? 'bg-chip text-[#1b7a4b]' : 'bg-coral-tint text-[#c2401f]',
                )}
              >
                {entityIcon[e]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ink font-sans text-[14px] font-semibold leading-[1.25]">
                  {ENTITY_LABEL[e]}
                </div>
                <div
                  className={cn(
                    'font-sans text-[12.5px] font-medium leading-[1.4]',
                    ok ? 'text-ink-50' : 'text-[#c2401f]',
                  )}
                >
                  {parts.join(' · ')}
                  {errCount > 0 && ` · ${errCount} de fora`}
                </div>
              </div>
              {ok ? (
                <span className="bg-chip flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[50%] text-[#1b7a4b]">
                  <Ic size={13} sw={3}>
                    <CheckPath />
                  </Ic>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div>
        <Overline mb={10}>Bora deixar redondo</Overline>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[12px]">
          {order
            .filter((e) => dest[e])
            .map((e) => {
              const d = dest[e]!;
              const c = counts[e];
              const n = c ? c.create + c.update : 0;
              return (
                <Link key={e} href={d.href} className="text-inherit no-underline">
                  <div className={cn(card, 'cursor-pointer p-[16px]')}>
                    <div
                      className={cn(
                        tileBase,
                        'bg-chip mb-[10px] h-[36px] w-[36px] rounded-[11px] text-[#1b7a4b]',
                      )}
                    >
                      {entityIcon[e]}
                    </div>
                    <div className="text-ink font-sans text-[14px] font-semibold leading-[1.2]">
                      {d.label}
                    </div>
                    <div className="text-ink-50 mt-[2px] font-sans text-[12px] font-medium leading-[1.4]">
                      {n.toLocaleString('pt-BR')} {d.meta}
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      </div>

      <div className="border-line text-ink-70 flex items-center gap-[10px] rounded-[14px] border bg-[#fbf7ec] px-[16px] py-[14px] font-sans text-[12.5px] font-medium leading-[1.5]">
        <Ic size={17} stroke={GREEN}>
          <path d="M12 3 4 6v6c0 4 3.4 7.4 8 9 4.6-1.6 8-5 8-9V6l-8-3z" />
          <path d="M9 12l2 2 4-4" />
        </Ic>
        Nada foi salvo em cima do que você já tinha. Quiser importar outra planilha, é só começar de
        novo.
      </div>
      <div className="flex justify-center">
        <div
          onClick={onRestart}
          className="text-ink-50 cursor-pointer rounded-[99px] px-[18px] py-[12px] font-sans text-[12.5px] font-semibold leading-[1]"
        >
          Importar outra planilha
        </div>
      </div>
    </div>
  );
}

// ─── helpers de UI ──────────────────────────────────────────────────────────────────────
const sb = 'font-bold text-ink';
const tileBase = 'flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[10px]';
const stepNum =
  'flex h-[24px] w-[24px] flex-none items-center justify-center rounded-[50%] bg-chip font-sans text-[11px] leading-[1] font-bold text-[#1b7a4b]';

function Overline({ children, mt, mb }: { children: React.ReactNode; mt?: number; mb?: number }) {
  return (
    <div
      className="text-ink-50 font-sans text-[11px] font-bold uppercase leading-[1.3] tracking-[.14em]"
      // ponytail: runtime, Tailwind nao gera
      style={{ marginTop: mt, marginBottom: mb }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: 'green' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[8px] rounded-[99px] px-[14px] py-[9px] font-sans text-[12.5px] font-semibold leading-[1]',
        tone === 'green' ? 'bg-chip text-[#14513a]' : 'border-border bg-paper text-ink-70 border',
      )}
    >
      {children}
    </div>
  );
}

function ChoiceChip({
  children,
  on,
  danger,
  hint,
  onClick,
}: {
  children: React.ReactNode;
  on: boolean;
  danger?: boolean;
  hint?: string;
  onClick: () => void;
}) {
  const tone = on
    ? danger
      ? 'border-coral bg-coral-tint text-[#c2401f]'
      : 'border-green-deep bg-chip text-[#14513a]'
    : 'border-border bg-paper text-ink-70';
  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[99px] border-[1.5px] px-[14px] py-[10px] font-sans text-[12px] font-semibold leading-[1]',
        tone,
      )}
    >
      {children}
      {hint && (
        <span className="font-sans text-[10px] font-semibold leading-[1] opacity-70">· {hint}</span>
      )}
    </div>
  );
}
