import { CORS, redeemCode, refresh } from '@/lib/mcp/auth';

/** OAuth token endpoint: authorization_code (with PKCE) and refresh_token. */
export async function POST(req: Request) {
  const type = req.headers.get('content-type') ?? '';
  const raw = type.includes('application/json') ? Object.entries((await req.json().catch(() => ({}))) as Record<string, string>) : [...(await req.formData()).entries()];
  const f = new Map(raw.map(([k, v]) => [k, String(v)]));
  const fail = (error: string) => Response.json({ error }, { status: 400, headers: { ...CORS, 'Cache-Control': 'no-store' } });
  let tokens = null;
  if (f.get('grant_type') === 'authorization_code') {
    if (!f.get('code') || !f.get('code_verifier') || !f.get('redirect_uri')) return fail('invalid_request');
    tokens = redeemCode(f.get('code')!, f.get('code_verifier')!, f.get('redirect_uri')!);
  } else if (f.get('grant_type') === 'refresh_token') {
    tokens = f.get('refresh_token') ? refresh(f.get('refresh_token')!) : null;
  } else return fail('unsupported_grant_type');
  if (!tokens) return fail('invalid_grant');
  return Response.json(tokens, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
}
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
