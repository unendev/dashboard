import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_RU_VOICE = process.env.EDGE_TTS_VOICE_RU || 'ru-RU-SvetlanaNeural';
const DEFAULT_NON_RU_VOICE = process.env.EDGE_TTS_VOICE || 'en-US-AriaNeural';

interface TtsRequestBody {
  text?: string;
  lang?: string;
  voice?: string;
}

function normalizeLanguage(lang?: string): string {
  if (!lang) return 'ru-RU';
  if (lang.toLowerCase().startsWith('ru')) return 'ru-RU';
  return lang;
}

function pickVoice(lang: string, requestedVoice?: string): string {
  const normalizedRequestedVoice = requestedVoice?.trim();
  if (normalizedRequestedVoice) {
    return normalizedRequestedVoice;
  }

  if (lang.toLowerCase().startsWith('ru')) {
    return DEFAULT_RU_VOICE;
  }
  return DEFAULT_NON_RU_VOICE;
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function synthesizeByEdgeTts(text: string, voice: string): Promise<Buffer> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
  const tts = new MsEdgeTTS();

  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    return await streamToBuffer(audioStream);
  } finally {
    tts.close();
  }
}

function isEdgeUnavailableError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as { code?: string } | undefined)?.code;

  return (
    errorCode === 'ERR_MODULE_NOT_FOUND' ||
    errorCode === 'ERR_UNKNOWN_FILE_EXTENSION' ||
    /Cannot find package 'msedge-tts'/i.test(errorMessage)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TtsRequestBody;
    const text = body.text?.trim();
    const lang = normalizeLanguage(body.lang);
    const voice = pickVoice(lang, body.voice);

    if (!text) {
      return NextResponse.json(
        { code: 'INVALID_TEXT', message: '缺少可朗读文本。' },
        { status: 400 },
      );
    }

    if (text.length > 1200) {
      return NextResponse.json(
        { code: 'TEXT_TOO_LONG', message: '单次朗读文本过长，请缩短后重试。' },
        { status: 400 },
      );
    }

    let audioBuffer: Buffer;

    try {
      audioBuffer = await synthesizeByEdgeTts(text, voice);
    } catch (error) {
      console.error('[api/tts] edge-tts failed:', error);

      if (isEdgeUnavailableError(error)) {
        return NextResponse.json(
          {
            code: 'EDGE_TTS_UNAVAILABLE',
            message: '当前运行环境不可用 Edge-TTS，请使用浏览器语音回退。',
            fallback: 'web-speech',
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          code: 'EDGE_TTS_SYNTHESIS_FAILED',
          message: 'Edge-TTS 合成失败，请稍后重试或使用浏览器语音。',
          fallback: 'web-speech',
        },
        { status: 502 },
      );
    }

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, max-age=0',
        'X-TTS-Provider': 'edge-tts',
        'X-TTS-Lang': lang,
        'X-TTS-Voice': voice,
      },
    });
  } catch (error) {
    console.error('[api/tts] synthesis failed:', error);
    return NextResponse.json(
      {
        code: 'TTS_SYNTHESIS_FAILED',
        message: '服务端语音合成失败，请稍后重试。',
        fallback: 'web-speech',
      },
      { status: 502 },
    );
  }
}
