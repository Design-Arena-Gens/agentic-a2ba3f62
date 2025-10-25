import { NextRequest, NextResponse } from 'next/server';
import { dashboardAccessKey, dashboardSessionCookie } from '@/lib/config';

export async function POST(request: NextRequest) {
  if (!dashboardAccessKey) {
    return NextResponse.json({ error: 'Access key is not configured.' }, { status: 500 });
  }

  const payload = await request.json();
  const key = payload?.key as string | undefined;

  if (!key || key !== dashboardAccessKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: dashboardSessionCookie,
    value: dashboardAccessKey,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: dashboardSessionCookie,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
