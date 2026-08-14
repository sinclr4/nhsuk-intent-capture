import Link from 'next/link';

const SERVICES = [
  'Prescriptions',
  'Appointments',
  'Test results',
  'Vaccinations',
  'Allergies and adverse reactions',
  'Documents',
];

const SUPPORT = [
  'Check your symptoms using 111 online',
  'Health A to Z',
  'Find NHS services near you',
];

function NHSLogo() {
  return <span className="nhs-logo-mark" aria-label="NHS">NHS</span>;
}

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="nhsapp-chevron">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <header className="app-hdr">
        <nav className="app-hdr__nav">
          <a href="/" className="app-hdr__logo">
            <NHSLogo />
            <span className="app-hdr__home-text">Home</span>
          </a>
          <button className="app-hdr__help" type="button">App help</button>
        </nav>
      </header>

      <main className="nhs-home-body">
        <h1 className="nhs-home-title">Home</h1>

        <ul className="nhsapp-cards nhsapp-cards--stacked">
          {SERVICES.map((name) => (
            <li key={name} className="nhsapp-card">
              <div className="nhsapp-card__container">
                <a href="#" className="nhsapp-card__link">{name}</a>
                <ChevronRight />
              </div>
            </li>
          ))}
        </ul>

        <Link href="/ask" className="nhsapp-editorial-card">
          <div className="nhsapp-editorial-body">
            <span className="nhsapp-editorial-tag">New</span>
            <p className="nhsapp-editorial-title">Ask the NHS</p>
            <p className="nhsapp-editorial-copy">
              Use our experimental AI tool for advice on where to get help or what NHS
              service you might need.
            </p>
          </div>
          <span className="nhsapp-editorial-chevron" aria-hidden="true">
            <ChevronRight />
          </span>
        </Link>

        <h2 className="nhsapp-section-heading">NHS information and support</h2>

        <ul className="nhsapp-cards nhsapp-cards--stacked">
          {SUPPORT.map((name) => (
            <li key={name} className="nhsapp-card">
              <div className="nhsapp-card__container">
                {name === 'Health A to Z' ? (
                  <Link href="/health-az" className="nhsapp-card__link">{name}</Link>
                ) : name === 'Find NHS services near you' ? (
                  <Link href="/find-services" className="nhsapp-card__link">{name}</Link>
                ) : (
                  <a href="#" className="nhsapp-card__link">{name}</a>
                )}
                <ChevronRight />
              </div>
            </li>
          ))}
        </ul>
      </main>

      <nav className="nhs-bottom-nav" aria-label="Main navigation">
        <a href="/" className="nhs-bottom-nav__item active">
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
    </>
  );
}
