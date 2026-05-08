import { NextResponse } from 'next/server';
import { encryptJWT } from '@/lib/auth';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_PASSWORD) {
      const token = await encryptJWT({ role: 'admin' });

      // Auto-detect if the request is HTTPS (supports proxy headers from Coolify/Traefik)
      const forwardedProto = request.headers.get('x-forwarded-proto');
      const isHttps = forwardedProto === 'https' || new URL(request.url).protocol === 'https:';

      const response = NextResponse.json({ success: true });
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        maxAge: 86400, // 1 day
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
