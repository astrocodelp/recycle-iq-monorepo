import 'server-only';
import { PICKABLE_OBJECTS } from '@recycleiq/engine';
import { generateText, Output } from 'ai';
import { z } from 'zod';

/**
 * Photo recognition on the server (docs/VISION.md). The app sends one small JPEG; a vision model on the
 * Vercel AI Gateway picks the catalogue item and says whether it looks greasy or still holds liquid
 * (16/16 each on the condition bench). The photo is not stored or logged.
 *
 *   VISION_MODEL   gateway model id (default google/gemini-3.5-flash-lite: 94.3% material, 96.3% right Athens bin on
 *                  3,170 photos, see docs/BENCHMARK.md)
 */
export const visionModel = () => process.env.VISION_MODEL?.trim() || 'google/gemini-3.5-flash-lite';

/** What each catalogue item covers, in the words the model sees. */
const HINTS: Record<string, string> = {
  'plastic-bottle': 'plastic bottle or other plastic packaging (bottle, tub, cup, tray, wrapper, bag)',
  can: 'metal can or tin (drink can, food tin, aerosol can), aluminium foil tray',
  paper: 'clean paper: newspaper, magazine, office paper, envelope, paper bag, egg carton',
  'cardboard-box': 'cardboard box or carton (clean, not a pizza box)',
  'pizza-box': 'pizza box',
  'food-scraps': 'food scraps, fruit or vegetable peels, leftovers',
  battery: 'battery (AA, AAA, button cell, phone or laptop battery)',
  sofa: 'sofa, armchair, mattress or other large furniture',
  'glass-bottle': 'glass bottle or glass jar',
  clothes: 'clothes, shoes, bags or other textiles',
  'coffee-maker': 'coffee maker or other small electrical appliance (kettle, toaster, hair dryer)',
};

const IDS = PICKABLE_OBJECTS.map((o) => o.id);

const Result = z.object({
  item: z.enum(['other', ...IDS] as [string, ...string[]]),
  confidence: z.number().min(0).max(1),
  seen: z.string().describe('The main object in 2 to 5 plain Greek words, e.g. «κουτάκι αναψυκτικού»'),
  greasy: z.boolean().describe('The item is visibly soiled with grease, oil or food residue'),
  liquid: z.boolean().describe('The container still has liquid or food inside or spilling out'),
});
export type CloudRecognition = z.infer<typeof Result>;

const SYSTEM = [
  'You identify the main waste item in a photo for a recycling app in Athens.',
  'Pick exactly one id from the list. Use "other" if the main object is none of them, if it is a used napkin or tissue,',
  'or if the photo shows no clear object (a person, a room, a street, a blurry frame).',
  'Judge the material carefully: glass is rigid and heavy, with a thick base and sharp reflections; plastic is thinner and may be crushed.',
  'confidence is how sure you are, from 0 to 1.',
  'greasy: is it visibly soiled with grease, oil or food? liquid: does the container still hold liquid or food?',
  'Items:',
  ...IDS.map((id) => `- ${id}: ${HINTS[id] ?? PICKABLE_OBJECTS.find((o) => o.id === id)?.name.en}`),
].join('\n');

export async function recognizePhoto(jpeg: Uint8Array, signal?: AbortSignal): Promise<CloudRecognition> {
  const { output } = await generateText({
    model: visionModel(),
    system: SYSTEM,
    output: Output.object({ schema: Result }),
    abortSignal: signal,
    maxRetries: 1,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'file', mediaType: 'image/jpeg', data: jpeg },
          { type: 'text', text: 'Which item is this?' },
        ],
      },
    ],
  });
  return output;
}
