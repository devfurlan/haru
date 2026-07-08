'use client';

import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getSupportThread, sendSupportMessage } from '@/app/(dashboard)/support/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Bot de suporte do painel: FAB flutuante + painel de chat. Não é Dialog (sem overlay),
// então fecha só pelo X - não se aplica a regra "modal com ação não fecha por fora".

type Msg = { role: 'USER' | 'ASSISTANT'; body: string };

const GREETING: Msg = {
  role: 'ASSISTANT',
  body: 'Oi! Sou o suporte do Demandaê. Tire dúvidas sobre o painel ou mande uma crítica/sugestão. Como posso ajudar?',
};

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Histórico só na primeira abertura.
  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    getSupportThread()
      .then((turns) => setMessages(turns.map((t) => ({ role: t.role, body: t.body }))))
      .catch(() => {});
  }, [open, loaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'USER', body: text }]);
    setSending(true);
    try {
      const { reply } = await sendSupportMessage(text);
      setMessages((m) => [...m, { role: 'ASSISTANT', body: reply }]);
    } catch {
      toast.error('Não consegui enviar. Tente de novo.');
      setMessages((m) => [...m, { role: 'ASSISTANT', body: 'Ops, algo falhou. Pode repetir?' }]);
    } finally {
      setSending(false);
    }
  }

  const shown = messages.length ? messages : [GREETING];

  return (
    <>
      {open && (
        <div className="bg-background fixed bottom-[148px] right-4 z-40 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl md:bottom-24">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Suporte</p>
              <p className="text-muted-foreground text-xs">Dúvidas, críticas e sugestões</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {shown.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'USER' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                    m.role === 'USER'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  {m.body}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground rounded-2xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva sua mensagem..."
              disabled={sending}
              autoFocus
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Suporte"
        className="bg-primary text-primary-foreground fixed bottom-[84px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:brightness-105 md:bottom-4"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
