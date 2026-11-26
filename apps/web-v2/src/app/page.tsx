import Link from "next/link";
import { isAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default function HomePage() {
  const configured = isAuthConfigured();
  return (
    <>
      <header className="global-header">
        <Link className="brand" href="/">
          Curate<span>DS</span>
          <i aria-hidden="true" />
        </Link>
        <span className="header-note">For the love of collecting</span>
      </header>
      <main id="main" className="welcome">
        <div className="welcome-copy">
          <span className="eyebrow">Your world, collected.</span>
          <h1>
            Some things
            <br />
            are worth
            <br />
            <em>keeping.</em>
          </h1>
          <p>
            The first edition. The flea-market find. The one you've been
            searching for. Give the things you love a place of their own.
          </p>
          {configured ? (
            <a className="button" href="/auth/login?returnTo=%2Fcollections">
              Step into your collections <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <div className="availability" role="status">
              <strong>We'll be ready to welcome you soon.</strong>
              <p>
                Sign-in is temporarily unavailable. Please check back shortly.
              </p>
            </div>
          )}
          <span className="quiet-caption">
            A personal space. An ever-growing story.
          </span>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-label">
            THE PERSONAL ARCHIVE <span>Nº 001</span>
          </div>
          <div className="still-life">
            <div className="object object-book" />
            <div className="object object-disc" />
            <div className="object object-card" />
          </div>
          <div className="art-caption">
            Ordinary things.
            <br />
            <em>Extraordinary to you.</em>
          </div>
        </div>
      </main>
      <footer className="site-footer">
        <span>CurateDS</span>
        <span>Keep what moves you.</span>
      </footer>
    </>
  );
}
