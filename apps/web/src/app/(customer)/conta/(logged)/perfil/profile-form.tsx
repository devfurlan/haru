'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { customerUpdateProfile, type CustomerActionResult } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskCpfCnpjInput } from '@/lib/format';

interface ProfileFormProps {
  name: string;
  email: string;
  documentDefault: string;
  birthDateDefault: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}

export function ProfileForm({ name, email, documentDefault, birthDateDefault }: ProfileFormProps) {
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerUpdateProfile,
    undefined,
  );
  const [doc, setDoc] = useState(documentDefault);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seu cadastro</CardTitle>
        <CardDescription>
          Estes dados aparecem para os estabelecimentos onde você agenda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={name} placeholder="Seu nome" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={email} disabled readOnly />
            <p className="text-muted-foreground text-xs">
              É o seu login. Para alterar, fale com o suporte.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">
              CPF/CNPJ <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="document"
              name="document"
              value={doc}
              onChange={(e) => setDoc(maskCpfCnpjInput(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">
              Nascimento <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="birthDate" name="birthDate" type="date" defaultValue={birthDateDefault} />
          </div>

          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          {state && 'ok' in state && (
            <p className="text-sm text-emerald-600">Cadastro atualizado.</p>
          )}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
