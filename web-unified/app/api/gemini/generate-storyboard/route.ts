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
    const {
      prompt,
      mode = 'Idea',
      format = 'Styk Animated Story',
      duration = 30,
      aspectRatio = '9:16',
      style = 'comic_pop',
    } = body;

    const systemPrompt = `You are the lead Director & Story Engine for Cortexi, an AI video synthesis workstation synthesizing stickman animations and UI infographics.
Given a prompt, decompose the video concept into 3 to 5 cinematic, punchy storyboard scenes matching total duration ${duration} seconds.
Each scene must specify:
1. title: short scene title
2. headline: engaging on-screen kinetic hook
3. duration: duration in seconds (sum must equal ~${duration}s)
4. animation: 'fade-up' | 'zoom' | 'slide-left' | 'kinetic'
5. voiceover: crisp, conversational narration script for this scene
6. stykAction: 'walk' | 'run' | 'wave' | 'point' | 'sit' | 'scratch_head' | 'jump' | 'shocked' | 'celebrate' | 'idle'
7. stykFacing: 'left' | 'right'
8. expression: 'neutral' | 'happy' | 'confused' | 'shocked' | 'thinking'
9. infographic: 'none' | 'metric_counter' | 'bar_chart' | 'terminal' | 'alert_card' | 'sparkline'
10. infographicLabel: concise title or metric label (if applicable)
11. infographicValue: metric value e.g. '+240%', '10x' (if applicable)
12. props: array of strings from ['laptop', 'lightbulb', 'coffee', 'desk', 'phone', 'clock']
13. captionStyle: 'karaoke' | 'lower_third' | 'speech_bubble' | 'minimal'`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Create a ${duration}-second video storyboard for: "${prompt}".
Format: ${format}, Mode: ${mode}, Aspect Ratio: ${aspectRatio}, Visual Style: ${style}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  duration: { type: Type.NUMBER },
                  animation: { type: Type.STRING },
                  voiceover: { type: Type.STRING },
                  stykAction: { type: Type.STRING },
                  stykFacing: { type: Type.STRING },
                  expression: { type: Type.STRING },
                  infographic: { type: Type.STRING },
                  infographicLabel: { type: Type.STRING },
                  infographicValue: { type: Type.STRING },
                  props: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  captionStyle: { type: Type.STRING },
                },
                required: ['title', 'headline', 'duration', 'voiceover', 'stykAction', 'expression'],
              },
            },
          },
          required: ['title', 'scenes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('Error generating storyboard:', error);
    return NextResponse.json(
      { error: (error as Error)?.message || 'Failed to generate storyboard' },
      { status: 500 }
    );
  }
}
