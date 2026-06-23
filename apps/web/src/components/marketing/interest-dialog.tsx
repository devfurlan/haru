'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { InterestForm } from './interest-form';

export function InterestDialog({
  children,
  title = 'Quero usar o Demandaê',
  description = 'Estamos liberando acesso aos poucos. Deixe seus dados que a gente entra em contato pelo WhatsApp para te ajudar a começar.',
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent dismissable={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <InterestForm />
      </DialogContent>
    </Dialog>
  );
}
