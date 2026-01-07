import { NextRequest, NextResponse } from 'next/server';
import { generateSignedUrl } from '@/lib/oss-utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key'); // Added this line to define 'key'
  if (!key) return new NextResponse('Key required', { status: 400 });



  try {
    const signedUrl = generateSignedUrl(key, 3600); // Temporary: increased timeout to 1h

    const res = await fetch(signedUrl);

    if (!res.ok) {
      // If upstream returns 404, simply return 404 to the client without verbose logging
      if (res.status === 404) {
        return new NextResponse('Image not found', { status: 404 });
      }

      // Log critical upstream errors (e.g. 403 Forbidden, 500 Server Error)
      const errorText = await res.text();
      console.error('[ImageProxy] Upstream Error:', { status: res.status, body: errorText });
      return new NextResponse('Upstream Error', { status: res.status });
    }

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    console.error('[ImageProxy] Internal Error:', e);
    return new NextResponse(`Internal Proxy Error: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
}
