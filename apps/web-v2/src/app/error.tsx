"use client";
import { CollectionFailure } from "@/components/collection-states";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main">
      <CollectionFailure error={new Error("Page unavailable")} retry={reset} />
    </main>
  );
}
