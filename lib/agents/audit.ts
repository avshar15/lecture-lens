import Anthropic from '@anthropic-ai/sdk';
import { TranscriptChunk } from './ingestion';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface FacultyAuditResult {
  topPriorityFix: string;
  pedagogicalScore: number;
  accessibilityScore: number;
  clarityScore: number;
  equityScore: number;
  findings: {
    category: string;
    issue: string;
    timestamp: number;
    timestampFormatted: string;
    suggestedRewrite: string;
  }[];
  overallSummary: string;
}

export interface CurriculumMapResult {
  objectives: {
    objective: string;
    coverageLevel: 'thorough' | 'partial' | 'missing';
    coverageScore: number;
    relevantTimestamps: {
      timestamp: number;
      timestampFormatted: string;
      excerpt: string;
    }[];
    notes: string;
  }[];
  overallCoverage: number;
  underservedObjectives: string[];
  summary: string;
}

export async function runFacultyAuditAgent(
  chunks: TranscriptChunk[],
  fullText: string
): Promise<FacultyAuditResult> {
  const transcriptWithTimestamps = chunks
    .map(c => `[${c.timestampFormatted}] ${c.text}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `You are a trusted pedagogical advisor reviewing a lecture for a faculty member. 
Your tone is that of a supportive colleague, not a grader. Be specific, constructive, and restrained.

Analyze this lecture transcript and return a JSON object with exactly this structure:
{
  "topPriorityFix": "The single most important thing to change before publishing. One sentence.",
  "pedagogicalScore": <number 1-10>,
  "accessibilityScore": <number 1-10>,
  "clarityScore": <number 1-10>,
  "equityScore": <number 1-10>,
  "findings": [
    {
      "category": "Clarity|Accessibility|Pedagogy|Equity",
      "issue": "Specific issue found",
      "timestamp": <seconds as number>,
      "timestampFormatted": "M:SS",
      "suggestedRewrite": "Specific suggested improvement"
    }
  ],
  "overallSummary": "2-3 sentence overall assessment"
}

Generate 4-6 findings maximum. Focus on the most impactful issues only.
Return ONLY the JSON, no other text.

Transcript:
${transcriptWithTimestamps.slice(0, 8000)}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to generate faculty audit report');
  }
}

export async function runCurriculumMapAgent(
  allChunks: TranscriptChunk[][],
  learningObjectives: string[]
): Promise<CurriculumMapResult> {
  const combinedTranscript = allChunks
    .map((chunks, i) => `--- LECTURE ${i + 1} ---\n${chunks.map(c => `[${c.timestampFormatted}] ${c.text}`).join('\n')}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `You are an academic curriculum analyst. Compare what was actually taught in these lectures against the stated learning objectives.

Learning Objectives:
${learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

Return a JSON object with exactly this structure:
{
  "objectives": [
    {
      "objective": "The objective text",
      "coverageLevel": "thorough|partial|missing",
      "coverageScore": <number 0-100>,
      "relevantTimestamps": [
        {
          "timestamp": <seconds as number>,
          "timestampFormatted": "M:SS",
          "excerpt": "Brief excerpt from lecture"
        }
      ],
      "notes": "Brief explanation of coverage assessment"
    }
  ],
  "overallCoverage": <number 0-100>,
  "underservedObjectives": ["list of objective texts that scored below 50"],
  "summary": "2-3 sentence executive summary for a provost"
}

Return ONLY the JSON, no other text.

Transcripts:
${combinedTranscript.slice(0, 10000)}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to generate curriculum map');
  }
}
