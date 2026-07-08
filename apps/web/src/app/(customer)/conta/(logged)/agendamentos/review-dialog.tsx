'use client';

import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { customerSubmitReview } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Avaliar um atendimento concluído (1-5 estrelas + comentário). Só aparece na tela de
// detalhe quando o agendamento está COMPLETED (o gate real é no server - upsertReview).
// Edita a nota se já existe. Modal com ação: não fecha por overlay/ESC (dismissable=false).
export function ReviewDialog({
  tenantId,
  tenantName,
  initialRating,
  initialComment,
}: {
  tenantId: string;
  tenantName: string;
  initialRating: number;
  initialComment: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = initialRating > 0;

  function submit() {
    if (rating < 1) {
      setError('Escolha de 1 a 5 estrelas.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await customerSubmitReview({ tenantId, rating, comment });
      if (res && 'error' in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={editing ? 'outline' : 'coral'} size="sm">
          {editing ? 'Editar avaliação' : 'Avaliar atendimento'}
        </Button>
      </DialogTrigger>
      <DialogContent dismissable={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Avaliar {tenantName}</DialogTitle>
          <DialogDescription>Sua nota ajuda outras pessoas a escolher.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-1" role="radiogroup" aria-label="Nota">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={cn('h-8 w-8', active ? 'fill-coral text-coral' : 'text-[#d6cbb2]')}
                  strokeWidth={1.8}
                />
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Conte como foi (opcional)"
          className="border-edge bg-paper text-ink focus:border-green-deep w-full resize-none rounded-[14px] border px-4 py-3 text-sm outline-none placeholder:text-[#9aa8a0]"
        />

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" variant="coral" onClick={submit} disabled={pending}>
            {pending ? 'Enviando…' : 'Enviar avaliação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
