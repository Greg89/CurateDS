"use client";
import Link from "next/link";
import { useState } from "react";
import { CollectionsError } from "@/lib/collections";

export function ItemImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  let safe = false;
  try { const parsed = new URL(url || ""); safe = ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password; } catch { /* Show identity fallback. */ }
  return <div className="item-image">{safe && !failed ? <img src={url!} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}</div>;
}
export function ItemFailure({ error, retry, collectionId }: { error: Error; retry: () => void; collectionId: string }) {
  const status = error instanceof CollectionsError ? error.status : 502;
  return <section className="workspace-note" role="alert"><h2>{status === 404 ? "This item is no longer here." : "We couldn't open this part of your collection."}</h2>
    {status === 401 ? <a className="button" href="/auth/login?returnTo=%2Fcollections">Sign in again</a>
      : status === 404 ? <Link className="button" href={`/collections/${collectionId}/browse`}>Back to browse</Link>
      : <button className="button" onClick={retry}>Try again</button>}</section>;
}
