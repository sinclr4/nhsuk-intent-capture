'use client';

import { useState } from 'react';
import { marked } from 'marked';

type View = 'search' | 'loading' | 'content';

type HistoryEntry = { content: string; pageTitle: string };

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

export default function HealthAZPage() {
  const [view, setView] = useState<View>('search');
  const [query, setQuery] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const [content, setContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function loadContent(params: { query: string } | { url: string }) {
    setView('loading');
    setApiError('');
    try {
      const res = await fetch('/api/health-az', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json() as { content?: string; title?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      if (content) {
        setHistory((h) => [...h, { content, pageTitle }]);
      }
      setContent(json.content ?? '');
      setPageTitle(json.title ?? '');
      setView('content');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setView('search');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setFieldError('Enter a condition or topic to search for');
      return;
    }
    setFieldError('');
    setHistory([]);
    loadContent({ query: query.trim() });
  }

  function handleBack() {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setContent(prev.content);
      setPageTitle(prev.pageTitle);
      setView('content');
    } else {
      setView('search');
    }
  }

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const link = (e.target as HTMLElement).closest('[data-nhs-url]') as HTMLElement | null;
    if (link) {
      e.preventDefault();
      const url = link.dataset.nhsUrl;
      if (url) loadContent({ url });
    }
  }

  function interceptLinks(html: string): string {
    return html
      .replace(/<a\s+href="(https:\/\/www\.nhs\.uk[^"]*)"/g, '<a href="#" data-nhs-url="$1"')
      .replace(/<a\s+href="(\/(?:conditions|medicines|mental-health|live-well|pregnancy)[^"]*)"/g, '<a href="#" data-nhs-url="$1"');
  }

  function detectCareCard(heading: string): { type: string; label: string; body: string } | null {
    const h = heading.trim();
    const checks: [RegExp, string, string][] = [
      [/^immediate action required:\s*(.*)/i, 'immediate', 'Immediate action required:'],
      [/^call 999(.*)/i,                       'immediate', 'Immediate action required:'],
      [/^urgent advice:\s*(.*)/i,              'urgent',    'Urgent advice:'],
      [/^non-urgent advice:\s*(.*)/i,          'non-urgent', 'Non-urgent advice:'],
      [/^important\s*$/i,                      'warning',   'Important'],
      [/^information:\s*(.*)/i,                'info',      'Information:'],
    ];
    for (const [re, type, label] of checks) {
      const m = h.match(re);
      if (m) return { type, label, body: (m[1] ?? '').trim() };
    }
    return null;
  }

  function renderContent(md: string): string {
    // Split at H2/H3 headings; render each section independently so markdown inside care card divs is processed
    const sections = md.split(/(?=^#{2,3}\s)/m);
    const parts = sections.map(section => {
      const m = section.match(/^(#{2,3})\s+(.+)/);
      if (!m) return marked.parse(section) as string;
      const card = detectCareCard(m[2]);
      if (!card) return marked.parse(section) as string;

      let afterHeading = section.slice(m[0].length)
        .replace(/^Page last reviewed:.*$/m, '')
        .replace(/^Next review due:.*$/m, '');
      let infoMd = '';
      // Split off any trailing standalone Information: paragraph into a separate info callout
      const infoBreak = afterHeading.match(/^Information:\s*$/m);
      if (infoBreak?.index != null) {
        infoMd = afterHeading.slice(infoBreak.index + infoBreak[0].length).trimStart();
        afterHeading = afterHeading.slice(0, infoBreak.index).trimEnd();
      }

      const bodyMd = card.body ? `### ${card.body}\n${afterHeading}` : afterHeading;
      const cardHtml = `<div class="nhsapp-care-card nhsapp-care-card--${card.type}"><div class="nhsapp-care-card__label-bar"><span class="nhsapp-care-card__label">${card.label}</span></div><div class="nhsapp-care-card__body">${marked.parse(bodyMd) as string}</div></div>`;
      if (!infoMd) return cardHtml;
      const infoHtml = `<div class="nhsapp-care-card nhsapp-care-card--info"><div class="nhsapp-care-card__label-bar"><span class="nhsapp-care-card__label">Information:</span></div><div class="nhsapp-care-card__body">${marked.parse(infoMd) as string}</div></div>`;
      return cardHtml + infoHtml;
    });
    return interceptLinks(parts.join(''));
  }

  if (view === 'loading') {
    return (
      <>
        <AppHeader />
        <div className="nhs-inner-body">
          <div className="nhs-loading">
            <div className="nhs-spinner" role="status" aria-label="Loading" />
            <p>Loading NHS content</p>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  if (view === 'content') {
    return (
      <>
        <AppHeader />
        <div className="nhs-inner-body">
          <div className="nhs-inner-back">
            <button className="nhs-back-link" onClick={handleBack}>
              Back
            </button>
          </div>
          <div className="nhs-inner-content">
            <div
              className="nhs-markdown"
              onClick={handleContentClick}
              dangerouslySetInnerHTML={{ __html: renderContent(content) }}
            />
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="nhs-inner-body">
        <div className="nhs-inner-back">
          <a href="/" className="nhs-back-link">Back</a>
        </div>
        <div className="nhs-inner-content">
          <h1 className="nhs-page-title">Health A to Z</h1>
          <p className="nhs-hint">Search for conditions, symptoms and treatments.</p>

          {apiError && (
            <p className="nhs-error-msg" role="alert">{apiError}</p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="nhs-form-group">
              <label className="nhs-label" htmlFor="health-az-query">
                Search
              </label>
              {fieldError && (
                <span className="nhs-error-msg" id="health-az-error">{fieldError}</span>
              )}
              <div className="nhs-search-row">
                <input
                  id="health-az-query"
                  className={`nhs-input${fieldError ? ' nhs-input--error' : ''}`}
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setFieldError(''); }}
                  placeholder="e.g. diabetes, headache"
                  aria-describedby={fieldError ? 'health-az-error' : undefined}
                  autoComplete="off"
                />
                <button type="submit" className="nhs-button nhs-search-btn">
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
