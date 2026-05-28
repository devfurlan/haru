type Logger = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
};

const INTERVAL_MS = 5 * 60 * 1000;

async function ping(url: string, log: Logger): Promise<void> {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      log.warn({ status: res.status }, 'heartbeat falhou');
    }
  } catch (err) {
    log.warn({ err }, 'heartbeat erro');
  }
}

export function startHeartbeat(log: Logger): void {
  const url = process.env.HEALTHCHECKS_URL;
  if (!url) {
    log.info({}, 'HEALTHCHECKS_URL não configurada, heartbeat desabilitado');
    return;
  }

  log.info({ intervalMs: INTERVAL_MS }, 'heartbeat iniciado');
  ping(url, log);
  setInterval(() => ping(url, log), INTERVAL_MS);
}
