import { NextRequest, NextResponse } from 'next/server';
import { dashboardSessionCookie, dashboardAccessKey, isDashboardSecured } from '@/lib/config';

const publicRoutes = ['/login', '/api/twilio/voice', '/api/twilio/status'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!isDashboardSecured()) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(dashboardSessionCookie)?.value;

  if (!sessionToken || sessionToken !== dashboardAccessKey) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
