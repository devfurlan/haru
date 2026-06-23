'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@haru/ui/components/button';

import { setSubscriptionStatus } from './actions';

/**
 * Botão de suspender/ativar a assinatura. ACTIVE → SUSPENDED e vice-versa.
 * Sem assinatura, fica desabilitado.
 */
export function StatusToggle({
  tenantId,
  status,
}: {
  tenantId: string;
  status: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!status) {
    return <span className="text-xs text-muted-foreground">sem assinatura</span>;
  }

  const willSuspend = status === 'ACTIVE';
  const next = willSuspend ? 'SUSPENDED' : 'ACTIVE';

  function handleClick() {
    startTransition(async () => {
      const res = await setSubscriptionStatus(tenantId, next as never);
      if ('error' in res) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      variant={willSuspend ? 'outline' : 'default'}
      size="sm"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? '...' : willSuspend ? 'Suspender' : 'Ativar'}
    </Button>
  );
}
