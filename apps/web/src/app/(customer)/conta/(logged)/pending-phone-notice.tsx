import { MessageCircle } from 'lucide-react';

/**
 * Aviso para conta ainda SEM WhatsApp confirmado. Os agendamentos podem existir no
 * banco (contato pelo telefone), mas só entram na conta após o OTP (claim por posse
 * do número - ver customerChangePhone / claimContactsByPhone). Substitui o "você não
 * tem agendamentos", que soaria como se a reserva tivesse falhado. Aponta pro banner
 * fixo no topo, onde está o botão "Confirmar agora".
 */
export function PendingPhoneNotice() {
  return (
    <div className="border-coral/30 bg-coral/5 rounded-xl border p-6 text-center">
      <MessageCircle className="text-coral mx-auto h-6 w-6" aria-hidden="true" />
      <p className="text-foreground mt-2 text-sm font-medium">
        Confirme seu WhatsApp para ver seus agendamentos
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        Se você acabou de agendar, seu horário entra nesta conta assim que confirmar o número - é só
        usar o aviso no topo da página.
      </p>
    </div>
  );
}
