import { NextResponse } from 'next/server';
import { db } from '@/db';
import { extensionUsers } from '@/db/schema';
import { encryptJWT } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const userRecord = await db
      .select()
      .from(extensionUsers)
      .where(eq(extensionUsers.email, email))
      .limit(1);

    if (userRecord.length === 0 || !userRecord[0].isActive) {
      return NextResponse.json({ error: 'Email not authorized or deactivated' }, { status: 403 });
    }

    // Sign a user-level JWT valid for 30 days
    const token = await encryptJWT({ email: userRecord[0].email, role: 'user' }, '30d');

    return NextResponse.json({
      success: true,
      token,
      email: userRecord[0].email
    });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
