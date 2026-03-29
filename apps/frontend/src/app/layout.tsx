import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Claims Processing System',
  description: 'Insurance claims adjudication and management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="container nav-inner">
            <a href="/" className="nav-brand">ClaimsEngine</a>
            <div className="nav-links">
              <a href="/" className="nav-link">Dashboard</a>
              <a href="/claims" className="nav-link">Claims</a>
              <a href="/claims/new" className="nav-link">Submit Claim</a>
              <a href="/policies" className="nav-link">Policies</a>
            </div>
          </div>
        </nav>
        <main className="container page">
          {children}
        </main>
      </body>
    </html>
  );
}
