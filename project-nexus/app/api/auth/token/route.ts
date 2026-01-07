import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  console.log('📥 [Backend] Received request on /api/auth/token');
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    console.log(`[Token API] Attempting login for: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('[Token API] Critical Error: NEXTAUTH_SECRET is not defined in environment variables.');
      return NextResponse.json({ error: 'Server configuration error: Missing Secret' }, { status: 500 });
    }

    // Generate JWT
    // Use the same secret as NextAuth to ensure compatibility if needed
    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      secret,
    });

    console.log('[Token API] Login successful, token generated');

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });

  } catch (error) {
    console.error('❌ [Token API] Critical Error:', error);
    // @ts-ignore
    if (error.stack) console.error(error.stack);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
