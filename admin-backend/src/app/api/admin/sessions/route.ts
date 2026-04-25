import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sharedSessions } from '@/db/schema';
import { decryptJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { encryptCookieData } from '@/lib/crypto';
import { eq } from 'drizzle-orm';

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  try {
    const payload = await decryptJWT(token);
    return payload.role === 'admin';
  } catch (e) {
    return false;
  }
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessions = await db.select().from(sharedSessions);
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { category, siteName, domain, cookiesJson, uiConfig } = await request.json();

    if (!siteName || !domain || !cookiesJson) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const encryptedCookies = encryptCookieData(cookiesJson);

    const existingSession = await db
      .select()
      .from(sharedSessions)
      .where(eq(sharedSessions.siteName, siteName));

    if (existingSession.length > 0) {
      // Update
      await db
        .update(sharedSessions)
        .set({
          category: category || 'Uncategorized',
          domain,
          encryptedCookies,
          uiConfig,
          updatedAt: new Date(),
        })
        .where(eq(sharedSessions.siteName, siteName));
    } else {
      // Insert
      await db.insert(sharedSessions).values({
        category: category || 'Uncategorized',
        siteName,
        domain,
        encryptedCookies,
        uiConfig,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.delete(sharedSessions).where(eq(sharedSessions.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
