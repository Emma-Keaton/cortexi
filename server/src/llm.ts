import type { Storyboard } from './types.js';
import { normalizeStoryboard } from './storyboard.js';

const SYSTEM = `You are a video storyboard planner. Given a user's description of the video they want (brand promo, explainer, intro, etc.), output ONLY valid JSON matching this exact schema, no markdown fences:
{
  "title": string,
  "scenes": [
    { "id": "s1", "template": "title-card"|"feature"|"outro", "headline": string (max 8 words), "body": string (max 25 words, optional), "animation": "fade-up"|"zoom"|"slide-left" }
  ]
}
Rules:
- First scene MUST be "title-card", last scene MUST be "outro" with a call to action.
- 3 to 6 scenes total. "feature" scenes in the middle each highlight ONE point.
- Keep text short and punchy - it will be spoken as voiceover and shown on screen.
- body text of each scene is exactly what the voiceover will say.`;

/** Generate a storyboard via Groq (OpenAI-compatible) or Gemini free tier. Falls back to rule-based. */
/**
 * Build the planner prompt. Brand context is appended only when present so we do
 * not waste tokens on an empty brand kit.
 */
function buildPlannerPrompt(
  prompt: string,
  opts: { brandAssets?: Array<{ id: string; name: string; role: string }>; brandStyle?: Record<string, unknown> },
): string {
  const parts = [prompt];
  if (opts.brandAssets?.length) {
    const list = opts.brandAssets
      .map((a) => `${a.id}="${a.name}" (${a.role})`)
      .join(', ');
    parts.push(`Brand assets available - reference an id in scene.image if it fits: ${list}.`);
  }
  if (opts.brandStyle && Object.keys(opts.brandStyle).length) {
    parts.push(`Brand style (must be respected): ${JSON.stringify(opts.brandStyle)}`);
  }
  parts.push('Vary the composition templates. Keep each scene headline under 6 words. First scene is the title card, last scene is the outro with a call to action.');
  return parts.join('\n\n');
}

export async function generateStoryboard(opts: {
  prompt: string;
  aspect: Storyboard['aspect'];
  apiKey?: string;
  provider?: 'groq' | 'gemini' | 'huggingface';
  brandAssets?: Array<{ id: string; name: string; role: string; url?: string }>;
  brandStyle?: Record<string, unknown>;
}): Promise<Storyboard> {
  // Prefer the hosted free route when a shared HF token is configured and the
  // caller did not explicitly pick a provider.
  const provider = opts.provider ?? (process.env.HF_TOKEN ? 'huggingface' : 'groq');
  const { prompt, aspect, apiKey } = opts;
  let scenes: Storyboard['scenes'] | null = null;
  let title = 'Untitled Video';

  // Resolution order: browser-supplied key first, then the server's shared key for
  // the selected provider. This is what lets the hosted app work with no user key.
  const sharedKey =
    provider === 'huggingface'
      ? process.env.HF_TOKEN
      : provider === 'gemini'
        ? process.env.CORTEXI_GEMINI_KEY
        : process.env.CORTEXI_GROQ_KEY;
  const effectiveKey = apiKey || sharedKey;

  if (effectiveKey) {
    try {
      const raw = await callLlm(provider, effectiveKey, buildPlannerPrompt(prompt, opts));
      const parsed = parseModelJson(raw);
      title = parsed.title || title;
      if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) scenes = parsed.scenes;
    } catch (e) {
      console.warn('[llm] API failed, using fallback generator:', (e as Error).message);
    }
  }
  if (!scenes) {
    const fb = fallbackScenes(prompt);
    scenes = fb.scenes;
    title = fb.title;
  }

  // Normalization guarantees the structural invariants the renderer and TTS rely on.
  return normalizeStoryboard({
    title,
    aspect,
    fps: 30,
    style: (opts.brandStyle ?? {}) as Storyboard['style'],
    voice: {
      engine: process.env.PIPER_VOICES ? 'piper' : process.env.KOKORO_VOICES ? 'kokoro' : 'none',
      voice: (process.env.PIPER_VOICES ?? process.env.KOKORO_VOICES ?? '').split(',').map((v) => v.trim()).find(Boolean) ?? 'none',
    },
    captions: true,
    scenes,
  });
}

/**
 * Strict JSON Schema handed to providers that support grammar-constrained decoding.
 * Constrained decoding means the model cannot emit trailing text, markdown fences,
 * or broken JSON - which is why arbitrary user text/spacing is safe here.
 */
