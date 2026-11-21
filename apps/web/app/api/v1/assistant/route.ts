import { ASSISTANT_ACTION_TOOLS } from '@recycleiq/engine';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type ToolApprovalConfiguration,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { error } from '@/lib/api';
import { assistantConfigured, pickModel } from '@/lib/assistant/config';
import { systemPrompt } from '@/lib/assistant/prompt';
import { buildTools, type AssistantTools } from '@/lib/assistant/tools';
import { getDistricts } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({
  messages: z.array(z.any()).min(1).max(60),
  mode: z.enum(['citizen', 'municipal']).default('citizen'),
  model: z.string().max(80).optional(),
  lang: z.enum(['el', 'en']).default('el'),
  /** Neighbourhood only: coordinates are never accepted (GDPR). */
  districtId: z.string().max(64).nullish(),
  deviceId: z.string().max(64).nullish(),
  binSource: z.enum(['synthetic', 'osm']).default('synthetic'),
  /** 'app' asks for headers that keep React Native streaming working (see the AI SDK Expo guide). */
  client: z.enum(['web', 'app']).default('web'),
});

/**
 * "Ρώτα το RecycleIQ": an agentic assistant on open-weight models through the Vercel AI Gateway.
 * Tools reuse the dashboard's own queries; actions need the user's approval in the chat.
 */
export async function POST(req: Request) {
  if (!assistantConfigured()) return error(503, 'Assistant not configured (AI Gateway)');
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return error(400, 'Invalid JSON');
  }
  if (!parsed.success) return error(400, 'Invalid body', parsed.error.issues);
  const body = parsed.data;

  const districts = await getDistricts();
  const district = body.districtId ? districts.find((d) => d.id === body.districtId) : undefined;
  const tools = buildTools({
    mode: body.mode,
    lang: body.lang,
    deviceId: body.deviceId ?? null,
    districtId: district?.id ?? null,
    binSource: body.binSource,
  }) as AssistantTools;

  const approval = Object.fromEntries(
    ASSISTANT_ACTION_TOOLS.filter((name) => name in tools).map((name) => [name, 'user-approval' as const]),
  ) as ToolApprovalConfiguration<AssistantTools, Record<string, unknown>>;

  const messages = body.messages as UIMessage[];
  const result = streamText({
    model: pickModel(body.model),
    system: systemPrompt({ mode: body.mode, lang: body.lang, districtName: district ? district.name[body.lang] : null, binSource: body.binSource }),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    toolApproval: approval,
    ...(process.env.ASSISTANT_APPROVAL_SECRET ? { experimental_toolApprovalSecret: process.env.ASSISTANT_APPROVAL_SECRET } : {}),
    stopWhen: isStepCount(8),
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: messages,
      onError: (e) => {
        console.warn('assistant error', e);
        return body.lang === 'el' ? 'Κάτι πήγε στραβά με τον βοηθό. Δοκίμασε ξανά.' : 'The assistant hit a problem. Please try again.';
      },
    }),
    ...(body.client === 'app' ? { headers: { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'none' } } : {}),
  });
}
