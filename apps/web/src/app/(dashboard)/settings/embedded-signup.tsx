'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

// Tipagem mínima do SDK do Facebook que usamos.
declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        cb: (resp: { authResponse?: { code?: string } | null }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const FB_VERSION = 'v21.0';
const APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
// Um único config_id serve aos dois fluxos: a diferença coexistence vs número novo
// é o `featureType` passado em runtime (ver `launch`), não a configuração da Meta.
const CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;

interface SessionInfo {
  phoneNumberId?: string;
  wabaId?: string;
}

const ELIGIBILITY: string[] = [
  'O número NUNCA pode ter sido conectado a uma API do WhatsApp antes (só ao app). Se já passou por API, é preciso esperar de 1 a 2 meses após desconectar.',
  'O número precisa estar ativo no WhatsApp Business App há pelo menos 7 dias (o ideal é 1 a 2 meses de uso real, para não cair em bloqueio).',
  'Tem que ser o WhatsApp Business App (o app verde "Business"), versão 2.24.17 ou mais nova. Se o número está no WhatsApp comum, migre para o Business App antes (as conversas são preservadas).',
  'Depois de conectar, abra o WhatsApp Business App pelo menos a cada 13 dias para manter a conexão ativa.',
];

const LIMITATIONS =
  'Limitações: até 5 mensagens por segundo; sem selo verde e sem verificação de negócio na conta; grupos, mensagens temporárias, ver uma vez e localização ao vivo não sincronizam.';

export function EmbeddedSignup() {
  const router = useRouter();
  const sessionRef = useRef<SessionInfo>({});
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState<'coex' | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedEligible, setConfirmedEligible] = useState(false);

  const configured = Boolean(APP_ID && CONFIG_ID);

  // Carrega o SDK do Facebook uma vez e captura o sessionInfo do Embedded Signup.
  useEffect(() => {
    if (!configured) return;

    function onMessage(event: MessageEvent) {
      if (!/facebook\.com$/.test(new URL(event.origin).hostname)) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.data) {
          sessionRef.current = {
            phoneNumberId: data.data.phone_number_id,
            wabaId: data.data.waba_id,
          };
        }
      } catch {
        // mensagens não-JSON do postMessage do FB - ignorar
      }
    }
    window.addEventListener('message', onMessage);

    if (window.FB) {
      window.FB.init({ appId: APP_ID!, cookie: true, xfbml: false, version: FB_VERSION });
      setSdkReady(true);
    } else {
      window.fbAsyncInit = () => {
        window.FB!.init({ appId: APP_ID!, cookie: true, xfbml: false, version: FB_VERSION });
        setSdkReady(true);
      };
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    }

    return () => window.removeEventListener('message', onMessage);
  }, [configured]);

  const launch = useCallback(
    (mode: 'coex' | 'new') => {
      if (!window.FB) return;
      setError(null);
      setBusy(mode);
      sessionRef.current = {};

      const extras: Record<string, unknown> =
        mode === 'coex'
          ? { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' }
          : { setup: {}, sessionInfoVersion: '3' };

      window.FB.login(
        (resp) => {
          const code = resp.authResponse?.code;
          if (!code) {
            setBusy(null);
            setError('Conexão cancelada ou não autorizada.');
            return;
          }
          void finish(mode, code);
        },
        {
          config_id: CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras,
        },
      );
    },
    // finish é estável o suficiente; evitamos recriar o callback a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function finish(mode: 'coex' | 'new', code: string) {
    const { phoneNumberId, wabaId } = sessionRef.current;
    if (!phoneNumberId || !wabaId) {
      setBusy(null);
      setError('Não recebemos os dados do número da Meta. Tente novamente.');
      return;
    }
    try {
      const res = await fetch('/api/whatsapp/embedded-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, code, phoneNumberId, wabaId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Falha ao concluir a conexão.');
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError('Erro de rede ao concluir a conexão.');
      setBusy(null);
    }
  }

  if (!configured) {
    return null; // Embedded Signup não configurado neste ambiente - cai no fluxo manual.
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 space-y-3 rounded-lg border p-4 text-sm">
        <p className="font-medium">Conectar meu número atual (sem trocar de chip)</p>
        <p className="text-muted-foreground">
          Use o mesmo número que você já usa no WhatsApp Business App. Você continua atendendo pelo
          celular normalmente e o bot agenda por baixo. Antes de continuar, confirme que o seu
          número atende a todos os requisitos:
        </p>
        <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
          {ELIGIBILITY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">{LIMITATIONS}</p>
        <label className="flex items-start gap-2 pt-1 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmedEligible}
            onChange={(e) => setConfirmedEligible(e.target.checked)}
          />
          <span>Li os requisitos acima e confirmo que meu número está elegível.</span>
        </label>
        <Button
          type="button"
          disabled={!sdkReady || !confirmedEligible || busy !== null}
          onClick={() => launch('coex')}
        >
          {busy === 'coex' ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Conectando…
            </>
          ) : (
            'Conectar meu número atual'
          )}
        </Button>
      </div>

      <div className="bg-muted/30 space-y-3 rounded-lg border p-4 text-sm">
        <p className="font-medium">Usar um número novo</p>
        <p className="text-muted-foreground">
          A Meta cria/registra um número novo dedicado ao bot. Indicado para quem não quer mexer no
          número atual.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={!sdkReady || busy !== null}
          onClick={() => launch('new')}
        >
          {busy === 'new' ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Conectando…
            </>
          ) : (
            'Usar um número novo'
          )}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
