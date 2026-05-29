import type { Metadata } from 'next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/marketing/container';

import { InterestForm } from './interest-form';

export const metadata: Metadata = {
  title: 'Quero usar o Demandaê',
  description:
    'Deixe seus dados e a gente entra em contato para conectar o WhatsApp do seu negócio à IA do Demandaê.',
};

export default function InterestPage() {
  return (
    <section className="bg-cream">
      <Container className="flex justify-center py-20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Quero usar o Demandaê</CardTitle>
            <CardDescription>
              Estamos liberando acesso aos poucos. Deixe seus dados que a gente entra em contato pelo
              WhatsApp para te ajudar a começar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InterestForm />
          </CardContent>
        </Card>
      </Container>
    </section>
  );
}
