import { NextResponse } from 'next/server';

// Bilibili scanning has been completely removed as per user request.
export async function GET() {
    return NextResponse.json([]);
}