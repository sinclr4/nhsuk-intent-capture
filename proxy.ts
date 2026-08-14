import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/password', '/api/password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (request.cookies.get('nhs-prototype-auth')?.value) return NextResponse.next();
  return NextResponse.redirect(new URL('/password', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
