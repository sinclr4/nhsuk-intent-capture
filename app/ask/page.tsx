'use client';

import { useState } from 'react';
import Link from 'next/link';
import { marked } from 'marked';

type Outcome = {
  recommended: boolean;
  title: string;
  description: string;
  action: { type: 'deepLink' | 'web'; label: string; target: string };
  nhsContent?: string | null;
};

type View = 'form' | 'loading' | 'results';

function AppHeader() {
  return (
    <header className="app-hdr">
      <nav className="app-hdr__nav">
        <a href="/" className="app-hdr__logo">
          <span className="nhs-logo-mark" aria-label="NHS">NHS</span>
          <span className="app-hdr__home-text">Home</span>
        </a>
        <button className="app-hdr__help" type="button">App help</button>
      </nav>
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="nhs-bottom-nav" aria-label="Main navigation">
      <a href="/" className="nhs-bottom-nav__item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span className="nhs-bottom-nav__label">Home</span>
      </a>
      <a href="#" className="nhs-bottom-nav__item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <span className="nhs-bottom-nav__label">Messages</span>
      </a>
      <a href="#" className="nhs-bottom-nav__item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <span className="nhs-bottom-nav__label">Profile</span>
      </a>
    </nav>
  );
}

export default function AskPage() {
  const [view, setView] = useState<View>('form');
  const [concern, setConcern] = useState('');
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!concern.trim()) {
      setFieldError('Enter a description of your concern');
      return;
    }
    setFieldError('');
    setApiError('');
    setView('loading');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concern: concern.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setOutcomes(json.outcomes ?? []);
      setView('results');
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
      setView('form');
    }
  }

  /* ── Loading ── */
  if (view === 'loading') {
    return (
      <>
        <AppHeader />
        <div className="nhs-inner-body">
          <div className="nhs-loading">
            <div className="nhs-spinner" role="status" aria-label="Loading" />
            <p>Finding the right help for you</p>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  /* ── Results ── */
  if (view === 'results') {
    return (
      <>
        <AppHeader />
        <div className="nhs-inner-body">
          <div className="nhs-inner-back">
            <button className="nhs-back-link" onClick={() => setView('form')}>
              Back
            </button>
          </div>
          <div className="nhs-inner-content">
            <h1 className="nhs-page-title">What to do next</h1>
            <p className="nhs-results-count">
              We found {outcomes.length} service{outcomes.length !== 1 ? 's' : ''} that
              can help, based on what you told us.
            </p>

            {outcomes.map((o, i) => (
              <div key={i} className="nhs-service-card">
                <div className="nhs-service-card__content">
                  {o.recommended && (
                    <span className="nhs-service-card__badge">Recommended</span>
                  )}
                  {/* When NHS content is available, show title + expandable article rather than linking away */}
                  {o.nhsContent ? (
                    <>
                      <p className="nhs-service-card__title" style={{ cursor: 'default' }}>
                        {o.title}
                      </p>
                      <p className="nhs-service-card__desc">{o.description}</p>
                      <details className="nhs-expander nhs-card-expander">
                        <summary>Read NHS information</summary>
                        <div
                          className="nhs-expander__body nhs-markdown"
                          dangerouslySetInnerHTML={{ __html: marked.parse(o.nhsContent) as string }}
                        />
                      </details>
                    </>
                  ) : (
                    <>
                      <a
                        href={o.action.target}
                        className="nhs-service-card__title"
                        target={o.action.type === 'web' ? '_blank' : undefined}
                        rel={o.action.type === 'web' ? 'noopener noreferrer' : undefined}
                      >
                        {o.title}
                      </a>
                      <p className="nhs-service-card__desc">{o.description}</p>
                    </>
                  )}
                </div>
                {!o.nhsContent && (
                  <div className="nhs-service-card__arrow" aria-hidden="true">›</div>
                )}
              </div>
            ))}

            <p className="nhs-start-new">
              <button
                className="nhs-link-btn"
                onClick={() => { setConcern(''); setView('form'); }}
              >
                Start a new request
              </button>
            </p>

            <details className="nhs-expander">
              <summary>Did this answer your question?</summary>
              <div className="nhs-expander__body">
                <p>Your feedback helps us improve this service.</p>
              </div>
            </details>

            <details className="nhs-expander">
              <summary>Get help another way</summary>
              <div className="nhs-expander__body">
                <p>
                  You can also{' '}
                  <a href="https://111.nhs.uk" target="_blank" rel="noopener noreferrer">
                    use 111 online
                  </a>{' '}
                  or call 111 for non-emergency medical help.
                </p>
              </div>
            </details>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  /* ── Form ── */
  return (
    <>
      <AppHeader />
      <div className="nhs-inner-body">
        <div className="nhs-inner-back">
          <Link href="/" className="nhs-back-link">Back</Link>
        </div>
        <div className="nhs-inner-content">
          <h1 className="nhs-page-title">Ask the NHS</h1>
          <p className="nhs-hint">
            This tool uses AI to find NHS services and information. It does not have
            access to your medical record.
          </p>
          <p className="nhs-hint">
            Ask us a question or describe a problem and we will tell you what to do next.
          </p>

          {apiError && (
            <div className="nhs-error-summary" role="alert">
              <h2>There is a problem</h2>
              <p>{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="nhs-form-group">
              {fieldError && (
                <span id="concern-error" className="nhs-error-msg" role="alert">
                  {fieldError}
                </span>
              )}
              <label className="nhs-label" htmlFor="concern">
                Briefly describe your concern
              </label>
              <textarea
                id="concern"
                className={`nhs-textarea${fieldError ? ' nhs-textarea--error' : ''}`}
                value={concern}
                onChange={(e) => { setConcern(e.target.value); setFieldError(''); }}
                rows={4}
                aria-describedby={fieldError ? 'concern-error' : undefined}
              />
            </div>
            <button type="submit" className="nhs-button">Continue</button>
          </form>

          <details className="nhs-expander" style={{ marginTop: '24px' }}>
            <summary>I do not want to use this tool</summary>
            <div className="nhs-expander__body">
              <p>
                You can{' '}
                <a href="https://111.nhs.uk" target="_blank" rel="noopener noreferrer">
                  use 111 online
                </a>{' '}
                or call 111 for non-emergency medical help.
              </p>
            </div>
          </details>

          <details className="nhs-expander">
            <summary>How this tool works</summary>
            <div className="nhs-expander__body">
              <p>
                This tool uses artificial intelligence (AI) to understand your description
                and recommend NHS services that may help. It does not provide medical
                diagnoses or treatment advice.
              </p>
            </div>
          </details>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
