import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NHS App',
  description: 'NHS intent capture',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="iphone-frame">
          <div className="iphone-notch" aria-hidden="true" />
          <div className="app-shell">{children}</div>
        </div>
      </body>
    </html>
  );
}
