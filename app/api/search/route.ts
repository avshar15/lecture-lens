import { NextRequest, NextResponse } from 'next/server';
import { runSearchAgent } from '@/lib/agents/search';
import { TranscriptChunk } from '@/lib/agents/ingestion';

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

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
