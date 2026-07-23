import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export async function POST(request: NextRequest) {
  try {
    const { content, targetLanguage } = await request.json();

    if (!content || !targetLanguage) {
      return NextResponse.json(
        { error: 'Content and target language are required' },
        { status: 400 }
      );
    }

    const safeContent = {
      summaryShort: truncateText(content.summaryShort, 500),
      summaryMedium: truncateText(content.summaryMedium, 1500),
      summaryFull: truncateText(content.summaryFull, 2000),
      outline: (content.outline || []).map((item: any) => ({
        ...item,
        title: truncateText(item.title, 100),
        summary: truncateText(item.summary, 300),
      })),
      flashcards: (content.flashcards || []).map((card: any) => ({
        ...card,
        question: truncateText(card.question, 200),
        answer: truncateText(card.answer, 300),
      })),
    };

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `Translate the following study materials to ${targetLanguage}. Keep all JSON structure intact. Only translate the text values, not the keys. Do not add any commentary or explanation. Return ONLY valid JSON, nothing else.\n\n${JSON.stringify(safeContent)}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json|```/g, '').trim();

    let translated;
    try {
      translated = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Translation parsing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      translated,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
