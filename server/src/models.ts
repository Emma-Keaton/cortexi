export const PLANNING_MODELS = [
  { id: 'gpt-oss-120b', provider: 'groq', label: 'GPT-OSS 120B', modelId: 'openai/gpt-oss-120b' },
  { id: 'gemini-2.5-flash', provider: 'gemini', label: 'Gemini 2.5 Flash', modelId: 'gemini-2.5-flash' },
] as const;
export type PlanningModel = (typeof PLANNING_MODELS)[number];
