import { NextRequest, NextResponse } from 'next/server';
import { generateSignedUrl } from '@/lib/oss-utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) return new NextResponse('Key required', { status: 400 });
  try {
    const signedUrl = generateSignedUrl(key, 60);
    const res = await fetch(signedUrl);
    if (!res.ok) return new NextResponse('Fetch failed', { status: res.status });
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    return new NextResponse('Error', { status: 500 });
  }
}
