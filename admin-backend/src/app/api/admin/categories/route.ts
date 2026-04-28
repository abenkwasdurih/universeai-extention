import { NextResponse } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { decryptJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { eq, desc } from 'drizzle-orm';

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
    const allCategories = await db.select().from(categories).orderBy(desc(categories.createdAt));
    return NextResponse.json({ success: true, data: allCategories });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, iconUrl } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    await db.insert(categories).values({ name, iconUrl: iconUrl || null });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }
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

    const [categoryToDelete] = await db.select().from(categories).where(eq(categories.id, id));
    
    if (categoryToDelete) {
      // Update all sessions using this category to 'Uncategorized'
      // Need to import sharedSessions from schema
      const { sharedSessions } = await import('@/db/schema');
      await db.update(sharedSessions)
        .set({ category: 'Uncategorized' })
        .where(eq(sharedSessions.category, categoryToDelete.name));
    }

    await db.delete(categories).where(eq(categories.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
