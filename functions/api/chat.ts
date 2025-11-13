export interface Env {
  N8N_WEBHOOK_URL: string;       // dein n8n-Webhook
  CLIENT_AUTH_KV: KVNamespace;   // KV-Binding mit client_id -> api_key
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

  // 3) Request-Body 1:1 übernehmen
  const body = await ctx.request.arrayBuffer();

  // 4) an n8n-Webhook weiterleiten
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

  // 5) Antwort von n8n durchreichen
  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
};
