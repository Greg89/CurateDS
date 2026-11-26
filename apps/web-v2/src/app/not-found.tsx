import Link from "next/link";
export default function NotFoundPage() {
  return (
    <main id="main" className="state-panel">
      <span className="eyebrow">Page not found</span>
      <h1>A little off the beaten path.</h1>
      <p>Let's get you back to your collections.</p>
      <Link className="button" href="/collections">
        Your collections
      </Link>
    </main>
  );
}
