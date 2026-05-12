import Anthropic from '@anthropic-ai/sdk';
import { TranscriptChunk } from './ingestion';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface OutlineItem {
  title: string;
  timestamp: number;
  timestampFormatted: string;
  endTimestamp: number;
  endTimestampFormatted: string;
  summary: string;
}

export interface Flashcard {
  question: string;
  answer: string;
  timestamp: number;
  timestampFormatted: string;
  sectionTitle: string;
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
  const videoDurationSeconds = chunks[chunks.length - 1].timestamp;
  const videoDurationMinutes = Math.floor(videoDurationSeconds / 60);

  // Dynamic summary word counts based on video length
  let studyGuideWords: number;
  let deepNotesWords: number;
  if (videoDurationMinutes <= 20) {
    studyGuideWords = 300;
    deepNotesWords = 600;
  } else if (videoDurationMinutes <= 45) {
    studyGuideWords = 500;
    deepNotesWords = 1000;
  } else if (videoDurationMinutes <= 90) {
    studyGuideWords = 700;
    deepNotesWords = 1500;
  } else {
    studyGuideWords = 900;
    deepNotesWords = 2000;
  }

  // Smart transcript sampling - beginning, middle, and end
  const totalLength = fullText.length;
  const chunkSize = 6000;
  const beginning = fullText.slice(0, chunkSize);
  const middle = fullText.slice(Math.floor(totalLength / 2) - chunkSize / 2, Math.floor(totalLength / 2) + chunkSize / 2);
  const end = fullText.slice(totalLength - chunkSize);
  const sampledTranscript = `[BEGINNING OF LECTURE]\n${beginning}\n\n[MIDDLE OF LECTURE]\n${middle}\n\n[END OF LECTURE]\n${end}`;

  // Generate outline + flashcards
  const structureResponse = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `You are an expert study assistant. Analyze this lecture transcript and return a JSON object with exactly this structure:
{
  "outline": [
    {
      "title": "Topic title",
      "timestamp": <start seconds as number>,
      "timestampFormatted": "M:SS",
      "endTimestamp": <end seconds as number>,
      "endTimestampFormatted": "M:SS",
      "summary": "2-3 sentence summary of this section"
    }
  ],
  "flashcards": [
    {
      "question": "Question about a key concept",
      "answer": "Clear, concise answer",
      "timestamp": <seconds as number>,
      "timestampFormatted": "M:SS",
      "sectionTitle": "Must match the outline section title exactly"
    }
  ]
}

This video is ${videoDurationMinutes} minutes long.

OUTLINE RULES — CRITICAL:
- Divide the ENTIRE video into sections based on topic changes only
- Every second of the video must belong to exactly one section, zero gaps
- First section must start at 0:00
- Each section ends exactly where the next begins
- Final section must end near ${videoDurationMinutes}:00
- Minimum section length 3 minutes, maximum 12 minutes
- Never create a section just to hit a time target — only break when the topic genuinely changes
- Each section summary describes only what was taught in that specific window

FLASHCARD RULES — CRITICAL:
- Generate exactly 2-3 flashcards per outline section
- Each flashcard must belong to a specific outline section — set sectionTitle to match the outline section title exactly
- Questions must test conceptual understanding not memorization or trivia
- Questions should be "Why does X work this way" or "What problem does X solve" not "What does X stand for"
- Every flashcard must have both a question AND an answer
- Answer must be plain English explanation a student can understand without jargon
- Timestamp must point to the exact moment in the transcript where the professor explained this concept
- Spread flashcards proportionally — every outline section must have cards

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
    model: 'claude-sonnet-4-5',
    max_tokens: 6000,
    messages: [
      {
        role: 'user',
        content: `You are an expert study assistant. Based on this lecture transcript, generate three summaries in JSON format.

This lecture is ${videoDurationMinutes} minutes long.

Return this exact JSON structure:
{
  "summaryShort": "THE GIST: Exactly 200 words maximum. Pure prose, one paragraph, no headers, no bullets. Answer only: what was this lecture about and why does it matter? Be ruthlessly brief. A student reads this in 60-90 seconds.",
  "summaryMedium": "STUDY GUIDE: Exactly ${studyGuideWords} words. Use short paragraphs with bold headers for each major topic. Cover every concept from the lecture. End with this exact format on a new line: 'MOST IMPORTANT MOMENT: [timestamp in M:SS format] — [one sentence explaining why this moment is the most important concept in the lecture]'",
  "summaryFull": "DEEP NOTES: Exactly ${deepNotesWords} words. Structure it exactly like this:\n\n## The Big Picture\n[One paragraph — what the whole lecture was about]\n\n## Key Concepts\n[One section per major topic with bold header, detailed explanation with specific examples and analogies the professor used]\n\n## The Most Important Moment\n[timestamp in M:SS format] — [one sentence explaining why]\n\n## Exam Must-Knows\n[5-7 bullet points of the highest-yield facts a student needs to know for an exam]"
}

Return ONLY the JSON, no other text.

Transcript:
${sampledTranscript}`,
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
