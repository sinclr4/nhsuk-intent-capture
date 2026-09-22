import { NextRequest, NextResponse } from 'next/server';
import { isProfileStoreConfigured, PROFILE_COOKIE, readProfile, saveProfile, type Profile } from '@/lib/profile-store';

function getOrCreateDemoId(req: NextRequest) {
  return req.cookies.get(PROFILE_COOKIE)?.value ?? crypto.randomUUID();
}

function withDemoCookie(response: NextResponse, demoId: string, shouldSet: boolean) {
  if (shouldSet) {
    response.cookies.set(PROFILE_COOKIE, demoId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export async function GET(req: NextRequest) {
  const existingId = req.cookies.get(PROFILE_COOKIE)?.value;
  const demoId = getOrCreateDemoId(req);
  try {
    const profile = isProfileStoreConfigured() ? await readProfile(demoId) : null;
    return withDemoCookie(NextResponse.json({ profile }), demoId, !existingId);
  } catch (error) {
    console.error('[GET /api/profile]', error);
    return withDemoCookie(NextResponse.json({ error: 'Unable to load your AI profile' }, { status: 503 }), demoId, !existingId);
  }
}

export async function PUT(req: NextRequest) {
  const existingId = req.cookies.get(PROFILE_COOKIE)?.value;
  const demoId = getOrCreateDemoId(req);
  if (!isProfileStoreConfigured()) {
    return withDemoCookie(NextResponse.json({ error: 'Profile storage is not configured' }, { status: 503 }), demoId, !existingId);
  }

  let profile: Profile;
  try {
    profile = (await req.json()) as Profile;
  } catch {
    return withDemoCookie(NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }), demoId, !existingId);
  }
  if (!profile.name?.trim() || !profile.dateOfBirth?.trim() || !profile.homePostcode?.trim()) {
    return withDemoCookie(NextResponse.json({ error: 'Complete all profile fields' }, { status: 400 }), demoId, !existingId);
  }

  try {
    await saveProfile(demoId, {
      name: profile.name.trim(),
      dateOfBirth: profile.dateOfBirth.trim(),
      homePostcode: profile.homePostcode.trim().toUpperCase(),
    });
    return withDemoCookie(NextResponse.json({ ok: true }), demoId, !existingId);
  } catch (error) {
    console.error('[PUT /api/profile]', error);
    return withDemoCookie(NextResponse.json({ error: 'Unable to save your AI profile' }, { status: 503 }), demoId, !existingId);
  }
}