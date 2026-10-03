"use client";
import { insightsKey, activityKey } from "@/lib/insights";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import { ItemFailure, ItemImage } from "./item-shared";
import { SaveError } from "./save-error";
import { overviewKey } from "@/lib/collections";
import { fetchItem, itemKey, itemsKey, writeItem } from "@/lib/items";
import { imageTypes, maxImageBytes } from "@/lib/upload";

export function ItemDetailView() {
  const collection = useCollection();
  const { itemId } = useParams<{ itemId: string }>();
  return (
    <Detail
      key={`${collection.id}/${itemId}`}
      collectionId={collection.id}
      itemId={itemId}
    />
  );
}
function Detail({
  collectionId,
  itemId,
}: {
  collectionId: string;
  itemId: string;
}) {
  const collection = useCollection();
  const router = useRouter();
  const client = useQueryClient();
  const guard = useRef(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState("");
  useEffect(() => {
    if (!busy && message) uploadInput.current?.focus();
  }, [busy, message]);
  const query = useQuery({
    queryKey: itemKey(collectionId, itemId),
    queryFn: ({ signal }) => fetchItem(collectionId, itemId, signal),
  });
  const base = `/collections/${collectionId}/items/${itemId}`;
  async function change(
    suffix: string,
    method: "POST" | "PUT" | "DELETE",
    body?: FormData,
  ) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError(null);
    setMessage("");
    setValidation("");
    try {
      await writeItem(`/api${base}${suffix}`, method, body);
      setConfirm(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: insightsKey(collectionId) }),
        client.invalidateQueries({ queryKey: activityKey(collectionId) }),
        client.invalidateQueries({ queryKey: itemsKey(collectionId) }),
        client.invalidateQueries({ queryKey: overviewKey(collectionId) }),
      ]);
      if (!suffix && method === "DELETE") {
        client.removeQueries({ queryKey: itemKey(collectionId, itemId) });
        router.push(`/collections/${collectionId}/browse`);
        return;
      }
      await client.invalidateQueries({
        queryKey: itemKey(collectionId, itemId),
      });
      if (body && uploadInput.current) uploadInput.current.value = "";
      setMessage(
        method === "POST"
          ? "Image added."
          : method === "DELETE"
            ? "Image removed."
            : "Primary image updated.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Save failed"));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  if (query.isPending) return <p role="status">Opening your item…</p>;
  if (query.isError)
    return (
      <ItemFailure
        collectionId={collectionId}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const item = query.data;
  return (
    <section data-color={collection.color || "forest"}>
      <Link className="back-link" href={`/collections/${collectionId}/browse`}>
        ← Browse {collection.name}
      </Link>
      <header className="collection-heading item-detail-heading">
        <span className="eyebrow">{collection.name} / Item</span>
        <h1>{item.name}</h1>
        <p>{item.description || "A part of your collection."}</p>
        <Link className="button" href={`${base}/edit`}>
          Edit item
        </Link>
      </header>
      <dl className="item-facts">
        <div>
          <dt>Quantity</dt>
          <dd>{item.quantity}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{item.locationName || "No location"}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{item.tags.map((tag) => tag.name).join(" · ") || "No tags"}</dd>
        </div>
        {item.attributeValues.map((value) => (
          <div key={value.attributeDefinitionId}>
            <dt>{value.attributeName}</dt>
            <dd>
              {value.dataType === "Boolean"
                ? value.value.toLowerCase() === "true"
                  ? "Yes"
                  : "No"
                : value.value}
            </dd>
          </div>
        ))}
      </dl>
      <section className="media-section">
        <h2>A closer look</h2>
        <p>
          Add JPG, PNG, WebP, or GIF images up to 20 MB each. The primary image
          appears in browse.
        </p>
        <form
          className="collection-form"
          onSubmit={(event) => {
            event.preventDefault();
            const file = uploadInput.current?.files?.[0];
            if (
              !file ||
              !imageTypes.includes(file.type) ||
              file.size === 0 ||
              file.size > maxImageBytes
            ) {
              setValidation(
                "Choose a JPG, PNG, WebP, or GIF image between 1 byte and 20 MB.",
              );
              return;
            }
            const body = new FormData();
            body.append("file", file);
            void change("/media", "POST", body);
          }}
        >
          <label>
            Choose an image
            <input
              ref={uploadInput}
              type="file"
              accept={imageTypes.join(",")}
              required
              disabled={busy}
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Upload image"}
          </button>
        </form>
        {validation && <p role="alert">{validation}</p>}
        {error && <SaveError error={error} />}
        <p role="status">{message}</p>
        {item.mediaAssets.length ? (
          <ul className="media-grid">
            {item.mediaAssets.map((media) => (
              <li key={media.id}>
                <figure>
                  <ItemImage
                    key={media.url}
                    url={media.url}
                    name={media.fileName}
                  />
                  <figcaption>
                    {media.fileName}
                    {media.isPrimary && <strong> · Primary image</strong>}
                  </figcaption>
                </figure>
                <div className="form-actions">
                  {!media.isPrimary && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void change(`/media/${media.id}/primary`, "PUT")
                      }
                    >
                      Make primary
                    </button>
                  )}
                  <button
                    className="text-button"
                    disabled={busy}
                    aria-label={`Remove ${media.fileName}`}
                    onClick={() => setConfirm(media.id)}
                  >
                    Remove image
                  </button>
                </div>
                {confirm === media.id && (
                  <div
                    className="confirm-panel"
                    role="group"
                    aria-label="Confirm image removal"
                  >
                    <p>Remove this image permanently?</p>
                    <button
                      autoFocus
                      disabled={busy}
                      onClick={() =>
                        void change(`/media/${media.id}`, "DELETE")
                      }
                    >
                      Remove permanently
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setConfirm(null);
                        uploadInput.current?.focus();
                      }}
                    >
                      Keep image
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No images yet. Start with your favourite angle.</p>
        )}
      </section>
      <section className="workspace-note">
        <button
          ref={deleteButton}
          className="text-button"
          disabled={busy}
          onClick={() => setConfirm("item")}
        >
          Delete item
        </button>
        {confirm === "item" && (
          <div
            className="confirm-panel"
            role="group"
            aria-label="Confirm item deletion"
          >
            <p>Delete {item.name} and its image records permanently?</p>
            <button
              autoFocus
              disabled={busy}
              onClick={() => void change("", "DELETE")}
            >
              Delete permanently
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setConfirm(null);
                deleteButton.current?.focus();
              }}
            >
              Keep item
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
