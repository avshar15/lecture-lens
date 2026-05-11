import OpenAI from 'openai';
import { TranscriptChunk } from './ingestion';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SearchResult {
  text: string;
  timestamp: number;
  timestampFormatted: string;
  relevanceScore: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function runSearchAgent(
  query: string,
  chunks: TranscriptChunk[]
): Promise<SearchResult[]> {
  // Embed the query
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const queryVector = queryEmbedding.data[0].embedding;

  // Embed all chunks
  const chunkTexts = chunks.map(c => c.text);
  const chunkEmbeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunkTexts,
  });

  // Score each chunk against the query
  const scored = chunks.map((chunk, i) => {
    const chunkVector = chunkEmbeddings.data[i].embedding;
    const score = cosineSimilarity(queryVector, chunkVector);
    return {
      text: chunk.text,
      timestamp: chunk.timestamp,
      timestampFormatted: chunk.timestampFormatted,
      relevanceScore: score,
    };
  });

  // Return top 3 most relevant chunks
  return scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);
}
