import { checkLoginCode, issueCode, origin, redirectAllowed } from '@/lib/mcp/auth';

/** The login form posts here: right code → back to the AI client with an authorization code. */
export async function POST(req: Request) {
  const f = await req.formData();
  const get = (k: string) => String(f.get(k) ?? '');
  const redirectUri = get('redirect_uri');
  const challenge = get('code_challenge');
  if (!redirectAllowed(redirectUri) || !challenge) return new Response('Invalid authorization request', { status: 400 });
  const back = new URLSearchParams();
  for (const k of ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope', 'resource']) if (get(k)) back.set(k, get(k));
  if (f.get('deny')) {
    const u = new URL(redirectUri);
    u.searchParams.set('error', 'access_denied');
    if (get('state')) u.searchParams.set('state', get('state'));
    return Response.redirect(u, 303);
  }
  if (!checkLoginCode(get('login_code'))) {
    back.set('error', '1');
    return Response.redirect(`${origin(req)}/oauth/authorize?${back}`, 303);
  }
  const u = new URL(redirectUri);
  u.searchParams.set('code', issueCode({ clientId: get('client_id'), redirectUri, challenge, method: get('code_challenge_method') || 'S256' }));
  if (get('state')) u.searchParams.set('state', get('state'));
  return Response.redirect(u, 303);
}
