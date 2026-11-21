import { randomUUID } from 'node:crypto';
import { CORS, redirectAllowed } from '@/lib/mcp/auth';

/** RFC 7591 dynamic client registration. Stateless: the redirect URI is checked again at /oauth/authorize. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { redirect_uris?: unknown; client_name?: string };
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === 'string') : [];
  if (!uris.length || !uris.every(redirectAllowed))
    return Response.json({ error: 'invalid_redirect_uri', error_description: 'Use https redirect URIs (or loopback).' }, { status: 400, headers: CORS });
  return Response.json(
    {
      client_id: `riq-${randomUUID()}`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: body.client_name ?? 'MCP client',
      redirect_uris: uris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    { status: 201, headers: CORS },
  );
}
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
