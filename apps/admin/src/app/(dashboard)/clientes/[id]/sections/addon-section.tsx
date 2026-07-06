'use client';

import { useState, useTransition } from 'react';

import { Button } from '@haru/ui/components/button';

import { activateOwnAddon } from '../actions';

/**
 * Estado do addon "Atendente IA" no painel do operador. Só a variante "número próprio"
 * com setup pago e ainda não ativa oferece o botão de ativação - é o 2º passo do fluxo,
 * feito depois que o operador conclui a config da WABA na Meta.
 */
export function AddonSection({
  tenantId,
  addonTierLabel,
  channel,
  setupCharged,
  activated,
}: {
  tenantId: string;
  addonTierLabel: string | null;
  channel: 'DEMANDAE' | 'OWN' | null;
  setupCharged: boolean;
  activated: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!addonTierLabel || !channel) {
    return <p className="text-sm text-muted-foreground">Sem Atendente IA contratado.</p>;
  }

  const channelLabel = channel === 'DEMANDAE' ? 'número Demandaê' : 'número próprio';

  if (activated || done) {
    return (
      <p className="text-sm">
        Ativo · {addonTierLabel} ({channelLabel}).
      </p>
    );
  }

  if (channel === 'OWN' && !setupCharged) {
    return (
      <p className="text-sm text-muted-foreground">
        {addonTierLabel} (número próprio) - aguardando o pagamento do setup pelo cliente.
      </p>
    );
  }

  if (channel === 'DEMANDAE') {
    // Demandaê ativa sozinho na hora da contratação; se caiu aqui sem activated, é transitório.
    return (
      <p className="text-sm text-muted-foreground">
        {addonTierLabel} (número Demandaê) - ativação automática.
      </p>
    );
  }

  // OWN + setup pago + não ativado: o operador conclui aqui.
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <strong>{addonTierLabel}</strong> (número próprio) · setup pago. Depois de concluir a config
        da WABA na Meta, ative - isso soma a mensalidade à recorrência, cobra o proporcional do 1º
        ciclo e avisa o cliente.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await activateOwnAddon(tenantId);
            if ('error' in r) setError(r.error);
            else setDone(true);
          });
        }}
      >
        {pending ? 'Ativando…' : 'Ativar Atendente IA'}
      </Button>
    </div>
  );
}
