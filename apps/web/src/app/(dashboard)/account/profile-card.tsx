'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  removeUserAvatar,
  updateProfile,
  uploadUserAvatar,
  type ProfileActionResult,
} from '../settings/actions';
import { AvatarUploader } from './avatar-uploader';

interface ProfileCardProps {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}

export function ProfileCard({ name, email, avatarUrl }: ProfileCardProps) {
  const [state, formAction] = useActionState<ProfileActionResult | undefined, FormData>(
    updateProfile,
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seu perfil</CardTitle>
        <CardDescription>Como você aparece no painel. O e-mail é o seu login.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AvatarUploader avatarUrl={avatarUrl} upload={uploadUserAvatar} remove={removeUserAvatar} />

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input id="profile-name" name="name" defaultValue={name ?? ''} placeholder="Seu nome" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input id="profile-email" value={email} disabled readOnly />
            <p className="text-muted-foreground text-xs">
              Para alterar o e-mail de acesso, fale com o suporte.
            </p>
          </div>

          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          {state && 'ok' in state && <p className="text-sm text-emerald-600">Salvo.</p>}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
