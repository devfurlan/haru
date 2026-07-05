import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { ConfirmPhoneDialog } from './confirm-phone-dialog';

/**
 * Aviso para conta ainda SEM WhatsApp confirmado. Os agendamentos podem existir no
 * banco (contato pelo telefone), mas só entram na conta após o OTP (claim por posse
 * do número - ver customerChangePhone / claimContactsByPhone). Substitui o "você não
 * tem agendamentos", que soaria como se a reserva tivesse falhado. Traz o próprio CTA
 * de confirmar (mesmo fluxo da barra do topo), sem mandar o usuário caçar o banner.
 */
export function PendingPhoneNotice({ pendingPhone }: { pendingPhone: string | null }) {
  return (
    <div className="border-coral/30 bg-coral/5 rounded-xl border p-6 text-center">
      <MessageCircle className="text-coral mx-auto h-6 w-6" aria-hidden="true" />
      <p className="text-foreground mt-2 text-sm font-medium">
        Confirme seu WhatsApp para ver seus agendamentos
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        Se você acabou de agendar, seu horário entra nesta conta assim que confirmar o número.
      </p>
      <ConfirmPhoneDialog
        pendingPhone={pendingPhone}
        trigger={
          <Button variant="coral" size="sm" className="mt-4">
            Confirmar agora
          </Button>
        }
      />
    </div>
  );
}
