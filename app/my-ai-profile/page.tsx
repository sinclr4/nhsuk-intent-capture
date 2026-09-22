'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Profile = { name: string; dateOfBirth: string; homePostcode: string };

function AppHeader() {
  return <header className="app-hdr"><nav className="app-hdr__nav"><a href="/" className="app-hdr__logo"><span className="nhs-logo-mark" aria-label="NHS">NHS</span><span className="app-hdr__home-text">Home</span></a><button className="app-hdr__help" type="button">App help</button></nav></header>;
}

export default function MyAiProfilePage() {
  const [profile, setProfile] = useState<Profile>({ name: '', dateOfBirth: '', homePostcode: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (json.profile) { setProfile(json.profile); } else { setEditing(true); }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load your profile'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProfile({ ...profile, homePostcode: profile.homePostcode.toUpperCase() });
      setEditing(false); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save your profile'); }
    finally { setSaving(false); }
  }

  return <><AppHeader /><main className="nhs-inner-body"><div className="nhs-inner-back"><Link href="/" className="nhs-back-link">Back</Link></div><div className="nhs-inner-content"><h1 className="nhs-page-title">My AI Profile</h1><p className="nhs-hint">This information helps AI tools in this prototype personalise their responses for you.</p>{error && <div className="nhs-error-summary" role="alert"><h2>There is a problem</h2><p>{error}</p></div>}{loading ? <p>Loading your profile</p> : editing ? <form onSubmit={handleSave}><div className="nhs-form-group"><label className="nhs-label" htmlFor="profile-name">Name</label><input id="profile-name" className="nhs-input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></div><div className="nhs-form-group"><label className="nhs-label" htmlFor="profile-dob">Date of Birth</label><input id="profile-dob" className="nhs-input" type="date" value={profile.dateOfBirth} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} required /></div><div className="nhs-form-group"><label className="nhs-label" htmlFor="profile-postcode">Home Postcode</label><input id="profile-postcode" className="nhs-input" value={profile.homePostcode} onChange={(e) => setProfile({ ...profile, homePostcode: e.target.value })} required /></div><button type="submit" className="nhs-button" disabled={saving}>{saving ? 'Saving' : 'Save profile'}</button></form> : <><dl className="nhs-profile-list"><div><dt>Name</dt><dd>{profile.name}</dd></div><div><dt>Date of Birth</dt><dd>{profile.dateOfBirth}</dd></div><div><dt>Home Postcode</dt><dd>{profile.homePostcode}</dd></div></dl>{saved && <p role="status" className="nhs-success-msg">Your profile has been updated.</p>}<button type="button" className="nhs-button" onClick={() => { setEditing(true); setSaved(false); }}>Edit profile</button></>}</div></main></>;
}