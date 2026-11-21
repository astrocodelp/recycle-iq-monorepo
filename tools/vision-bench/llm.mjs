// Runs a vision model on every manifest item through the Vercel AI Gateway (OpenAI-compatible API).
// Usage: AI_GATEWAY_API_KEY=… node llm.mjs <model> <cache_dir> [limit]
// Resumable: results/<model>.jsonl keeps one line per item; items already there are skipped.
// Stops by itself when the spend in this run passes BUDGET_USD (default 6).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const [model, cache, limitArg] = process.argv.slice(2);
const { classes } = JSON.parse(readFileSync('./classes.json', 'utf8'));
const { items } = JSON.parse(readFileSync('./manifest.json', 'utf8'));
const OUT = `./results/${model.split('/').join('__')}.jsonl`;
const out = OUT;
const done = new Set(
  existsSync(out)
    ? readFileSync(out, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
        .filter((r) => !r.error)
        .map((r) => r.id)
    : [],
);
const todo = items.filter((i) => !done.has(i.id)).slice(0, limitArg ? Number(limitArg) : undefined);
const BUDGET = Number(process.env.BUDGET_USD ?? 6);
const KEY = process.env.AI_GATEWAY_API_KEY ?? 'proxy-injected';

const PROMPT = `You are sorting household waste in Athens, Greece. Look at the main item in the photo and classify its material.
Choose exactly one: plastic, paper, cardboard, metal, glass, food (food or organic scraps), battery, textile (clothes, shoes, fabric), general (non-recyclable or mixed rubbish).
Reply only with JSON: {"material": "<one of the list>", "confidence": <number from 0 to 1>}`;
const schema = {
  type: 'object',
  properties: { material: { type: 'string', enum: classes }, confidence: { type: 'number' } },
  required: ['material', 'confidence'],
  additionalProperties: false,
};
const SYN = {
  organic: 'food',
  biological: 'food',
  clothes: 'textile',
  clothing: 'textile',
  shoes: 'textile',
  fabric: 'textile',
  trash: 'general',
  rubbish: 'general',
  aluminium: 'metal',
  aluminum: 'metal',
  tin: 'metal',
  carton: 'cardboard',
};

function parse(text) {
  let material = null;
  let confidence = null;
  try {
    const j = JSON.parse(text.replace(/^```(json)?|```$/g, '').trim());
    const v = j.material ?? Object.values(j).find((x) => typeof x === 'string');
    material = typeof v === 'string' ? v.toLowerCase().trim() : null;
    confidence = typeof j.confidence === 'number' ? j.confidence : null;
  } catch {
    const m = text.toLowerCase().match(new RegExp(`\\b(${[...classes, ...Object.keys(SYN)].join('|')})\\b`));
    material = m?.[1] ?? null;
  }
  if (material && SYN[material]) material = SYN[material];
  return { material: classes.includes(material) ? material : null, confidence };
}

let spent = 0;
let n = 0;
let stop = false;
// Decision models (e.g. google/gemini-decision-1) use the Decisions API: one "choice" question over the classes.
const DECISION = model.includes('decision');
const DESCRIBE = {
  food: 'food or organic scraps',
  textile: 'clothes, shoes, fabric',
  general: 'non-recyclable or mixed rubbish',
};
async function runDecision(item, img) {
  const body = {
    model,
    input: [{ role: 'user', content: [{ type: 'input_text', text: 'Photo of household waste in Athens, Greece.' }, { type: 'input_image', image_url: `data:image/jpeg;base64,${img}` }] }],
    questions: [
      {
        type: 'choice',
        name: 'material',
        instructions: 'What material is the main item in the photo?',
        choices: classes.map((c) => (DESCRIBE[c] ? { value: c, description: DESCRIBE[c] } : { value: c })),
      },
    ],
  };
  const t0 = performance.now();
  const res = await fetch('https://ai-gateway.vercel.sh/v1/decisions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const ms = performance.now() - t0;
  if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
  const r = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(r).slice(0, 200));
  const a = r.answers?.[0] ?? {};
  const cost = Number(r.provider_metadata?.gateway?.cost ?? 0);
  return { pred: classes.includes(a.choice) ? a.choice : null, confidence: a.confidence ?? null, raw: JSON.stringify(a).slice(0, 200), ms: Math.round(ms), cost, inTok: r.usage?.input_tokens, outTok: r.usage?.output_tokens };
}

async function run(item) {
  const img = readFileSync(`${cache}/${item.id.split('/').join('__')}.jpg`).toString('base64');
  if (DECISION) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const out = await runDecision(item, img);
        spent += out.cost;
        appendFileSync(OUT, JSON.stringify({ id: item.id, ...out }) + '\n');
        return;
      } catch (e) {
        if (attempt === 3) {
          appendFileSync(OUT, JSON.stringify({ id: item.id, pred: null, error: String(e).slice(0, 200) }) + '\n');
          return;
        }
        await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      }
    }
  }
  const body = {
    model,
    messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img}` } }] }],
    response_format: { type: 'json_schema', json_schema: { name: 'waste', schema, strict: true } },
    temperature: 0,
    max_tokens: 200,
    ...(model.includes('gemini') ? { reasoning_effort: 'minimal' } : {}),
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const t0 = performance.now();
    try {
      const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      const ms = performance.now() - t0;
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const r = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(r).slice(0, 200));
      const text = r.choices?.[0]?.message?.content ?? '';
      const { material, confidence } = parse(text);
      const cost = r.usage?.cost ?? 0;
      spent += cost;
      appendFileSync(
        out,
        JSON.stringify({ id: item.id, pred: material, confidence, raw: text.slice(0, 200), ms: Math.round(ms), cost, inTok: r.usage?.prompt_tokens, outTok: r.usage?.completion_tokens }) + '\n',
      );
      return;
    } catch (e) {
      if (attempt === 3) {
        appendFileSync(out, JSON.stringify({ id: item.id, pred: null, error: String(e).slice(0, 200) }) + '\n');
        return;
      }
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    }
  }
}

const queue = [...todo];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length && !stop) {
      await run(queue.shift());
      if (++n % 100 === 0) console.log(`${model}: ${n}/${todo.length} · $${spent.toFixed(3)}`);
      if (spent > BUDGET) {
        stop = true;
        console.log(`Budget reached ($${spent.toFixed(2)}), stopping.`);
      }
    }
  }),
);
console.log(`${model}: done ${n} items · $${spent.toFixed(3)} this run`);
