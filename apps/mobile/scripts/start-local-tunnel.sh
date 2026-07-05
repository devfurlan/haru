#!/usr/bin/env bash
set -euo pipefail

# Testar no celular só com QR, apontando pro BD LOCAL.
# Sobe 2 quick tunnels do cloudflared (Supabase + API web), injeta as URLs
# publicas no env EXPO_PUBLIC_* e roda o Metro com --tunnel. Escaneia o QR no
# "development build" e usa - sem adb, sem USB, sem firewall.
# ponytail: quick tunnels do cloudflared = zero conta/authtoken. URL e rotativa
# por sessao, por isso o env e montado na hora aqui em vez de ficar no eas.json.

SUPA_PORT=54361   # Supabase (Kong) local
API_PORT=4361     # Next (API mobile) local
LOCAL_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"  # chave anon LOCAL (nao e segredo)

TMP=$(mktemp -d)
PIDS=()
cleanup() {
  kill "${PIDS[@]}" 2>/dev/null || true
  [ -f "$TMP/.env.local.bak" ] && cp "$TMP/.env.local.bak" .env.local  # restaura o localhost
  rm -rf "$TMP"
}
trap cleanup EXIT

start_tunnel() { # $1=porta $2=logfile -> ecoa a URL publica
  cloudflared tunnel --url "http://localhost:$1" --no-autoupdate >"$2" 2>&1 &
  PIDS+=($!)
  for _ in $(seq 1 30); do
    local url
    url=$(grep -Eom1 'https://[a-z0-9-]+\.trycloudflare\.com' "$2" || true)
    [ -n "$url" ] && { echo "$url"; return 0; }
    sleep 1
  done
  echo "ERRO: cloudflared nao subiu pra porta $1" >&2; cat "$2" >&2; return 1
}

echo "==> tunel Supabase (:$SUPA_PORT)"
SUPA_URL=$(start_tunnel "$SUPA_PORT" "$TMP/supa.log"); echo "    $SUPA_URL"
echo "==> tunel API web (:$API_PORT)"
API_URL=$(start_tunnel "$API_PORT" "$TMP/api.log"); echo "    $API_URL"

# O Expo SDK 57 da precedencia ao .env.local sobre o env exportado (EXPO_NO_DOTENV
# nao segura o inline do babel-preset-expo). Entao injeta as URLs do tunel DIRETO no
# .env.local (a fonte que vence) e restaura o localhost no fim (backup + trap cleanup).
cp .env.local "$TMP/.env.local.bak"
sed -i -E \
  -e "s#^EXPO_PUBLIC_SUPABASE_URL=.*#EXPO_PUBLIC_SUPABASE_URL=$SUPA_URL#" \
  -e "s#^EXPO_PUBLIC_API_URL=.*#EXPO_PUBLIC_API_URL=$API_URL#" \
  .env.local

echo "==> Metro (BD local via tunel). Escaneia o QR no development build. Ctrl+C derruba tudo."
# -c limpa o cache do Metro (os valores de PROD ficam "assados" no bundle senao).
expo start --dev-client --tunnel -c
