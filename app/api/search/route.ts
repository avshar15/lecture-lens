import { NextRequest, NextResponse } from 'next/server';
import { runSearchAgent } from '@/lib/agents/search';
import { TranscriptChunk } from '@/lib/agents/ingestion';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { query, chunks } = await request.json();

    if (!query || !chunks) {
      return NextResponse.json(
        { error: 'Query and chunks are required' },
        { status: 400 }
      );
    }

    const results = await runSearchAgent(query, chunks as TranscriptChunk[]);

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        answer: "This specific topic wasn't covered in the lecture.",
        sources: [],
      });
    }

    const context = results
      .map((r, i) => `[Source ${i + 1} at ${r.timestampFormatted}]: ${r.text}`)
      .join('\n\n');

    const synthesis = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `A student asked: "${query}"

Here are the most relevant moments from the lecture transcript:

${context}

Answer in 1-2 sentences using only the information above.
- If the question contains spelling errors, interpret what they meant
- If the topic is not covered in these excerpts, say "This specific topic wasn't covered in the lecture"
- Be direct — the student is studying for an exam
- Never make up information not present in the excerpts

Answer:`,
        },
      ],
    });

    const answer = synthesis.content[0].type === 'text'
      ? synthesis.content[0].text
      : "Couldn't generate answer.";

    return NextResponse.json({
      success: true,
      answer,
      sources: results,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
