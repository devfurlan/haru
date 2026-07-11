// Dispatch da importação: escolhe o spec pela entidade. `dryRun` prova a prévia e a
// gravação pelo MESMO caminho, então a prévia nunca diverge do que será gravado.

import { applyAppointments } from './appointments';
import { applyContacts } from './contacts';
import type { ApplyResult, EntityId, Mapping, Row } from './mapping';
import { applyServices } from './services';

interface TenantCtx {
  id: string;
  timezone: string;
}

export function applyImport(
  tenant: TenantCtx,
  entity: EntityId,
  rows: Row[],
  mapping: Mapping,
  dryRun: boolean,
): Promise<ApplyResult> {
  switch (entity) {
    case 'contacts':
      return applyContacts(tenant, rows, mapping, dryRun);
    case 'services':
      return applyServices(tenant, rows, mapping, dryRun);
    case 'appointments':
      return applyAppointments(tenant, rows, mapping, dryRun);
  }
}
