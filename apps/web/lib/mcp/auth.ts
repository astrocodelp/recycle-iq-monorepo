import 'server-only';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/**
 * Login for the MCP connector. DEMO ONLY: one shared login code (MCP_LOGIN_CODE, default "test123") stands in
 * for a real municipal sign-in. Codes and tokens are stateless HMAC-signed blobs, so nothing is stored.
 * Set MCP_TOKEN_SECRET in production; replace the shared code with the municipality's identity provider.
 */
export const LOGIN_CODE = process.env.MCP_LOGIN_CODE || 'test123';
const SECRET = process.env.MCP_TOKEN_SECRET || 'recycleiq-demo-mcp-secret-change-me';

const ACCESS_TTL = 24 * 3600;
const REFRESH_TTL = 30 * 24 * 3600;
const CODE_TTL = 5 * 60;

type Payload = Record<string, unknown> & { typ: 'code' | 'access' | 'refresh'; exp: number };

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const mac = (body: string) => createHmac('sha256', SECRET).update(body).digest('base64url');

function sign(p: Payload) {
  const body = b64(JSON.stringify(p));
  return `${body}.${mac(body)}`;
}
function verify(token: string, typ: Payload['typ']): Payload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(mac(body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload;
    if (p.typ !== typ || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}
const now = () => Math.floor(Date.now() / 1000);

export function checkLoginCode(code: string) {
  const a = Buffer.from(code.trim());
  const b = Buffer.from(LOGIN_CODE);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Only https redirects, or loopback for desktop and command-line clients. */
export function redirectAllowed(uri: string) {
  try {
    const u = new URL(uri);
    return u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname));
  } catch {
    return false;
  }
}

export function issueCode(p: { clientId: string; redirectUri: string; challenge: string; method: string }) {
  return sign({ typ: 'code', exp: now() + CODE_TTL, ...p });
}

export function redeemCode(code: string, verifier: string, redirectUri: string) {
  const p = verify(code, 'code');
  if (!p || p.redirectUri !== redirectUri) return null;
  const hashed = createHash('sha256').update(verifier).digest('base64url');
  const ok = p.method === 'S256' ? hashed === p.challenge : verifier === p.challenge;
  return ok ? tokens(String(p.clientId)) : null;
}

export function refresh(token: string) {
  const p = verify(token, 'refresh');
  return p ? tokens(String(p.clientId)) : null;
}

function tokens(clientId: string) {
  const sub = 'demo-municipality';
  return {
    access_token: sign({ typ: 'access', exp: now() + ACCESS_TTL, sub, clientId, jti: randomUUID() }),
    refresh_token: sign({ typ: 'refresh', exp: now() + REFRESH_TTL, sub, clientId }),
    token_type: 'Bearer',
    expires_in: ACCESS_TTL,
    scope: 'recycleiq',
  };
}

/** Bearer check for /api/mcp: an issued access token, or the login code itself (for clients that only take a header). */
export function authorize(header: string | null) {
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  if (checkLoginCode(token)) return { sub: 'demo-municipality', clientId: 'static' };
  const p = verify(token, 'access');
  return p ? { sub: String(p.sub), clientId: String(p.clientId) } : null;
}

export function origin(req: Request) {
  const h = req.headers;
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? new URL(req.url).host;
  const proto = h.get('x-forwarded-proto') ?? new URL(req.url).protocol.replace(':', '');
  return `${proto}://${host}`;
}

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, WWW-Authenticate',
};
