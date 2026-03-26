import { NextResponse } from 'next/server';

// Bilibili user management has been disabled as per user request.
export async function GET() {
    return NextResponse.json([]);
}

export async function POST() {
    return NextResponse.json({ error: 'Bilibili management disabled' }, { status: 403 });
}
