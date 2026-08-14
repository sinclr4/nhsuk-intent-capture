import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = process.env.PROTOTYPE_PASSWORD ?? 'airport-sunshine-silky';

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('nhs-prototype-auth', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
