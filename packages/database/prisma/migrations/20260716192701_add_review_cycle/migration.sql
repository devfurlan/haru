-- Ciclo completo de avaliações: resposta do dono, pedido de contato (nota baixa) e o
-- carimbo de dedup do convite pós-atendimento. Vale em todos os planos (retenção/prova
-- social, não capa). Idempotente (IF NOT EXISTS) para nunca travar em re-aplicação.

-- Resposta pública do dono à avaliação (aparece na vitrine; não afeta a média).
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "ownerReply" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "ownerRepliedAt" TIMESTAMP(3);

-- Cliente com nota baixa (1-2) pediu que o dono entre em contato. Acende o sino in-app
-- e destaca no painel; a review segue pública.
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "contactRequestedAt" TIMESTAMP(3);

-- Carimbo de dedup do convite de avaliação (despachado 1h após o fim do atendimento),
-- espelhando os reminderXxxSentAt. null = ainda não convidado; zerado na remarcação.
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "reviewInviteSentAt" TIMESTAMP(3);
