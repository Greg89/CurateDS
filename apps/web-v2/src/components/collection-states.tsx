"use client";
import Link from "next/link";
import { CollectionsError } from "@/lib/collections";

export function CollectionLoading() {
  return (
    <section className="state-panel" role="status">
      <span className="eyebrow">Just a moment</span>
      <h1>Opening your collections…</h1>
      <p>A place for the things you love.</p>
    </section>
  );
}
export function CollectionFailure({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const status = error instanceof CollectionsError ? error.status : 502;
  return (
    <section className="state-panel" role="alert">
      <span className="eyebrow">Let's try that again</span>
      <h1>
        {status === 401
          ? "Welcome back."
          : "Your collections are out of reach."}
      </h1>
      <p>
        {error instanceof CollectionsError
          ? error.message
          : "We couldn't load this page. Please try again."}
      </p>
      {status === 401 ? (
        <a className="button" href="/auth/login?returnTo=%2Fcollections">
          Sign in again
        </a>
      ) : (
        <button className="button" onClick={retry}>
          Try again
        </button>
      )}
    </section>
  );
}
export function CollectionMissing() {
  return (
    <section className="state-panel">
      <span className="eyebrow">Collection not found</span>
      <h1>Let's find your collection.</h1>
      <p>
        This collection may have been removed, or it isn't available to your
        account.
      </p>
      <Link className="button" href="/collections">
        See your collections
      </Link>
    </section>
  );
}
