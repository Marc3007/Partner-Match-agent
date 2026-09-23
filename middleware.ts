import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/adminAuth';

/**
 * Gates every /admin page and /api/admin/* route behind the signed session
 * cookie -- this is the hard requirement that makes the dashboard not
 * publicly reachable. /admin/login and /api/admin/login are excluded (the
 * matcher below never routes them here) since they're how a session gets
 * created in the first place.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Never gate the login page/endpoint itself -- that's how a session gets
  // created in the first place; gating it would be an unbreakable redirect
  // loop (this check lives here rather than in `matcher` below because
  // matcher only supports static/glob patterns, not this kind of exclusion
  // alongside a wildcard).
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const valid = await verifyAdminSessionToken(token);
  if (valid) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