const STORYBOARD_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'scenes'],
  properties: {
    title: { type: 'string' },
    scenes: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['template', 'headline', 'animation'],
        properties: {
          template: { type: 'string', enum: ['title-card', 'feature', 'outro'] },
          headline: { type: 'string' },
          body: { type: 'string' },
          animation: { type: 'string', enum: ['fade-up', 'zoom', 'slide-left', 'slide-right', 'mask-reveal'] },
        },
      },
    },
  },
} as const;

/**
 * Parse a model response leniently. Constrained decoding makes this a no-op on the
 * happy path, but providers that ignore `json_schema` still get a second chance.
 */
export function parseModelJson(raw: string): { title?: string; scenes?: any[] } {
  const text = String(raw ?? '').trim();
  const candidates = [text];

  // Strip markdown fences, e.g. ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());

  // Fall back to the outermost {...} span.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));

  let lastError: unknown;
  for (const candidate of candidates) {
    for (const attempt of [candidate, repairJson(candidate)]) {
      if (!attempt) continue;
      try {
        const parsed = JSON.parse(attempt);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {
        lastError = e;
      }
    }
  }
  throw new Error(`Model response was not valid JSON: ${(lastError as Error)?.message ?? 'unknown'}`);
}

/** Remove trailing commas and unescaped smart quotes that break strict JSON.parse. */
function repairJson(input: string): string {
  return input
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
}

async function callLlm(provider: string, apiKey: string, prompt: string): Promise<string> {
  if (provider === 'huggingface') {
    const url = process.env.CORTEXI_HF_INFERENCE_URL ?? 'https://router.huggingface.co/v1/chat/completions';
    // Try a primary model, then progressively larger fallbacks. Each is asked for a
    // grammar-constrained JSON schema, so a malformed body is not the usual failure mode.
    // Qwen first (best instruction-following per FLOP on the Router), then larger
    // Qwen fallbacks, then a non-Qwen last resort. Each is asked for a
    // grammar-constrained JSON schema, so a malformed body is not the usual failure mode.
    const configured = (process.env.CORTEXI_HF_MODEL ?? '').trim();
    const models = [
      ...(configured ? [configured] : []),
      'Qwen/Qwen2.5-1.5B-Instruct',
      'Qwen/Qwen2.5-3B-Instruct',
      'Qwen/Qwen2.5-7B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct',
    ].filter((m, i, all) => all.indexOf(m) === i);

    let lastErr = '';
    for (const model of models) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey || process.env.HF_TOKEN || ''}` },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 1200,
          // strict json_schema => provider-side constrained decoding
          response_format: { type: 'json_schema', json_schema: { name: 'Storyboard', schema: STORYBOARD_JSON_SCHEMA, strict: true } },
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        lastErr = `HF ${model} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
        // 400 usually means the provider cannot do json_schema for this model -> try next.
        if (res.status !== 400 && res.status !== 404 && res.status !== 429) break;
        continue;
      }
      const data = (await res.json()) as any;
      const content = data.choices?.[0]?.message?.content ?? '';
      if (content) return content;
      lastErr = `HF ${model} returned an empty completion`;
    }
    throw new Error(lastErr || 'Hugging Face returned no usable completion');
  }
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.CORTEXI_GEMINI_MODEL ?? 'gemini-2.0-flash'}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM}\n\nUser request: ${prompt}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = (await res.json()) as any;
    return data.candidates[0].content.parts[0].text;
  }
  // Groq (OpenAI-compatible). Try models in order until one is available on this key.
  const models = ['openai/gpt-oss-120b', 'qwen/qwen3-8b', 'llama-3.3-70b-versatile'];
  let lastErr = '';
  for (const model of models) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      return data.choices[0].message.content;
    }
    lastErr = `Groq ${model} HTTP ${res.status}: ${await res.text()}`;
    if (res.status !== 404) break; // only switch models on model_not_found
  }
  throw new Error(lastErr);
}

/** Offline rule-based storyboard from the raw prompt. */
function fallbackScenes(prompt: string): { title: string; scenes: Storyboard['scenes'] } {
  const sentences = prompt
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 4);
  const title = sentences[0]?.split(' ').slice(0, 5).join(' ') || 'My Video';
  const mids = sentences.slice(1, 4).map((s, i) => ({
    id: `s${i + 2}`,
    template: 'feature' as const,
    headline: s.split(' ').slice(0, 6).join(' '),
    body: s,
    animation: (['fade-up', 'zoom', 'slide-left'] as const)[i % 3],
  }));
  return {
    title,
    scenes: [
      { id: 's1', template: 'title-card', headline: title, body: sentences[0], animation: 'zoom' },
      ...mids,
      { id: 'sX', template: 'outro', headline: 'Get Started Today', body: 'Thanks for watching.', animation: 'fade-up' },
    ],
  };
}


