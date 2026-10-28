import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { editPrompt, currentScene, projectTitle } = body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are Cortexi's AI Timeline Editor. The user wants to adjust an animation scene.
Project: "${projectTitle}"
User edit prompt: "${editPrompt}"
Current scene data: ${JSON.stringify(currentScene)}

Return an updated scene reflecting the edit. Keep unchanged fields, and modify fields like stykAction, expression, headline, voiceover, infographic, or props accordingly.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            headline: { type: Type.STRING },
            voiceover: { type: Type.STRING },
            stykAction: { type: Type.STRING },
            expression: { type: Type.STRING },
            infographic: { type: Type.STRING },
            infographicLabel: { type: Type.STRING },
            infographicValue: { type: Type.STRING },
            props: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            changeSummary: { type: Type.STRING },
          },
          required: ['title', 'headline', 'stykAction', 'expression'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in prompt edit:', error);
    return NextResponse.json(
      { error: (error as Error)?.message || 'Failed to edit scene' },
      { status: 500 }
    );
  }
}
