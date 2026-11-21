import { assistantConfigured, assistantModels } from '@/lib/assistant/config';

export const dynamic = 'force-dynamic';

/** The open-weight models a client may pick for the assistant, and the default. */
export async function GET() {
  return Response.json({ ...assistantModels(), enabled: assistantConfigured(), gateway: 'Vercel AI Gateway' });
}
