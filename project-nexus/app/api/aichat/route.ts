import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('API: /api/aichat POST received');
  return new Response('Hello from /api/aichat', { status: 200 });
}
