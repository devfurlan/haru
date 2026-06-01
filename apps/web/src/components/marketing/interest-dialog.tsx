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

export function InterestDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent dismissable={false}>
        <DialogHeader>
          <DialogTitle>Quero usar o Demandaê</DialogTitle>
          <DialogDescription>
            Estamos liberando acesso aos poucos. Deixe seus dados que a gente entra em contato pelo
            WhatsApp para te ajudar a começar.
          </DialogDescription>
        </DialogHeader>
        <InterestForm />
      </DialogContent>
    </Dialog>
  );
}
