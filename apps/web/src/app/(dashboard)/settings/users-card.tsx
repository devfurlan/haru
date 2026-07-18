'use client';

import { Copy, MoreHorizontal } from 'lucide-react';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { panelRole, PANEL_ROLE_LABEL } from '@/lib/permissions';
import { formatPhoneBR, maskPhoneBRInput } from '@haru/shared';

import { AvatarUploader } from '../account/avatar-uploader';
import {
  deleteUser,
  inviteUser,
  removeMemberAvatar,
  resendInvite,
  updateUser,
  uploadMemberAvatar,
  type InviteUserActionResult,
  type ResendInviteActionResult,
  type UserActionResult,
} from './actions';

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'STAFF';
  status: 'INVITED' | 'ACTIVE';
  isProfessional: boolean;
  avatarUrl: string | null;
}

interface UsersCardProps {
  users: UserRow[];
  currentUserId: string;
}

// Papel efetivo (Dono/Profissional/Apoio) num badge só - deriva de role + isProfessional.
function RoleTag({ user }: { user: Pick<UserRow, 'role' | 'isProfessional'> }) {
  const role = panelRole(user);
  const variant = role === 'OWNER' ? 'admin' : role === 'PROFESSIONAL' ? 'success' : 'neutral';
  return <Badge variant={variant}>{PANEL_ROLE_LABEL[role]}</Badge>;
}

function StatusBadge({ status }: { status: UserRow['status'] }) {
  return status === 'ACTIVE' ? (
    <Badge variant="success">Ativo</Badge>
  ) : (
    <Badge variant="pending">Convite pendente</Badge>
  );
}

// Seletor de tipo (com agenda x sem agenda) compartilhado por convidar/editar.
function TypeField({ defaultProfessional }: { defaultProfessional: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="user-type">Tipo</Label>
      <select
        id="user-type"
        name="isProfessional"
        defaultValue={defaultProfessional ? 'true' : 'false'}
        className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
      >
        <option value="true">Profissional (tem agenda própria)</option>
        <option value="false">Apoio (sem agenda; recepção/gestão)</option>
      </select>
      <p className="text-muted-foreground text-xs">
        Profissionais recebem agendamentos e têm horários próprios. Apoio acessa e gerencia as
        agendas, mas não tem agenda própria.
      </p>
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Copy className="mr-1 h-3 w-3" />
      {copied ? 'Copiado' : 'Copiar link'}
    </Button>
  );
}

// Input de telefone que aplica a máscara BR enquanto o usuário digita. Mantém o
// estado de exibição internamente; envia o valor mascarado pelo `name` (o server
// action normaliza pra E.164 via normalizePhoneBR).
function PhoneInput({ id, defaultValue = '' }: { id: string; defaultValue?: string }) {
  const [value, setValue] = useState(() => maskPhoneBRInput(defaultValue));
  return (
    <Input
      id={id}
      name="phone"
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder="(11) 91234-5678"
      value={value}
      onChange={(e) => setValue(maskPhoneBRInput(e.target.value))}
      required
    />
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : label}
    </Button>
  );
}

