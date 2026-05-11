import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptChunk {
  text: string;
  timestamp: number;
  timestampFormatted: string;
}

export interface VideoMetadata {
  videoId: string;
  url: string;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function runIngestionAgent(url: string): Promise<{
  chunks: TranscriptChunk[];
  metadata: VideoMetadata;
  fullText: string;
}> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please check the link and try again.');
  }

  let rawTranscript;
  try {
    rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
  } catch {
    throw new Error('Could not fetch transcript. The video may be private, have no captions, or be a livestream.');
  }

  if (!rawTranscript || rawTranscript.length === 0) {
    throw new Error('This video has no transcript available.');
  }

  // Chunk transcript into ~30 second segments
  const chunks: TranscriptChunk[] = [];
  let currentText = '';
  let chunkStart = rawTranscript[0].offset / 1000;

  for (const item of rawTranscript) {
    currentText += ' ' + item.text;
    const currentTime = item.offset / 1000;

    if (currentTime - chunkStart >= 30) {
      chunks.push({
        text: currentText.trim(),
        timestamp: chunkStart,
        timestampFormatted: formatTimestamp(chunkStart),
      });
      currentText = '';
      chunkStart = currentTime;
    }
  }

  if (currentText.trim()) {
    chunks.push({
      text: currentText.trim(),
      timestamp: chunkStart,
      timestampFormatted: formatTimestamp(chunkStart),
    });
  }

  const fullText = rawTranscript.map(item => item.text).join(' ');

  return {
    chunks,
    metadata: { videoId, url },
    fullText,
  };
}
