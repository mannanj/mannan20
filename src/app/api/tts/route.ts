import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const AGENT_ZERO_DIR = join(process.env.HOME || '', 'Documents/agent-zero');
const WHISPER_BATCH_DIR = join(process.env.HOME || '', 'Documents/whisper-batch/backend');
const AUDIO_DIR = join(process.cwd(), 'public/data/audio');
const SCRIPTS_DIR = join(process.cwd(), 'scripts');

function hashText(text: string): string {
  return createHash('md5').update(text).digest('hex').slice(0, 12);
}

export async function POST(request: NextRequest) {
  try {
    const { text, slug } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const id = slug || hashText(text);
    const audioPath = join(AUDIO_DIR, `${id}.wav`);
    const alignPath = join(AUDIO_DIR, `${id}.json`);

    if (existsSync(audioPath) && existsSync(alignPath)) {
      const alignment = JSON.parse(readFileSync(alignPath, 'utf-8'));
      return NextResponse.json({
        audio_url: `/data/audio/${id}.wav`,
        alignment,
        cached: true,
      });
    }

    mkdirSync(AUDIO_DIR, { recursive: true });

    const textFile = join(AUDIO_DIR, `${id}.txt`);
    writeFileSync(textFile, text);

    const ttsScript = join(SCRIPTS_DIR, 'tts_generate.py');
    const ttsCmd = `cd "${AGENT_ZERO_DIR}" && uv run python "${ttsScript}" "$(cat "${textFile}")" "${audioPath}"`;
    execSync(ttsCmd, { timeout: 600_000, stdio: ['pipe', 'pipe', 'pipe'] });

    if (!existsSync(audioPath)) {
      return NextResponse.json({ error: 'TTS generation failed - no audio file produced' }, { status: 500 });
    }

    const whisperScript = join(SCRIPTS_DIR, 'whisper_align.py');
    const whisperCmd = `cd "${WHISPER_BATCH_DIR}" && uv run python "${whisperScript}" "${audioPath}"`;
    const whisperOut = execSync(whisperCmd, {
      timeout: 600_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const alignment = JSON.parse(whisperOut.toString().trim());
    writeFileSync(alignPath, JSON.stringify(alignment, null, 2));

    return NextResponse.json({
      audio_url: `/data/audio/${id}.wav`,
      alignment,
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
