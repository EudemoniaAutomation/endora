export interface Env {
  N8N_WEBHOOK_URL: string;       // dein n8n-Webhook
  CLIENT_AUTH_KV: KVNamespace;   // KV-Binding mit client_id -> api_key (+ Rate-Limiter)
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);

  // 1) client_id aus Query oder Header holen
  const clientId =
    url.searchParams.get('client') ||
    ctx.request.headers.get('x-client-id') ||
    '';

  if (!clientId) {
    return new Response(
      JSON.stringify({ error: 'Missing client_id' }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  // 2) api_key aus KV holen
  const kvEntry = await ctx.env.CLIENT_AUTH_KV.get(clientId, { type: 'json' });

  if (!kvEntry || typeof kvEntry !== 'object' || !('api_key' in kvEntry)) {
    return new Response(
      JSON.stringify({ error: 'Unknown client' }),
      {
        status: 401,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  const apiKey = (kvEntry as { api_key: string }).api_key;

  // 3) Rate-Limiting pro client_id (KV-basiert)
  const rlKey = `rate:${clientId}`;
  const now = Date.now();
  const WINDOW_MS = 60_000;   // 60 Sekunden
  const LIMIT = 60;           // 60 Requests pro Minute

  type RateEntry = { count: number; reset: number };

  let rl: RateEntry | null = null;
  const rlRaw = await ctx.env.CLIENT_AUTH_KV.get(rlKey, { type: 'json' }) as RateEntry | null;

  if (rlRaw && typeof rlRaw.count === 'number' && typeof rlRaw.reset === 'number') {
    rl = rlRaw;
  } else {
    rl = { count: 0, reset: now + WINDOW_MS };
  }

  // Fenster abgelaufen? -> neu starten
  if (rl.reset < now) {
    rl = { count: 0, reset: now + WINDOW_MS };
  }

  // Limit erreicht?
  if (rl.count >= LIMIT) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        client_id: clientId,
        limit: LIMIT,
        window_ms: WINDOW_MS,
        retry_at: rl.reset,
      }),
      {
        status: 429,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  // Zähler erhöhen & zurück in KV schreiben (mit TTL bis zum Fensterende)
  rl.count += 1;
  await ctx.env.CLIENT_AUTH_KV.put(rlKey, JSON.stringify(rl), {
    expiration: Math.floor(rl.reset / 1000), // TTL = Ende des Fensters
  });

  // 4) Request-Body 1:1 übernehmen
  const body = await ctx.request.arrayBuffer();

  // 5) an n8n-Webhook weiterleiten
  const res = await fetch(ctx.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type':
        ctx.request.headers.get('content-type') || 'application/json',
      'authorization': `Bearer ${apiKey}`,
      'x-client-id': clientId,
    },
    body,
  });

  // 6) Antwort von n8n durchreichen
  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
};