// --- Dialog de adicionar ---------------------------------------------------

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction] = useActionState<InviteUserActionResult | undefined, FormData>(
    inviteUser,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && 'ok' in state) formRef.current?.reset();
  }, [state]);

  const done = state && 'ok' in state;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dismissable={false}>
        <DialogHeader>
          <DialogTitle>Adicionar usuário</DialogTitle>
          <DialogDescription>
            Ele recebe um convite no WhatsApp para ativar a conta e definir a senha.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-3 text-sm">
            <p className="text-emerald-600">
              {state.sent
                ? 'Convite enviado pelo WhatsApp.'
                : 'Usuário criado. Não foi possível enviar pelo WhatsApp (verifique se o número está conectado em Configurações). Envie o link de ativação manualmente:'}
            </p>
            {!state.sent && (
              <div className="space-y-2">
                <code className="bg-muted block break-all rounded px-2 py-1 text-xs">
                  {state.activationUrl}
                </code>
                <CopyLink url={state.activationUrl} />
              </div>
            )}
            <Button type="button" onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <form ref={formRef} action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nome</Label>
              <Input id="invite-name" name="name" placeholder="Nome do colaborador" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="colaborador@email.com"
                required
              />
              <p className="text-muted-foreground text-xs">Será o login dele no painel.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-phone">WhatsApp</Label>
              <PhoneInput id="invite-phone" />
              <p className="text-muted-foreground text-xs">Para onde o convite será enviado.</p>
            </div>
            <TypeField defaultProfessional={true} />
            {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
            <SubmitButton label="Enviar convite" />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Dialog de editar ------------------------------------------------------

function EditDialog({
  user,
  isSelf,
  onClose,
}: {
  user: UserRow;
  isSelf: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<UserActionResult | undefined, FormData>(
    updateUser,
    undefined,
  );

  // `onClose` é recriada a cada render do pai; guardamos numa ref pra o effect
  // reagir só à conclusão da action (state ok), não ao re-render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (state && 'ok' in state) onCloseRef.current();
  }, [state]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dismissable={false}>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        {/* Foto só faz sentido pra profissional - é quem aparece no booking (web/app). */}
        {user.isProfessional && (
          <AvatarUploader
            avatarUrl={user.avatarUrl}
            upload={uploadMemberAvatar.bind(null, user.id)}
            remove={removeMemberAvatar.bind(null, user.id)}
          />
        )}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input id="edit-name" name="name" defaultValue={user.name ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">WhatsApp</Label>
            <PhoneInput id="edit-phone" defaultValue={user.phone ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Papel</Label>
            <select
              id="edit-role"
              name="role"
              defaultValue={user.role}
              disabled={isSelf}
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="OWNER">Dono (acesso total)</option>
              <option value="STAFF">Equipe (profissional ou apoio)</option>
            </select>
            {isSelf && (
              <p className="text-muted-foreground text-xs">
                Você não pode alterar o seu próprio papel.
              </p>
            )}
          </div>
          <TypeField defaultProfessional={user.isProfessional} />
          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          <SubmitButton label="Salvar" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Ações por linha (excluir / reenviar) ----------------------------------

function RowActions({
  user,
  isSelf,
  onEdit,
}: {
  user: UserRow;
  isSelf: boolean;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Excluir ${user.name ?? user.email}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setError(null);
    startTransition(() =>
      deleteUser(user.id).then((r) => {
        if (r && 'error' in r) setError(r.error);
      }),
    );
  }

  function handleResend() {
    setError(null);
    startTransition(() =>
      resendInvite(user.id).then((r: ResendInviteActionResult) => {
        if ('error' in r) setError(r.error);
        else if (!r.sent) {
          window.prompt(
            'Não foi possível enviar pelo WhatsApp. Copie o link de ativação:',
            r.activationUrl,
          );
        } else {
          window.alert('Convite reenviado pelo WhatsApp.');
        }
        setOpen(false);
      }),
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        aria-label="Ações"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="bg-background absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border py-1 text-sm shadow-md">
            <button
              type="button"
              className="hover:bg-accent block w-full px-3 py-1.5 text-left"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Editar
            </button>
            {user.status === 'INVITED' && (
              <button
                type="button"
                className="hover:bg-accent block w-full px-3 py-1.5 text-left"
                onClick={handleResend}
              >
                Reenviar convite
              </button>
            )}
            {!isSelf && (
              <button
                type="button"
                className="text-destructive hover:bg-accent block w-full px-3 py-1.5 text-left"
                onClick={() => {
                  setOpen(false);
                  handleDelete();
                }}
              >
                Excluir
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <p className="text-destructive absolute right-0 mt-1 w-48 text-right text-xs">{error}</p>
      )}
    </div>
  );
}

export function UsersCard({ users, currentUserId }: UsersCardProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Usuários</CardTitle>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            Adicionar
          </Button>
        </div>
        <CardDescription>
          Quem tem acesso ao painel. Administradores acessam tudo, inclusive estas configurações; a
          equipe acessa o dia a dia (agendamentos, conversas, clientes).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{u.name ?? u.email}</span>
                    {isSelf && <span className="text-muted-foreground text-xs">(você)</span>}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">{u.email}</div>
                  {u.phone && (
                    <div className="text-muted-foreground text-xs">{formatPhoneBR(u.phone)}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RoleTag user={u} />
                  <StatusBadge status={u.status} />
                  <RowActions user={u} isSelf={isSelf} onEdit={() => setEditing(u)} />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {editing && (
        <EditDialog
          user={editing}
          isSelf={editing.id === currentUserId}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}
