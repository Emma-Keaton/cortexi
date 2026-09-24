import { StoryboardSchema, type Storyboard } from './types.js';

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
export async function generateStoryboard(opts: {
  prompt: string;
  aspect: Storyboard['aspect'];
  apiKey?: string;
  provider?: 'groq' | 'gemini';
}): Promise<Storyboard> {
  const { prompt, aspect, apiKey, provider = 'groq' } = opts;
  let scenes: Storyboard['scenes'] | null = null;
  let title = 'Untitled Video';

  if (apiKey) {
    try {
      const raw = await callLlm(provider, apiKey, prompt);
      const parsed = JSON.parse(raw);
      title = parsed.title || title;
      scenes = parsed.scenes;
    } catch (e) {
      console.warn('[llm] API failed, using fallback generator:', (e as Error).message);
    }
  }
  if (!scenes) {
    const fb = fallbackScenes(prompt);
    scenes = fb.scenes;
    title = fb.title;
  }

  return StoryboardSchema.parse({
    title,
    aspect,
    fps: 30,
    style: {},
    voice: {},
    captions: true,
    scenes: scenes.map((s, i) => ({ ...s, id: `s${i + 1}` })),
  });
}

async function callLlm(provider: string, apiKey: string, prompt: string): Promise<string> {
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
  const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'allam-2-7b'];
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
