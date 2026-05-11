import { NextRequest, NextResponse } from 'next/server';
import { runIngestionAgent } from '@/lib/agents/ingestion';
import { runAnalysisAgent } from '@/lib/agents/analysis';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Run Ingestion Agent
    const { chunks, metadata, fullText } = await runIngestionAgent(url);

    // Run Analysis Agent
    const analysis = await runAnalysisAgent(chunks, fullText);

    return NextResponse.json({
      success: true,
      metadata,
      chunks,
      analysis,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
