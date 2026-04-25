import { NextResponse } from 'next/server';
import { db } from '@/db';
import { extensionUsers } from '@/db/schema';
import { decryptJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
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
    const users = await db.select().from(extensionUsers);
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    await db.insert(extensionUsers).values({ email });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation in Postgres
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
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
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.delete(extensionUsers).where(eq(extensionUsers.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
