"use client";
import { CollectionsError } from "@/lib/collections";
export function SaveError({ error }: { error: Error }) {
  const status = error instanceof CollectionsError ? error.status : 502;
  return (
    <div role="alert" className="save-error">
      <p>
        {status === 401
          ? "Your session has ended. Sign in again before saving."
          : status === 400
            ? "Check the details before saving. This collection may require additional item fields."
            : status === 403 || status === 404
              ? "This collection is no longer available to your account."
              : "We couldn't confirm the save. Your entries are still here; check your collection before trying again."}
      </p>
      {status === 401 && (
        <a href="/auth/login?returnTo=%2Fcollections">Sign in again</a>
      )}
    </div>
  );
}
