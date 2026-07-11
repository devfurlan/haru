// Wrapper SheetJS (server-only: só é importado nos route handlers). Lê xlsx/xls/csv da
// primeira aba num caminho só e devolve { headers, rows } com todos os valores como
// string de exibição (raw:false = datas/preços legíveis, sem lidar com serial do Excel).

import * as XLSX from 'xlsx';

import type { Row } from './mapping';

export interface ParsedTable {
  headers: string[];
  rows: Row[];
}

export function parseTable(buffer: Buffer): ParsedTable {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
  if (!sheet) return { headers: [], rows: [] };

  // header:1 -> matriz de arrays; raw:false -> valor formatado (string); defval:'' ->
  // célula vazia vira '' (mantém alinhamento posicional); blankrows:false -> pula linha vazia.
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  if (aoa.length === 0) return { headers: [], rows: [] };

  // Cabeçalhos: vazio vira "Coluna N"; duplicado ganha sufixo pra não colidir na chave do objeto.
  const seen = new Map<string, number>();
  const headers = (aoa[0] as unknown[]).map((h, i) => {
    let name = String(h ?? '').trim() || `Coluna ${i + 1}`;
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    if (n > 0) name = `${name} (${n + 1})`;
    return name;
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
  return { headers, rows };
}
