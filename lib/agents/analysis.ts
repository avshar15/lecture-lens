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
    max_tokens: 16000,
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
- Timestamp must point to the exact moment where the professor BEGINS explaining this concept clearly, not just where the keyword is first mentioned
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

  let structure: any = { outline: [], flashcards: [] };
  try {
    let cleaned = structureText.trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    structure = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse structure JSON. Raw response length:', structureText.length);
    console.error('Last 500 chars:', structureText.slice(-500));
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
  "summaryShort": "Maximum 200 words of pure prose in one paragraph. No headers, no bullets, no instruction text. Answer only what this lecture was about and why it matters. Be ruthlessly brief.",
  "summaryMedium": "Approximately ${studyGuideWords} words. Do not include any instruction text or format descriptions. Use short paragraphs with bold headers for each major topic. Cover every concept from the lecture. Never use em dashes. End with a line in exactly this format: MOST IMPORTANT MOMENT: [timestamp in M:SS] - [one sentence]. The timestamp must be where the single most important concept is first clearly explained.",
  "summaryFull": "Approximately ${deepNotesWords} words of comprehensive study notes. Do not include any instruction text or headers describing the format. Start directly with '## The Big Picture' followed by one paragraph about what the whole lecture was about. Then '## Key Concepts' with one subsection per major topic using bold headers and detailed explanations with specific examples the instructor used. Then '## The Most Important Moment' with a timestamp in M:SS format followed by a hyphen and one sentence explaining why. Then '## Exam Must-Knows' with 5-7 bullet points of the highest-yield facts. Never use em dashes, use a simple hyphen instead."
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
    let cleaned = summaryText.trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    summaries = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse summary JSON. Raw response length:', summaryText.length);
    console.error('Last 500 chars:', summaryText.slice(-500));
  }

  return {
    outline: structure.outline || [],
    flashcards: structure.flashcards || [],
    ...summaries,
  };
}
