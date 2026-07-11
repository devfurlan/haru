// Wrapper SheetJS (server-only). Lê xlsx/xls/csv e devolve UMA tabela por aba não-vazia
// (workbook de várias abas = várias entidades), valores como string de exibição.

import * as XLSX from 'xlsx';

import type { Row } from './mapping';

export interface Table {
  /** Nome da aba (xlsx multi-aba) ou nome do arquivo (csv/aba única). */
  name: string;
  headers: string[];
  rows: Row[];
}

export function parseWorkbook(buffer: Buffer, fileName: string): Table[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const single = wb.SheetNames.length <= 1;
  const tables: Table[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const t = sheetToTable(sheet, single ? fileName.replace(/\.[^.]+$/, '') : sheetName);
    if (t) tables.push(t);
  }
  return tables;
}

function sheetToTable(sheet: XLSX.WorkSheet, name: string): Table | null {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  if (aoa.length === 0) return null;

  const seen = new Map<string, number>();
  const headers = (aoa[0] as unknown[]).map((h, i) => {
    let col = String(h ?? '').trim() || `Coluna ${i + 1}`;
    const n = seen.get(col) ?? 0;
    seen.set(col, n + 1);
    if (n > 0) col = `${col} (${n + 1})`;
    return col;
  });

  const rows: Row[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const arr = aoa[r] as unknown[];
    const row: Row = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c++) {
      const v = arr[c];
      const s = v == null ? '' : String(v).trim();
      row[headers[c]] = s;
      if (s) hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  if (rows.length === 0) return null;
  return { name, headers, rows };
}
