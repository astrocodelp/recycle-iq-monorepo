import { redirectAllowed } from '@/lib/mcp/auth';

export const metadata = { title: 'Σύνδεση' };
export const dynamic = 'force-dynamic';

/** Login page for the MCP connector (demo: one shared code). Shown by the AI client when the municipality connects RecycleIQ. */
export default async function Authorize({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const valid = !!q.redirect_uri && redirectAllowed(q.redirect_uri) && !!q.code_challenge && (q.response_type ?? 'code') === 'code';
  let client = '';
  try {
    client = q.redirect_uri ? new URL(q.redirect_uri).host : '';
  } catch {}
  const keep = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope', 'resource'] as const;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="eyebrow">RecycleIQ · Δήμος</p>
        <h1 className="mt-1 text-h1">Σύνδεση του AI σου με το RecycleIQ</h1>
        <p className="mt-2 text-body text-muted">
          {client ? (
            <>
              Το <b className="text-ink">{client}</b> ζητά πρόσβαση στα δεδομένα και στις ενέργειες του dashboard του Δήμου.
            </>
          ) : (
            'Ένα AI ζητά πρόσβαση στα δεδομένα και στις ενέργειες του dashboard του Δήμου.'
          )}
        </p>
      </div>
      {!valid ? (
        <p className="card p-4 text-body text-danger">Το αίτημα σύνδεσης δεν είναι έγκυρο. Ξεκίνα τη σύνδεση ξανά από το AI σου.</p>
      ) : (
        <form method="post" action="/api/oauth/authorize" className="card flex flex-col gap-4 p-5">
          {keep.map((k) => (q[k] ? <input key={k} type="hidden" name={k} value={q[k]} /> : null))}
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold text-ink">Κωδικός σύνδεσης</span>
            <input
              name="login_code"
              type="password"
              autoFocus
              autoComplete="one-time-code"
              required
              className="rounded-control border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-forest-700"
            />
          </label>
          {q.error && <p className="text-caption text-danger">Λάθος κωδικός. Δοκίμασε ξανά.</p>}
          <p className="text-caption text-muted">Δοκιμαστική σύνδεση: ο κωδικός είναι κοινός για όλους. Σε κανονική λειτουργία μπαίνει ο λογαριασμός του Δήμου.</p>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-control bg-forest-700 px-4 py-2.5 text-body font-semibold text-white hover:bg-forest-800">
              Σύνδεση
            </button>
            <button type="submit" name="deny" value="1" formNoValidate className="rounded-control bg-surface-2 px-4 py-2.5 text-body font-semibold text-ink hover:bg-line">
              Άκυρο
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
