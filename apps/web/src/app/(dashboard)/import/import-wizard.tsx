'use client';

// Wizard de importação - fiel ao protótipo Claude Design "Importar Dados" (v2: planilha
// CSV/Excel, self-service, sem toque humano). 5 passos: Planilha/upload -> Conferir campos
// (abas por entidade) -> Revisar (duplicados + conflitos) -> Importando -> Pronto.
// Ligado aos endpoints reais /api/import/{parse,analyze,commit}. Estilos inline portados
// do design (famílias trocadas por var(--font-serif/sans), que é como o next/font expõe).

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

// ─── tokens de estilo ────────────────────────────────────────────────────────────────
const serif = (spec: string) => `${spec} var(--font-serif)`;
const sans = (spec: string) => `${spec} var(--font-sans)`;
const GREEN = '#1b7a4b';
const CORAL = '#c2401f';
const PANEL = '#fbf7ec';
const card: React.CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--border-soft)',
  borderRadius: 18,
  boxShadow: '0 2px 10px rgba(10,51,36,.05)',
};

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
      style={{ flex: 'none' }}
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
    <div
      style={{
        maxWidth: 900,
        boxSizing: 'border-box',
        width: '100%',
        margin: '0 auto',
        padding: '30px 40px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <style>{`@keyframes dm-pulse{0%{box-shadow:0 0 0 0 rgba(47,211,122,.5)}70%{box-shadow:0 0 0 8px rgba(47,211,122,0)}100%{box-shadow:0 0 0 0 rgba(47,211,122,0)}}@keyframes dm-spring{0%{transform:scale(0)}62%{transform:scale(1.14)}100%{transform:scale(1)}}`}</style>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          onClick={reset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            font: sans('600 12.5px/1'),
            color: 'var(--ink-50)',
            cursor: 'pointer',
            padding: '8px 10px',
            margin: '-8px -10px',
            borderRadius: 10,
          }}
        >
          <Ic size={15} sw={2.3}>
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </Ic>
          Importar
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            font: sans('600 11.5px/1'),
            color: 'var(--ink-50)',
            padding: '7px 12px',
            borderRadius: 99,
            background: 'var(--paper)',
            border: '1px solid var(--border)',
          }}
        >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 9,
            padding: '12px 15px',
            borderRadius: 13,
            border: `1px solid ${CORAL}55`,
            background: 'var(--coral-tint)',
            font: sans('500 13px/1.45'),
            color: CORAL,
          }}
        >
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STEP_NAMES.map(([, label], i) => {
        const done = i < current;
        const cur = i === current;
        const last = i === STEP_NAMES.length - 1;
        return (
          <div
            key={label}
            style={{ display: 'flex', alignItems: 'center', flex: last ? 'none' : 1, minWidth: 0 }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                flex: 'none',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  background: done ? 'var(--emerald)' : cur ? 'var(--coral)' : 'var(--paper)',
                  border: `2px solid ${done ? 'var(--emerald)' : cur ? 'var(--coral)' : 'var(--border)'}`,
                  color: done || cur ? '#fff' : 'var(--ink-30)',
                  font: sans('700 12px/1'),
                }}
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
                style={{
                  font: sans('600 10.5px/1.1'),
                  color: cur ? 'var(--ink)' : 'var(--ink-50)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            </div>
            {!last && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: '0 8px',
                  borderRadius: 2,
                  background: i < current ? 'var(--emerald)' : 'var(--border)',
                  alignSelf: 'flex-start',
                  marginTop: 14,
                }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <Overline>Passo 1 · Sua planilha</Overline>
        <h1 style={{ margin: '6px 0 0', font: serif('500 32px/1.05'), letterSpacing: '-.02em' }}>
          Sobe sua <em style={{ fontStyle: 'italic', color: GREEN }}>planilha</em>
        </h1>
        <div
          style={{
            font: sans('500 14px/1.55'),
            color: 'var(--ink-70)',
            marginTop: 8,
            maxWidth: '60ch',
          }}
        >
          CSV ou Excel, de qualquer sistema. A gente lê, adivinha as colunas e te mostra tudo antes
          de salvar - sem digitar cliente por cliente, em minutos.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 11,
          padding: '15px 17px',
          border: '1px solid var(--border-soft)',
          borderRadius: 16,
          background: PANEL,
        }}
      >
        <div style={{ ...tileBase, background: 'var(--green-tint)', color: GREEN }}>
          <Ic size={17}>
            <path d="M12 3 4 6v6c0 4 3.4 7.4 8 9 4.6-1.6 8-5 8-9V6l-8-3z" />
            <path d="M9 12l2 2 4-4" />
          </Ic>
        </div>
        <div style={{ font: sans('500 13px/1.55'), color: 'var(--ink-70)' }}>
          <strong style={{ fontWeight: 700, color: 'var(--ink)' }}>Manda do jeito que tá.</strong>{' '}
          Colunas fora de ordem, com nomes diferentes, colunas a mais, linhas em branco - a gente
          entende e você confirma no próximo passo. Só uma coluna de{' '}
          <strong style={{ fontWeight: 700, color: 'var(--ink)' }}>nome</strong> e uma de{' '}
          <strong style={{ fontWeight: 700, color: 'var(--ink)' }}>telefone</strong> já bastam pra
          começar.
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files)}
      />

      {!uploaded ? (
        <div
          onClick={loading ? undefined : onPick}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 20,
            padding: '40px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
            cursor: loading ? 'wait' : 'pointer',
            background: PANEL,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: GREEN,
            }}
          >
            <Ic size={26} sw={2}>
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
            </Ic>
          </div>
          <div style={{ font: sans('600 15px/1.3'), color: 'var(--ink)' }}>
            {loading ? 'Lendo sua planilha…' : 'Arraste sua planilha aqui, ou clique pra escolher'}
          </div>
          <div style={{ font: sans('500 12px/1.4'), color: 'var(--ink-50)', maxWidth: '44ch' }}>
            CSV, XLSX ou XLS · pode ser mais de um arquivo · seus dados só saem do navegador quando
            você confirmar.
          </div>
        </div>
      ) : (
        <>
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div
                style={{
                  ...tileBase,
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'var(--green-tint)',
                  color: GREEN,
                }}
              >
                <Ic size={20} sw={2.2}>
                  <CheckPath />
                </Ic>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    font: sans('600 14px/1.25'),
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {fileName}
                </div>
                <div style={{ font: sans('500 12px/1.35'), color: 'var(--ink-50)' }}>
                  Planilha lida - nada foi salvo ainda
                </div>
              </div>
              <div
                onClick={onReplace}
                style={{
                  flex: 'none',
                  font: sans('600 12px/1'),
                  color: 'var(--ink-50)',
                  cursor: 'pointer',
                  padding: '8px 10px',
                  borderRadius: 10,
                }}
              >
                Trocar
              </div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border)', margin: '15px 0', height: 0 }} />
            <Overline mb={10}>Li o seguinte na sua planilha</Overline>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
                gap: 10,
              }}
            >
              {entities.map((i) => (
                <div
                  key={i.entity}
                  style={{
                    background: PANEL,
                    border: '1px solid var(--border-soft)',
                    borderRadius: 14,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ font: serif('500 24px/1') }}>{i.count.toLocaleString('pt-BR')}</div>
                  <div
                    style={{ font: sans('500 11.5px/1.3'), color: 'var(--ink-50)', marginTop: 3 }}
                  >
                    {ENTITY_LABEL[i.entity].toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 14,
                font: sans('500 12px/1.45'),
                color: 'var(--ink-50)',
              }}
            >
              <Ic size={15}>
                <circle cx={12} cy={12} r={9} />
                <path d="M12 16v-4M12 8h.01" />
              </Ic>
              Coluna estranha ou faltando? No próximo passo você ajusta na mão - nada entra sem você
              ver.
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onNext} disabled={loading}>
              Conferir os campos
            </Button>
          </div>
        </>
      )}

      {/* help (self-service, sem WhatsApp) */}
      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 14 }}>
        <div
          onClick={onToggleHelp}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            font: sans('600 12.5px/1'),
            color: 'var(--ink-70)',
            cursor: 'pointer',
            padding: '6px 8px',
            margin: '-6px -8px',
            borderRadius: 10,
          }}
        >
          <Ic size={16}>
            <circle cx={12} cy={12} r={9} />
            <path d="M9.2 9a2.8 2.8 0 0 1 5.5.8c0 1.9-2.8 2.5-2.8 2.5" />
            <path d="M12 17h.01" />
          </Ic>
          Vim de outro sistema - e agora?
          <span
            style={{
              transform: `rotate(${helpOpen ? 180 : 0}deg)`,
              transition: 'transform .2s',
              display: 'inline-flex',
            }}
          >
            <Ic size={15} sw={2.3}>
              <path d="M6 9l6 6 6-6" />
            </Ic>
          </span>
        </div>
        {helpOpen && (
          <div style={{ ...card, marginTop: 12, padding: '18px 20px' }}>
            <div style={{ font: sans('500 13px/1.55'), color: 'var(--ink-70)', marginBottom: 12 }}>
              Qualquer planilha serve. Se o seu sistema atual não exporta bonito, dá pra montar do
              zero - é mais rápido do que parece.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[
                <>
                  No sistema antigo, procure <strong style={sb}>Exportar</strong> ou{' '}
                  <strong style={sb}>Relatórios</strong> e salve em CSV ou Excel.
                </>,
                <>
                  Não tem exportação? Copie os clientes do painel antigo pra uma planilha -{' '}
                  <strong style={sb}>uma linha por pessoa</strong>.
                </>,
                <>
                  O que não pode faltar: uma coluna de <strong style={sb}>nome</strong> e uma de{' '}
                  <strong style={sb}>telefone</strong>. Preço, serviço e datas são bônus.
                </>,
              ].map((txt, n) => (
                <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ ...stepNum }}>{n + 1}</div>
                  <div style={{ font: sans('500 13px/1.5'), color: 'var(--ink-70)' }}>{txt}</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Overline>Passo 2 · Conferir campos</Overline>
        <h1 style={{ margin: '6px 0 0', font: serif('500 28px/1.08'), letterSpacing: '-.02em' }}>
          Adivinhei as colunas <em style={{ fontStyle: 'italic', color: GREEN }}>pra você</em>
        </h1>
        <div style={{ font: sans('500 13px/1.5'), color: 'var(--ink-50)', marginTop: 4 }}>
          Li o cabeçalho e associei cada coluna a um campo. Confere e corrige o que eu errei - cada
          coluna vira um campo, ou fica de fora.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '12px 15px',
          border: '1px solid var(--border-soft)',
          borderRadius: 13,
          background: PANEL,
          font: sans('500 12px/1.45'),
          color: 'var(--ink-70)',
        }}
      >
        <Ic size={16} sw={2.2} stroke={GREEN}>
          <CheckPath />
        </Ic>
        Já limpei o que dava: ignorei colunas vazias e linhas em branco automaticamente.
      </div>

      {/* tabs por entidade */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {entities.map((i) => {
          const on = i.entity === mapEntity;
          const warn = !!criticalMissing(i.entity, mappings[i.entity]);
          return (
            <div
              key={i.entity}
              onClick={() => setMapEntity(i.entity)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                borderRadius: 99,
                cursor: 'pointer',
                font: sans('600 12.5px/1'),
                background: on ? 'var(--emerald)' : 'var(--paper)',
                color: on ? 'var(--on-emerald)' : 'var(--ink-70)',
                border: `1.5px solid ${on ? 'var(--emerald)' : 'var(--border)'}`,
              }}
            >
              {ENTITY_LABEL[i.entity]}
              <span style={{ font: sans('600 11px/1'), opacity: 0.7 }}>
                {i.count.toLocaleString('pt-BR')}
              </span>
              {warn && (
                <span
                  style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--coral)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* tabela de-para */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 24px 1fr',
            padding: '11px 18px',
            background: PANEL,
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <div
            style={{
              font: sans('700 10px/1.2'),
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-50)',
            }}
          >
            Coluna na sua planilha
          </div>
          <div />
          <div
            style={{
              font: sans('700 10px/1.2'),
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-50)',
            }}
          >
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
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 24px 1fr',
                alignItems: 'center',
                padding: '11px 18px',
                borderTop: '1px dotted var(--border)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    font: sans('600 13.5px/1.25'),
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {h}
                </div>
                {samples && (
                  <div
                    style={{
                      font: sans('500 11.5px/1.3'),
                      color: 'var(--ink-30)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    ex: {samples}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--ink-30)' }}>
                <Ic size={16} sw={2.2}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </Ic>
              </div>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {target ? (
                  <Ic size={15} sw={2.4} stroke={GREEN}>
                    <CheckPath />
                  </Ic>
                ) : (
                  <span style={{ width: 15, flex: 'none' }} />
                )}
                <select
                  value={target}
                  onChange={(e) => setColumnTarget(mapEntity, h, e.target.value || null)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 38,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: target ? 'var(--paper)' : PANEL,
                    padding: '0 10px',
                    font: sans('600 13px/1'),
                    color: target ? 'var(--ink)' : 'var(--ink-50)',
                    outline: 'none',
                  }}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1,
            minWidth: 200,
            font: sans('500 12px/1.45'),
            color: blocked ? CORAL : 'var(--ink-50)',
          }}
        >
          {blocked
            ? 'Uma entidade ainda tem campo obrigatório sem destino (bolinha coral na aba).'
            : 'Tudo mapeado. Se algo tiver errado, é só trocar o campo da coluna.'}
        </div>
        <div
          onClick={onBack}
          style={{
            font: sans('600 12.5px/1'),
            color: 'var(--ink-70)',
            padding: '12px 16px',
            borderRadius: 99,
            cursor: 'pointer',
          }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Overline>Passo 3 · Revisar</Overline>
        <h1 style={{ margin: '6px 0 0', font: serif('500 28px/1.08'), letterSpacing: '-.02em' }}>
          Conferi cada linha <em style={{ fontStyle: 'italic', color: GREEN }}>pra você</em>
        </h1>
      </div>

      <div
        style={{
          background: 'var(--emerald)',
          color: 'var(--on-emerald)',
          borderRadius: 16,
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 13,
        }}
      >
        <div
          style={{
            ...tileBase,
            width: 38,
            height: 38,
            borderRadius: 11,
            background: 'rgba(47,211,122,.18)',
            color: 'var(--green)',
          }}
        >
          <Ic size={20} sw={2.2}>
            <CheckPath />
          </Ic>
        </div>
        <div style={{ font: sans('500 13.5px/1.5'), color: 'var(--on-emerald)' }}>
          <strong style={{ fontWeight: 700 }}>{checked.toLocaleString('pt-BR')} registros</strong>{' '}
          foram conferidos.{' '}
          {pairs.length > 0 || conflicts.length > 0 ? (
            <>
              Achei{' '}
              {pairs.length > 0 && (
                <strong style={{ fontWeight: 700, color: 'var(--green)' }}>
                  {pairs.length}{' '}
                  {pairs.length === 1 ? 'possível duplicado' : 'possíveis duplicados'}
                </strong>
              )}
              {pairs.length > 0 && conflicts.length > 0 && ' e '}
              {conflicts.length > 0 && (
                <strong style={{ fontWeight: 700, color: 'var(--green)' }}>
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
              <div key={d.id} style={{ ...card, padding: '18px 20px' }}>
                <div
                  style={{ font: sans('500 12px/1.4'), color: 'var(--ink-50)', marginBottom: 12 }}
                >
                  {d.reason}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <DupSide tag={d.leftTag} name={d.leftName} meta={d.leftMeta} />
                  <DupSide tag={d.rightTag} name={d.rightName} meta={d.rightMeta} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 13, flexWrap: 'wrap' }}>
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
                style={{
                  ...card,
                  border: '1px solid var(--coral)',
                  padding: '18px 20px',
                  boxShadow: '0 2px 10px rgba(255,90,54,.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
                  <div
                    style={{
                      ...tileBase,
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: 'var(--coral-tint)',
                      color: CORAL,
                    }}
                  >
                    <Ic size={16} sw={2.3}>
                      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    </Ic>
                  </div>
                  <div style={{ font: sans('600 14.5px/1.2'), color: 'var(--ink)' }}>{c.when}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <DupSide tag="Na planilha" name={c.incomingLabel} meta={c.incomingMeta} bold />
                  <DupSide
                    tag="Já na sua agenda"
                    name={c.existingLabel}
                    meta={c.existingMeta}
                    bold
                  />
                </div>
                <div style={{ font: sans('500 12px/1.45'), color: 'var(--ink-50)', marginTop: 11 }}>
                  A gente não marca dois no mesmo horário. Como resolve?
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <div
          onClick={onBack}
          style={{
            font: sans('600 12.5px/1'),
            color: 'var(--ink-70)',
            padding: '12px 16px',
            borderRadius: 99,
            cursor: 'pointer',
          }}
        >
          Voltar
        </div>
        <div style={{ flex: 1 }} />
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
    <div
      style={{
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        padding: '13px 15px',
        background: PANEL,
      }}
    >
      <div
        style={{
          font: sans('700 9.5px/1'),
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-50)',
          marginBottom: 7,
        }}
      >
        {tag}
      </div>
      <div style={{ font: bold ? sans('600 14px/1.2') : serif('600 15px/1.2') }}>{name}</div>
      <div style={{ font: sans('500 12px/1.4'), color: 'var(--ink-50)', marginTop: 3 }}>{meta}</div>
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        alignItems: 'center',
        textAlign: 'center',
        paddingTop: 12,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'var(--emerald)',
          color: 'var(--green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 30px rgba(10,51,36,.22)',
        }}
      >
        <span
          style={{
            animation: 'dm-pulse 1.8s infinite',
            borderRadius: '50%',
            display: 'inline-flex',
          }}
        >
          <Ic size={30} sw={2}>
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M4 21h16" />
          </Ic>
        </span>
      </div>
      <div>
        <div style={{ font: serif('500 26px/1.1'), letterSpacing: '-.02em' }}>{line}</div>
        <div
          style={{
            font: serif('400 14px/1.4'),
            fontStyle: 'italic',
            color: 'var(--ink-50)',
            marginTop: 6,
          }}
        >
          só um instante - guardando tudo com cuidado
        </div>
      </div>
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          marginTop: 4,
        }}
      >
        {order.map((e) => {
          const info = entities.find((i) => i.entity === e)!;
          const done = barsDone[e];
          const active = importing === e && !done;
          const pct = done ? 100 : active ? 65 : 0;
          return (
            <div
              key={e}
              style={{
                ...card,
                padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(10,51,36,.04)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 9,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    font: sans('600 13px/1.2'),
                    color: 'var(--ink)',
                  }}
                >
                  {done && (
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'var(--green-tint)',
                        color: GREEN,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ic size={10} sw={3.2}>
                        <CheckPath />
                      </Ic>
                    </span>
                  )}
                  {ENTITY_LABEL[e]}
                </div>
                <div style={{ font: sans('600 12px/1'), color: 'var(--ink-50)' }}>
                  {done
                    ? `${info.count.toLocaleString('pt-BR')} / ${info.count.toLocaleString('pt-BR')}`
                    : active
                      ? '…'
                      : `0 / ${info.count.toLocaleString('pt-BR')}`}
                </div>
              </div>
              <div
                style={{ height: 8, borderRadius: 99, background: '#efe9d8', overflow: 'hidden' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 99,
                    background: `linear-gradient(90deg,${GREEN},var(--green))`,
                    transition: 'width .3s ease',
                  }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12,
          paddingTop: 6,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(47,211,122,.35)',
            animation: 'dm-spring .6s cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          <Ic size={36} sw={2.6} stroke="var(--emerald)">
            <CheckPath />
          </Ic>
        </div>
        <h1 style={{ margin: '6px 0 0', font: serif('500 32px/1.06'), letterSpacing: '-.02em' }}>
          Tá tudo <em style={{ fontStyle: 'italic', color: GREEN }}>aqui</em>
        </h1>
        <div style={{ font: sans('500 14px/1.5'), color: 'var(--ink-70)', maxWidth: '50ch' }}>
          Conferi cada linha. {total.toLocaleString('pt-BR')} registros do seu sistema antigo agora
          são seus, aqui no Demandaê.
        </div>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                padding: '14px 18px',
                borderTop: '1px dotted var(--border)',
              }}
            >
              <div
                style={{
                  ...tileBase,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: ok ? 'var(--green-tint)' : 'var(--coral-tint)',
                  color: ok ? GREEN : CORAL,
                }}
              >
                {entityIcon[e]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: sans('600 14px/1.25'), color: 'var(--ink)' }}>
                  {ENTITY_LABEL[e]}
                </div>
                <div style={{ font: sans('500 12.5px/1.4'), color: ok ? 'var(--ink-50)' : CORAL }}>
                  {parts.join(' · ')}
                  {errCount > 0 && ` · ${errCount} de fora`}
                </div>
              </div>
              {ok ? (
                <span
                  style={{
                    flex: 'none',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--green-tint)',
                    color: GREEN,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
            gap: 12,
          }}
        >
          {order
            .filter((e) => dest[e])
            .map((e) => {
              const d = dest[e]!;
              const c = counts[e];
              const n = c ? c.create + c.update : 0;
              return (
                <Link key={e} href={d.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ ...card, padding: 16, cursor: 'pointer' }}>
                    <div
                      style={{
                        ...tileBase,
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        background: 'var(--green-tint)',
                        color: GREEN,
                        marginBottom: 10,
                      }}
                    >
                      {entityIcon[e]}
                    </div>
                    <div style={{ font: sans('600 14px/1.2'), color: 'var(--ink)' }}>{d.label}</div>
                    <div
                      style={{ font: sans('500 12px/1.4'), color: 'var(--ink-50)', marginTop: 2 }}
                    >
                      {n.toLocaleString('pt-BR')} {d.meta}
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          border: '1px solid var(--border-soft)',
          borderRadius: 14,
          background: PANEL,
          font: sans('500 12.5px/1.5'),
          color: 'var(--ink-70)',
        }}
      >
        <Ic size={17} stroke={GREEN}>
          <path d="M12 3 4 6v6c0 4 3.4 7.4 8 9 4.6-1.6 8-5 8-9V6l-8-3z" />
          <path d="M9 12l2 2 4-4" />
        </Ic>
        Nada foi salvo em cima do que você já tinha. Quiser importar outra planilha, é só começar de
        novo.
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          onClick={onRestart}
          style={{
            font: sans('600 12.5px/1'),
            color: 'var(--ink-50)',
            padding: '12px 18px',
            borderRadius: 99,
            cursor: 'pointer',
          }}
        >
          Importar outra planilha
        </div>
      </div>
    </div>
  );
}

// ─── helpers de UI ──────────────────────────────────────────────────────────────────────
const sb: React.CSSProperties = { fontWeight: 700, color: 'var(--ink)' };
const tileBase: React.CSSProperties = {
  width: 32,
  height: 32,
  flex: 'none',
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const stepNum: React.CSSProperties = {
  width: 24,
  height: 24,
  flex: 'none',
  borderRadius: '50%',
  background: 'var(--green-tint)',
  color: GREEN,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  font: sans('700 11px/1'),
};

function Overline({ children, mt, mb }: { children: React.ReactNode; mt?: number; mb?: number }) {
  return (
    <div
      style={{
        font: sans('700 11px/1.3'),
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: 'var(--ink-50)',
        marginTop: mt,
        marginBottom: mb,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: 'green' }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 14px',
        borderRadius: 99,
        font: sans('600 12.5px/1'),
        background: tone === 'green' ? 'var(--green-tint)' : 'var(--paper)',
        color: tone === 'green' ? '#14513a' : 'var(--ink-70)',
        border: tone === 'green' ? 'none' : '1px solid var(--border)',
      }}
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
  const bg = on ? (danger ? 'var(--coral-tint)' : 'var(--green-tint)') : 'var(--paper)';
  const fg = on ? (danger ? CORAL : '#14513a') : 'var(--ink-70)';
  const bd = on ? (danger ? 'var(--coral)' : 'var(--emerald)') : 'var(--border)';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        whiteSpace: 'nowrap',
        font: sans('600 12px/1'),
        padding: '10px 14px',
        borderRadius: 99,
        cursor: 'pointer',
        background: bg,
        color: fg,
        border: `1.5px solid ${bd}`,
      }}
    >
      {children}
      {hint && <span style={{ font: sans('600 10px/1'), opacity: 0.7 }}>· {hint}</span>}
    </div>
  );
}
