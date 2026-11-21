import 'server-only';

/**
 * Assistant model configuration. Models are open-weight models served through the Vercel AI
 * Gateway, addressed as 'provider/model'. On Vercel the gateway authenticates with OIDC; elsewhere
 * set AI_GATEWAY_API_KEY.
 *
 *   ASSISTANT_MODEL   default model                      (default openai/gpt-oss-120b)
 *   ASSISTANT_MODELS  comma-separated allowlist a client may pick from
 */
const DEFAULT_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'alibaba/qwen-3-32b',
  'meta/llama-4-scout',
  'alibaba/qwen3-next-80b-a3b-instruct',
];

/**
 * Open-weight model families only. A model in ASSISTANT_MODELS / ASSISTANT_MODEL that is not open-weight is
 * ignored, so a configuration mistake can never route residents' questions to a closed model.
 */
const OPEN_WEIGHT = /^(openai\/gpt-oss|alibaba\/qwen|meta\/llama|google\/gemma|mistral\/(mistral|ministral|mixtral|devstral|magistral|pixtral)|deepseek\/|moonshotai\/kimi|zai\/glm|nvidia\/nemotron|ibm\/granite|microsoft\/phi)/i;
export const isOpenWeight = (id: string) => OPEN_WEIGHT.test(id);

export function assistantModels(): { models: string[]; defaultModel: string } {
  const fromEnv = (process.env.ASSISTANT_MODELS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+\/[a-z0-9.:_-]+$/i.test(s) && isOpenWeight(s));
  const models = fromEnv.length ? fromEnv : DEFAULT_MODELS;
  const wanted = process.env.ASSISTANT_MODEL?.trim();
  const defaultModel = wanted && models.includes(wanted) ? wanted : models[0]!;
  return { models, defaultModel };
}

/** The requested model if it is on the allowlist, otherwise the default. */
export function pickModel(requested?: string | null): string {
  const { models, defaultModel } = assistantModels();
  return requested && models.includes(requested) ? requested : defaultModel;
}

/** Whether the gateway can be reached: OIDC on Vercel, or an API key. */
export const assistantConfigured = () => !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
