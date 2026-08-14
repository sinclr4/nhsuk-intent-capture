'use client';

import { useState } from 'react';
import Link from 'next/link';

type ServiceResult = {
  OrganisationName: string;
  OrganisationTypeID: string;
  ODSCode: string;
  Address: string;
  Postcode: string | null;
  Phone: string | null;
  Website: string | null;
  Email: string | null;
  Distance: number;
  Geocode: { Latitude: number; Longitude: number; Postcode: string | null } | null;
  IsOpenNow: boolean;
};

type OrgDetails = {
  organisationName: string;
  address: string;
  postcode: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  openingTimes: { day: string; opens: string; closes: string; isOpen: boolean }[];
  facilities: { name: string; value: string }[];
};

type View = 'form' | 'loading' | 'results';

const POSTCODE_RE = /[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}/i;
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

function ServiceCard({ result }: { result: ServiceResult }) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<OrgDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const postcode = result.Postcode ?? '';

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !details && !detailsLoading) {
      setDetailsLoading(true);
      setDetailsError('');
      try {
        const res = await fetch(`/api/org-details?odsCode=${encodeURIComponent(result.ODSCode)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load details');
        setDetails(json as OrgDetails);
      } catch (err) {
        setDetailsError(err instanceof Error ? err.message : 'Failed to load details');
      } finally {
        setDetailsLoading(false);
      }
    }
  }

  // Deduplicate opening times: keep unique day+opens+closes rows, then sort by day order
  const uniqueTimes = details?.openingTimes
    ? Object.values(
        details.openingTimes.reduce<Record<string, { day: string; opens: string; closes: string; isOpen: boolean }>>(
          (acc, t) => { const k = `${t.day}-${t.opens}-${t.closes}`; acc[k] = t; return acc; },
          {},
        ),
      ).sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
    : [];

  return (
    <div className="sf-result-card">
      <button className="sf-result-card__header sf-result-card__header--btn" onClick={handleExpand} aria-expanded={expanded}>
        <span className={result.IsOpenNow ? 'sf-open-badge' : 'sf-closed-badge'}>
          {result.IsOpenNow ? 'Open now' : 'Closed'}
        </span>
        <h2 className="sf-org-name">{result.OrganisationName}</h2>
        <div className="sf-card-meta">
          <span className="sf-address-inline">{result.Address}{postcode ? `, ${postcode}` : ''}</span>
          {result.Distance != null && (
            <span className="sf-distance">{result.Distance.toFixed(1)} mi</span>
          )}
          <span className="sf-chevron" aria-hidden="true">{expanded ? '−' : '+'}</span>
        </div>
        <div className="sf-card-contacts">
          {result.Phone && (
            <a href={`tel:${result.Phone.replace(/\s/g, '')}`} className="sf-contact-link" onClick={(e) => e.stopPropagation()}>
              📞 {result.Phone}
            </a>
          )}
          {result.Website && (
            <a href={result.Website} target="_blank" rel="noopener noreferrer" className="sf-contact-link" onClick={(e) => e.stopPropagation()}>
              🌐 Website
            </a>
          )}
        </div>
      </button>

      {expanded && (
        <div className="sf-details">
          {detailsLoading && <p className="sf-details__loading">Loading details…</p>}
          {detailsError && <p className="sf-details__error">{detailsError}</p>}
          {details && (
            <>
              <div className="sf-contact-grid">
                {details.phone && (
                  <a href={`tel:${details.phone.replace(/\s/g, '')}`} className="sf-contact-item sf-contact-link">
                    <span className="sf-contact-icon" aria-hidden="true">📞</span> {details.phone}
                  </a>
                )}
                {details.email && (
                  <a href={`mailto:${details.email}`} className="sf-contact-item sf-contact-link">
                    <span className="sf-contact-icon" aria-hidden="true">✉</span> {details.email}
                  </a>
                )}
                {details.website && (
                  <a href={details.website} target="_blank" rel="noopener noreferrer" className="sf-contact-item sf-contact-link">
                    <span className="sf-contact-icon" aria-hidden="true">🌐</span> Visit website
                  </a>
                )}
              </div>

              {uniqueTimes.length > 0 && (
                <details className="nhs-expander sf-times-expander">
                  <summary>Opening times</summary>
                  <div className="nhs-expander__body">
                    <table className="sf-times-table">
                      <tbody>
                        {uniqueTimes.map((t, i) => (
                          <tr key={i}>
                            <td className="sf-times-day">{t.day}</td>
                            <td className="sf-times-hours">
                              {t.isOpen && t.opens !== '0' ? `${t.opens} – ${t.closes}` : 'Closed'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              {details.facilities.length > 0 && (
                <details className="nhs-expander sf-times-expander">
                  <summary>Facilities</summary>
                  <div className="nhs-expander__body">
                    {details.facilities.map((f, i) => (
                      <p key={i} className="sf-detail-row">
                        <span className="sf-detail-label">{f.name}:</span> {f.value}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FindServicesPage() {
  const [view, setView] = useState<View>('form');
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [matchedService, setMatchedService] = useState('');
  const [errors, setErrors] = useState<{ service?: string; location?: string }>({});
  const [apiError, setApiError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { service?: string; location?: string } = {};
    if (!service.trim()) newErrors.service = 'Enter a service type';
    if (!location.trim()) {
      newErrors.location = 'Enter a location or postcode';
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setApiError('');
    setView('loading');

    try {
      const res = await fetch('/api/find-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: service.trim(), location: location.trim() }),
      });
      const json = await res.json() as { error?: string; field?: string; results?: ServiceResult[]; matchedService?: string };
      if (!res.ok) {
        if (json.field === 'location') {
          setErrors({ location: json.error });
          setView('form');
          return;
        }
        throw new Error(json.error ?? `Error ${res.status}`);
      }
      setResults(json.results ?? []);
      setMatchedService(json.matchedService ?? '');
      setView('results');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
            <p>Searching for services near you</p>
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
            <button className="nhs-back-link" onClick={() => setView('form')}>Back</button>
          </div>
          <div className="nhs-inner-content">
            <h1 className="nhs-page-title">Services near you</h1>
            <p className="nhs-results-count">
              {results.length === 0
                ? 'No services found. Try a different search.'
                : `Found ${results.length} service${results.length !== 1 ? 's' : ''} near ${location}`}
            </p>
            {matchedService && matchedService.toLowerCase() !== service.trim().toLowerCase() && (
              <p className="nhs-hint" style={{ marginBottom: '16px' }}>
                Showing results for: <strong>{matchedService}</strong>
              </p>
            )}

            {results.map((result, i) => (
              <ServiceCard key={i} result={result} />
            ))}

            <p className="nhs-start-new">
              <button
                className="nhs-link-btn"
                onClick={() => { setService(''); setLocation(''); setView('form'); }}
              >
                Start a new search
              </button>
            </p>
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
          <h1 className="nhs-page-title">Find NHS services near you</h1>
          <p className="nhs-hint">
            Search for NHS and local health services in your area.
          </p>

          {apiError && (
            <div className="nhs-error-summary" role="alert">
              <h2>There is a problem</h2>
              <p>{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="nhs-form-group">
              {errors.service && (
                <span id="service-error" className="nhs-error-msg" role="alert">
                  {errors.service}
                </span>
              )}
              <label className="nhs-label" htmlFor="service">Service type</label>
              <input
                id="service"
                className={`nhs-input${errors.service ? ' nhs-input--error' : ''}`}
                value={service}
                onChange={(e) => { setService(e.target.value); setErrors((p) => ({ ...p, service: undefined })); }}
                placeholder="e.g. GP, pharmacy, dentist"
                aria-describedby={errors.service ? 'service-error' : undefined}
                style={{ display: 'block', width: '100%' }}
              />
            </div>

            <div className="nhs-form-group">
              {errors.location && (
                <span id="location-error" className="nhs-error-msg" role="alert">
                  {errors.location}
                </span>
              )}
              <label className="nhs-label" htmlFor="location">Location</label>
              <input
                id="location"
                className={`nhs-input${errors.location ? ' nhs-input--error' : ''}`}
                value={location}
                onChange={(e) => { setLocation(e.target.value); setErrors((p) => ({ ...p, location: undefined })); }}
                placeholder="e.g. LS1 1BA or York"
                aria-describedby={errors.location ? 'location-error' : undefined}
                style={{ display: 'block', width: '100%' }}
              />
            </div>

            <button type="submit" className="nhs-button">Search</button>
          </form>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
