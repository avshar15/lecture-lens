import Anthropic from '@anthropic-ai/sdk';
import { TranscriptChunk } from './ingestion';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface OutlineItem {
  title: string;
  timestamp: number;
  timestampFormatted: string;
  summary: string;
}

export interface Flashcard {
  question: string;
  answer: string;
  timestamp: number;
  timestampFormatted: string;
}

export interface AnalysisResult {
  outline: OutlineItem[];
  summaryShort: string;
  summaryMedium: string;
  summaryFull: string;
  flashcards: Flashcard[];
}

export async function runAnalysisAgent(
  chunks: TranscriptChunk[],
  fullText: string
): Promise<AnalysisResult> {
  const transcriptWithTimestamps = chunks
    .map(c => `[${c.timestampFormatted}] ${c.text}`)
    .join('\n');

  // Generate outline + flashcards
  const structureResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `You are an expert study assistant. Analyze this lecture transcript and return a JSON object with exactly this structure:
{
  "outline": [
    {
      "title": "Topic title",
      "timestamp": <seconds as number>,
      "timestampFormatted": "M:SS",
      "summary": "2-3 sentence summary of this section"
    }
  ],
  "flashcards": [
    {
      "question": "Question about a key concept",
      "answer": "Clear, concise answer",
      "timestamp": <seconds as number>,
      "timestampFormatted": "M:SS"
    }
  ]
}

Generate 5-8 outline sections and 8-12 flashcards. Every item must have a real timestamp from the transcript.
Return ONLY the JSON, no other text.

Transcript:
${transcriptWithTimestamps}`,
      },
    ],
  });

  const structureText = structureResponse.content[0].type === 'text'
    ? structureResponse.content[0].text
    : '';

  let structure = { outline: [], flashcards: [] };
  try {
    const cleaned = structureText.replace(/```json|```/g, '').trim();
    structure = JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse structure JSON');
  }

  // Generate three summaries
  const summaryResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `You are an expert study assistant. Based on this lecture transcript, generate three summaries in JSON format:
{
  "summaryShort": "A 90-second read (around 150 words). The absolute core message only.",
  "summaryMedium": "A 5-minute read (around 500 words). Key concepts with enough detail to understand.",
  "summaryFull": "A comprehensive summary (around 1000 words). Everything a student needs to know."
}

Return ONLY the JSON, no other text.

Transcript:
${fullText.slice(0, 8000)}`,
      },
    ],
  });

  const summaryText = summaryResponse.content[0].type === 'text'
    ? summaryResponse.content[0].text
    : '';

  let summaries = {
    summaryShort: '',
    summaryMedium: '',
    summaryFull: '',
  };
  try {
    const cleaned = summaryText.replace(/```json|```/g, '').trim();
    summaries = JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse summary JSON');
  }

  return {
    outline: structure.outline || [],
    flashcards: structure.flashcards || [],
    ...summaries,
  };
}
