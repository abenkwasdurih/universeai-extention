import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sharedSessions, categories } from '@/db/schema';
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

    // Fetch both sessions and categories
    const sessions = await db
      .select({
        id: sharedSessions.id,
        category: sharedSessions.category,
        siteName: sharedSessions.siteName,
        domain: sharedSessions.domain,
      })
      .from(sharedSessions);

    const categoriesData = await db
      .select({
        id: categories.id,
        name: categories.name,
        iconUrl: categories.iconUrl,
      })
      .from(categories);

    return NextResponse.json({ success: true, data: { sessions, categories: categoriesData } });
  } catch (error) {
    console.error('Error fetching sessions list:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
