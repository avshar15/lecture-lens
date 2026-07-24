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

  // Generate summaries with three separate calls for reliability
  async function generateSummary(instruction: string, maxTokens: number): Promise<string> {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: `You are an expert study assistant analyzing a lecture transcript.

This lecture is ${videoDurationMinutes} minutes long.

${instruction}

Return only the requested text. Do not wrap it in JSON. Do not add any preamble, commentary, or format descriptions. Never use em dashes, use a simple hyphen instead.

Transcript:
${sampledTranscript}`,
          },
        ],
      });
      return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    } catch (e) {
      console.error('Summary generation failed:', e);
      return '';
    }
  }

  const [summaryShort, summaryMedium, summaryFull] = await Promise.all([
    generateSummary(
      `Write a maximum 200 word summary in pure prose, one paragraph. No headers, no bullets. Answer only what this lecture was about and why it matters. Be ruthlessly brief.`,
      1000
    ),
    generateSummary(
      `Write approximately ${studyGuideWords} words of study guide content. Use short paragraphs with bold markdown headers for each major topic. Cover every concept from the lecture. End with a final line in exactly this format: MOST IMPORTANT MOMENT: [timestamp in M:SS] - [one sentence]. The timestamp must be where the single most important concept is first clearly explained.`,
      3000
    ),
    generateSummary(
      `Write approximately ${deepNotesWords} words of comprehensive study notes. Structure exactly as follows. Start with "## The Big Picture" then one paragraph about the whole lecture. Then "## Key Concepts" with one subsection per major topic using bold markdown headers and detailed explanations with specific examples the instructor used. Then "## The Most Important Moment" with a timestamp in M:SS format followed by a hyphen and one sentence explaining why. Then "## Exam Must-Knows" with 5 to 7 bullet points of the highest-yield facts.`,
      6000
    ),
  ]);

  const summaries = {
    summaryShort,
    summaryMedium,
    summaryFull,
  };

  return {
    outline: structure.outline || [],
    flashcards: structure.flashcards || [],
    ...summaries,
  };
}
