"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useCollection } from "./collection-context";
import { PublicShowcaseView } from "./public-showcase-view";
import {
  publicationPreviewSchema,
  publicationSlugSchema,
  publicationStatusSchema,
  suggestPublicationSlug,
  type PublicationPreview,
} from "@/lib/publication";

class PublicationError extends Error {
  constructor(public status: number) {
    super("Publication request failed");
  }
}
async function read<T>(
  url: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new PublicationError(response.status);
  return schema.parse(await response.json());
}
function message(error: unknown) {
  const status = error instanceof PublicationError ? error.status : 503;
  return (
    (
      {
        401: "Your session has ended. Sign in again to continue.",
        403: "You cannot change this publication.",
        404: "This collection or review is no longer available.",
        409: "The review changed, expired, or its address was claimed. Prepare a new review before publishing.",
        422: "An image could not be prepared. Retry, or choose to prepare without images.",
        429: "Too many reviews were requested. Wait a minute, then try again.",
      } as Record<number, string>
    )[status] ??
    "Sharing is unavailable right now. We could not confirm this action. Retry or reload to check the publication status."
  );
}

export function PublicationReview() {
  const collection = useCollection();
  const client = useQueryClient();
  const key = ["publication", collection.id];
  const base = `/api/collections/${collection.id}/publication`;
  const status = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => read(base, publicationStatusSchema, { signal }),
    retry: false,
  });
  const [slug, setSlug] = useState(() =>
    suggestPublicationSlug(collection.name, crypto.randomUUID()),
  );
  const [omitImages, setOmitImages] = useState(false);
  const [preview, setPreview] = useState<PublicationPreview | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [cardState, setCardState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [cardAttempt, setCardAttempt] = useState(0);
  const [busy, setBusy] = useState<"prepare" | "publish" | "unpublish" | null>(
    null,
  );
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!preview) return;
    const remaining = new Date(preview.expiresUtc).getTime() - Date.now();
    setExpired(remaining <= 0);
    const timer = setTimeout(() => setExpired(true), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [preview]);
  const address = status.data?.slug ?? slug;
  const stale =
    !!preview && (expired || preview.generation !== status.data?.generation);
  async function prepare() {
    setBusy("prepare");
    setError(null);
    setNotice("");
    setAccepted(false);
    setPreview(null);
    setCardState("loading");
    setConfirm(false);
    try {
      const next = await read(`${base}/previews`, publicationPreviewSchema, {
        method: "POST",
        body: JSON.stringify({ slug: address, omitImages }),
      });
      setPreview(next);
      setExpired(new Date(next.expiresUtc).getTime() <= Date.now());
      // Refresh the head after staging; a concurrent revocation must not look ready.
      await status.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }
  async function publish() {
    if (!preview || stale || !accepted || cardState !== "ready") return;
    setBusy("publish");
    setError(null);
    setNotice("");
    try {
      await client.cancelQueries({ queryKey: key });
      const next = await read(base, publicationStatusSchema, {
        method: "PUT",
        body: JSON.stringify({
          candidateToken: preview.token,
          expectedGeneration: preview.generation,
        }),
      });
      client.setQueryData(key, next);
      setPreview(null);
      setAccepted(false);
      setNotice("Your reviewed edition is now published.");
    } catch (e) {
      setError(e);
      if (e instanceof PublicationError && [404, 409].includes(e.status)) {
        setPreview(null);
        setAccepted(false);
        await status.refetch();
      }
    } finally {
      setBusy(null);
    }
  }
  async function unpublish() {
    setBusy("unpublish");
    setError(null);
    setNotice("");
    try {
      await client.cancelQueries({ queryKey: key });
      const next = await read(base, publicationStatusSchema, {
        method: "DELETE",
      });
      client.setQueryData(key, next);
      setPreview(null);
      setAccepted(false);
      setConfirm(false);
      setNotice(
        "Unpublished. New visitors can no longer open this edition. Your address remains reserved.",
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="publication-review">
      <section className="publication-panel" aria-label="Sharing controls">
        <p className="eyebrow">A considered introduction</p>
        <h1>Review before sharing.</h1>
        <p>
          Prepare a private snapshot, check everything below, then choose to
          publish. Workspace edits do not update a published edition.
        </p>
        {status.isPending ? (
          <p role="status">Checking publication…</p>
        ) : status.isError ? (
          <div role="alert">
            <p>{message(status.error)}</p>
            <button onClick={() => void status.refetch()}>Retry status</button>
          </div>
        ) : (
          <>
            <p className="publication-status">{status.data.state}</p>
            {status.data.state === "suspended" && (
              <p>
                A source was removed, so sharing was stopped. Prepare and review
                a new edition to share again.
              </p>
            )}
            {status.data.state === "published" && (
              <p>
                The current edition is public.{" "}
                <a
                  href={`/showcase/${status.data.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open published showcase ↗
                </a>
              </p>
            )}
            <label htmlFor="publication-slug">Showcase address</label>
            <input
              id="publication-slug"
              type="text"
              value={address}
              readOnly={!!status.data.slug}
              disabled={!!busy}
              onChange={(event) => setSlug(event.target.value)}
              aria-describedby="publication-address-help"
              aria-invalid={!publicationSlugSchema.safeParse(address).success}
              maxLength={80}
            />
            {!publicationSlugSchema.safeParse(address).success && (
              <p role="alert">
                Use 3–80 lowercase letters, numbers, and single separating
                hyphens.
              </p>
            )}
            <p id="publication-address-help">
              <code>/showcase/{address}</code>
              <br />
              {status.data.slug
                ? "This address is reserved and stays the same after unpublishing."
                : "Use 3–80 lowercase letters, numbers, and single separating hyphens. The address becomes permanent on first publication."}
            </p>
            <label>
              <input
                type="checkbox"
                checked={omitImages}
                disabled={!!busy}
                onChange={(event) => setOmitImages(event.target.checked)}
              />
              Prepare without images
            </label>
            <div className="publication-actions">
              <button
                disabled={
                  !!busy || !publicationSlugSchema.safeParse(address).success
                }
                onClick={() => void prepare()}
              >
                {busy === "prepare"
                  ? "Preparing review…"
                  : preview
                    ? "Prepare a new review"
                    : "Prepare review"}
              </button>
              {status.data.state !== "unpublished" && (
                <button disabled={!!busy} onClick={() => setConfirm(true)}>
                  Unpublish
                </button>
              )}
            </div>
            {confirm && (
              <div role="group" aria-label="Confirm unpublishing">
                <p>
                  Stop serving this edition to new visitors? Screenshots,
                  downloads, open tabs, and copies saved by other services
                  cannot be recalled.
                </p>
                <div className="publication-actions">
                  <button disabled={!!busy} onClick={() => void unpublish()}>
                    {busy === "unpublish"
                      ? "Unpublishing…"
                      : "Confirm unpublish"}
                  </button>
                  <button disabled={!!busy} onClick={() => setConfirm(false)}>
                    Keep published
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {!!error && <p role="alert">{message(error)}</p>}
        {((error instanceof PublicationError && error.status === 401) ||
          (status.error instanceof PublicationError &&
            status.error.status === 401)) && (
          <a
            href={`/auth/login?returnTo=${encodeURIComponent(`/collections/${collection.id}/showcase/review`)}`}
          >
            Sign in again
          </a>
        )}
        {notice && <p role="status">{notice}</p>}
      </section>
      {preview && (
        <>
          <section
            className="publication-panel"
            aria-label="Review this edition"
          >
            <h2>This is the edition visitors will see.</h2>
            <figure className="publication-card">
              <img
                key={`${preview.token}:${cardAttempt}`}
                src={`${base}/previews/${preview.token}/social`}
                alt="Share card preview"
                width={1200}
                height={630}
                onLoad={() => setCardState("ready")}
                onError={() => setCardState("error")}
              />
              <figcaption>
                Link preview for this edition. Long text may be shortened and
                symbols outside the bundled fonts use a placeholder. The
                showcase keeps the original text.
              </figcaption>
            </figure>
            {cardState === "loading" && (
              <p role="status">Preparing the share card…</p>
            )}
            {cardState === "error" && (
              <div role="alert">
                <p>
                  The share card could not load. Retry its preview before
                  publishing.
                </p>
                <button
                  onClick={() => {
                    setCardState("loading");
                    setCardAttempt((value) => value + 1);
                  }}
                >
                  Retry share card
                </button>
              </div>
            )}
            <p>
              Address: <code>/showcase/{preview.showcase.slug}</code>
            </p>
            <p>
              Review expires{" "}
              <time dateTime={preview.expiresUtc}>
                {new Date(preview.expiresUtc).toLocaleString()}
              </time>
              . Preparing a review does not make it public.
            </p>
            <ul>
              {preview.notices.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p>
              Check the title, story, cards, images, and reports below. Reports
              cover the entire collection. External covers use a theme fallback;
              shortened descriptions are marked.
            </p>
            <p>
              Anyone with the link can view, copy, and redistribute this
              edition. Unpublishing stops new requests through CurateDS; it
              cannot recall copies or third-party previews.
            </p>
            {stale && (
              <p role="alert">
                This review has expired or the publication changed. Prepare a
                new review.
              </p>
            )}
            <label>
              <input
                type="checkbox"
                checked={accepted}
                disabled={!!busy || stale || cardState !== "ready"}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              I reviewed this edition and want to make it public.
            </label>
            <div className="publication-actions">
              <button
                disabled={
                  !!busy ||
                  !accepted ||
                  stale ||
                  status.isError ||
                  cardState !== "ready"
                }
                onClick={() => void publish()}
              >
                {busy === "publish"
                  ? "Publishing…"
                  : status.data?.state === "published"
                    ? "Publish updated edition"
                    : "Publish this edition"}
              </button>
            </div>
          </section>
          <PublicShowcaseView
            showcase={preview.showcase}
            imageUrl={(asset) =>
              `${base}/previews/${preview.token}/media/${asset}`
            }
          />
        </>
      )}
    </div>
  );
}
