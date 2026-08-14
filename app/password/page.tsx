'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PasswordPage() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Enter the correct password');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pw-page">
      <header className="pw-header">
        <div className="pw-header__brand">
          <span className="nhs-logo-mark">NHS</span>
          <span className="pw-header__site">Navigation homepage</span>
        </div>
      </header>

      <main className="pw-main">
        <h1 className="pw-title">This is a prototype used for research</h1>
        <p className="pw-desc">
          It is not a real service. You should only continue if you have been invited to
          test this prototype.
        </p>

        {error && (
          <div className="nhs-error-summary" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="nhs-form-group">
            <label className="nhs-label" htmlFor="pw-field">
              Password
            </label>
            <div className="pw-input-row">
              <input
                id="pw-field"
                type={show ? 'text' : 'password'}
                className="nhs-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="pw-show-btn" onClick={() => setShow((s) => !s)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button type="submit" className="nhs-button" disabled={loading}>
            Continue
          </button>
        </form>
      </main>

      <footer className="pw-footer">
        <p>© NHS England</p>
      </footer>
    </div>
  );
}
