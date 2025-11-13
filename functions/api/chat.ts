export interface Env {
  N8N_WEBHOOK_URL: string;       // dein n8n-Webhook (ENV in Cloudflare Pages)
  CLIENT_AUTH_KV: KVNamespace;   // KV-Binding mit client_id -> { api_key }
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const req = ctx.request;
  const url = new URL(req.url);

  // 0) Origin-Check (nur deine Domains)
  const origin =
    req.headers.get('origin') ||
    req.headers.get('referer') ||
    '';

  const allowedOrigins = [
    'https://pages.endora.io',
    'https://cloud.endora.io',
    'https://endora.pages.dev',
    'https://pages-endora.pages.dev',
  ];

  if (origin && !allowedOrigins.some(o => origin.startsWith(o))) {
    return new Response(
      JSON.stringify({ error: 'Forbidden origin' }),
      {
        status: 403,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  // 1) client_id aus Query oder Header holen
  const clientId =
    url.searchParams.get('client') ||
    req.headers.get('x-client-id') ||
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

  // 3) Rate-Limiter pro client (einfach, aber effektiv)
  const rlKey = `rate:${clientId}`;
  const now = Date.now();
  const windowMs = 60_000; // 1 Minute
  const maxPerWindow = 60; // 60 Requests / Minute / Client

  const rlRaw = await ctx.env.CLIENT_AUTH_KV.get(rlKey, { type: 'json' }) as
    | { count: number; windowStart: number }
    | null;

  let count = 1;
  let windowStart = now;

  if (rlRaw && typeof rlRaw === 'object') {
    const diff = now - rlRaw.windowStart;
    if (diff < windowMs) {
      // noch im gleichen Fenster
      count = rlRaw.count + 1;
      windowStart = rlRaw.windowStart;
    } else {
      // neues Zeitfenster
      count = 1;
      windowStart = now;
    }
  }

  await ctx.env.CLIENT_AUTH_KV.put(
    rlKey,
    JSON.stringify({ count, windowStart }),
    { expirationTtl: 120 }, // 2 Minuten TTL reicht
  );

  if (count > maxPerWindow) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  // 4) Request-Body 1:1 übernehmen
  const body = await req.arrayBuffer();

  // 5) an n8n-Webhook weiterleiten
  const res = await fetch(ctx.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type':
        req.headers.get('content-type') || 'application/json',
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
};^
