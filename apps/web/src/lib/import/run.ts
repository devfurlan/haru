// Dispatch por entidade. analyze = dryRun rico (counts + erros + pares + conflitos, nada
// gravado); commit = grava honrando as resoluções do usuário. Mesmo caminho de resolução
// nos dois, então a prévia não diverge da gravação.

import {
  analyzeAppointments,
  analyzeHistory,
  commitAppointments,
  commitHistory,
} from './appointments';
import { analyzeContacts, commitContacts } from './contacts';
import type { AnalyzeResult, EntityId, Mapping, Resolutions, Row } from './mapping';
import { analyzeServices, commitServices } from './services';

interface TenantCtx {
  id: string;
  timezone: string;
}

export function analyzeEntity(
  tenant: TenantCtx,
  entity: EntityId,
  rows: Row[],
  mapping: Mapping,
): Promise<AnalyzeResult> {
  switch (entity) {
    case 'services':
      return analyzeServices(tenant, rows, mapping);
    case 'contacts':
      return analyzeContacts(tenant, rows, mapping);
    case 'appointments':
      return analyzeAppointments(tenant, rows, mapping);
    case 'history':
      return analyzeHistory(tenant, rows, mapping);
  }
}

export function commitEntity(
  tenant: TenantCtx,
  entity: EntityId,
  rows: Row[],
  mapping: Mapping,
  resolutions?: Resolutions,
): Promise<AnalyzeResult> {
  switch (entity) {
    case 'services':
      return commitServices(tenant, rows, mapping);
    case 'contacts':
      return commitContacts(tenant, rows, mapping, resolutions);
    case 'appointments':
      return commitAppointments(tenant, rows, mapping, resolutions);
    case 'history':
      return commitHistory(tenant, rows, mapping, resolutions);
  }
}
