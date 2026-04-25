import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sharedSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decryptJWT } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Missing token.' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    try {
      const payload = await decryptJWT(token);
      if (payload.role !== 'user' && payload.role !== 'admin') throw new Error('Invalid role');
    } catch(e) {
      return NextResponse.json({ error: 'Unauthorized. Invalid token.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }
    
    const id = parseInt(idParam, 10);

    const session = await db
      .select()
      .from(sharedSessions)
      .where(eq(sharedSessions.id, id))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        siteName: session[0].siteName,
        domain: session[0].domain,
        encryptedCookies: session[0].encryptedCookies,
        uiConfig: session[0].uiConfig,
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
