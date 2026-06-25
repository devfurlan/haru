'use client';

import { useActionState } from 'react';

import { Button } from '@haru/ui/components/button';

import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';

import { updateUserRole } from '../actions';

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: 'OWNER' | 'STAFF';
  status: 'INVITED' | 'ACTIVE';
  isProfessional: boolean;
}

export function TeamSection({ tenantId, users }: { tenantId: string; users: TeamUser[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum usuário neste estabelecimento.</p>;
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <UserRow key={u.id} tenantId={tenantId} user={u} />
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        Criar/excluir/convidar usuários envolve o Supabase Auth e fica no painel do próprio cliente.
      </p>
    </div>
  );
}

function UserRow({ tenantId, user }: { tenantId: string; user: TeamUser }) {
  const [state, action, pending] = useActionState(updateUserRole, undefined);

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="userId" value={user.id} />
      <div className="min-w-0 flex-1">
        <span className="font-medium">{user.name ?? '(sem nome)'}</span>
        <span className="ml-2 text-muted-foreground">{user.email}</span>
      </div>
      <Badge variant={user.status === 'ACTIVE' ? 'success' : 'warning'}>
        {user.status === 'ACTIVE' ? 'Ativo' : 'Convidado'}
      </Badge>
      <Badge variant={user.isProfessional ? 'success' : 'neutral'}>
        {user.isProfessional ? 'Profissional' : 'Recepção'}
      </Badge>
      <Select name="role" defaultValue={user.role} className="w-32">
        <option value="OWNER">Admin</option>
        <option value="STAFF">Equipe</option>
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? '...' : 'Salvar'}
      </Button>
      {state && 'error' in state && (
        <span className="w-full text-right text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}
