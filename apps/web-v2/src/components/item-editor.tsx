"use client";
import { insightsKey, activityKey } from "@/lib/insights";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import { ItemFailure } from "./item-shared";
import { SaveError } from "./save-error";
import { CollectionsError, overviewKey } from "@/lib/collections";
import {
  fetchItem,
  fetchOptions,
  itemDetailSchema,
  itemInputSchema,
  itemKey,
  itemsKey,
  optionsKey,
  writeItem,
  type ItemDetail,
  type ItemOptions,
} from "@/lib/items";

export function ItemEditor({ editing = false }: { editing?: boolean }) {
  const collection = useCollection();
  const { itemId } = useParams<{ itemId: string }>();
  const options = useQuery({
    queryKey: optionsKey(collection.id),
    queryFn: ({ signal }) => fetchOptions(collection.id, signal),
  });
  const item = useQuery({
    queryKey: itemKey(collection.id, itemId),
    enabled: editing,
    queryFn: ({ signal }) => fetchItem(collection.id, itemId, signal),
  });
  if (options.isError || (editing && item.isError))
    return (
      <ItemFailure
        collectionId={collection.id}
        error={options.error || item.error!}
        retry={() => {
          void options.refetch();
          if (editing) void item.refetch();
        }}
      />
    );
  if (options.isPending || (editing && item.isPending))
    return <p role="status">Preparing your item…</p>;
  return (
    <section data-color={collection.color || "forest"}>
      <header className="collection-heading">
        <span className="eyebrow">
          {collection.name} / {editing ? "Edit item" : "New item"}
        </span>
        <h1>{editing ? "A little more of the story." : "A new find."}</h1>
        <p>
          Add the details that make this item yours. Images can be added after
          saving.
        </p>
      </header>
      <EditorForm
        key={editing ? itemId : "new"}
        collectionId={collection.id}
        options={options.data}
        item={editing ? item.data : undefined}
      />
    </section>
  );
}

function EditorForm({
  collectionId,
  options,
  item,
}: {
  collectionId: string;
  options: ItemOptions;
  item?: ItemDetail;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const guard = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [validation, setValidation] = useState("");
  const [typeId, setTypeId] = useState(item?.itemTypeId || "");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      item?.attributeValues.map((value) => [
        value.attributeDefinitionId,
        value.value,
      ]) || [],
    ),
  );
  const definitions = options.definitions
    .filter((d) => !d.itemTypeId || d.itemTypeId === typeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const base = `/collections/${collectionId}/items`;
  return (
    <form
      className="collection-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (guard.current) return;
        const form = new FormData(event.currentTarget);
        const parsed = itemInputSchema.safeParse({
          name: form.get("name"),
          description: form.get("description"),
          quantity: Number(form.get("quantity")),
          locationId: form.get("locationId") || null,
          itemTypeId: typeId || null,
          tagIds: form.getAll("tagIds"),
          attributeValues: definitions
            .filter((d) => values[d.id]?.trim())
            .map((d) => ({ attributeDefinitionId: d.id, value: values[d.id] })),
        });
        if (!parsed.success) {
          setValidation(parsed.error.issues[0].message);
          return;
        }
        if (definitions.some((d) => d.isRequired && !values[d.id]?.trim())) {
          setValidation("Complete the required collection fields.");
          return;
        }
        setValidation("");
        setError(null);
        guard.current = true;
        setBusy(true);
        try {
          const saved = itemDetailSchema.parse(
            await writeItem(
              `/api${base}${item ? `/${item.id}` : ""}`,
              item ? "PUT" : "POST",
              parsed.data,
            ),
          );
          if (
            saved.collectionId !== collectionId ||
            (item && saved.id !== item.id)
          )
            throw new CollectionsError(502);
          await Promise.all([
            client.invalidateQueries({ queryKey: insightsKey(collectionId) }),
            client.invalidateQueries({ queryKey: activityKey(collectionId) }),
            client.invalidateQueries({ queryKey: itemsKey(collectionId) }),
            client.invalidateQueries({ queryKey: overviewKey(collectionId) }),
            client.invalidateQueries({
              queryKey: itemKey(collectionId, saved.id),
            }),
          ]);
          router.push(`${base}/${saved.id}`);
        } catch (caught) {
          setError(caught instanceof Error ? caught : new Error("Save failed"));
          guard.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy} className="editor-fields">
        <label>
          Item name
          <input
            name="name"
            autoFocus
            required
            minLength={3}
            maxLength={120}
            defaultValue={item?.name || ""}
          />
        </label>
        <label>
          A few words <span>(optional)</span>
          <textarea
            name="description"
            rows={4}
            maxLength={2000}
            defaultValue={item?.description || ""}
          />
        </label>
        <div className="filter-fields">
          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              min={1}
              max={2147483647}
              step={1}
              required
              defaultValue={item?.quantity || 1}
            />
          </label>
          <label>
            Location
            <select name="locationId" defaultValue={item?.locationId || ""}>
              <option value="">No location</option>
              {options.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Item type
          <select
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
          >
            <option value="">No specific type</option>
            {options.types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="check-options">
          <legend>Tags</legend>
          {options.tags.length ? (
            options.tags.map((tag) => (
              <label key={tag.id}>
                <input
                  type="checkbox"
                  name="tagIds"
                  value={tag.id}
                  defaultChecked={item?.tags.some((t) => t.id === tag.id)}
                />
                {tag.name}
              </label>
            ))
          ) : (
            <p>No tags have been created yet.</p>
          )}
        </fieldset>
        {definitions.length > 0 && (
          <fieldset className="editor-fields">
            <legend>Collection details</legend>
            {definitions.map((d) => (
              <label key={d.id}>
                {d.name}
                {d.isRequired ? " (required)" : " (optional)"}
                {d.dataType === "Boolean" ? (
                  <select
                    required={d.isRequired}
                    value={values[d.id] || ""}
                    onChange={(event) =>
                      setValues((previous) => ({
                        ...previous,
                        [d.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose an answer</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    required={d.isRequired}
                    type={
                      d.dataType === "Date"
                        ? "date"
                        : d.dataType === "Number" || d.dataType === "Decimal"
                          ? "number"
                          : "text"
                    }
                    step={d.dataType === "Number" ? 1 : "any"}
                    maxLength={10000}
                    value={values[d.id] || ""}
                    onChange={(event) =>
                      setValues((previous) => ({
                        ...previous,
                        [d.id]: event.target.value,
                      }))
                    }
                  />
                )}
              </label>
            ))}
          </fieldset>
        )}
      </fieldset>
      {validation && <p role="alert">{validation}</p>}
      {error && <SaveError error={error} />}
      <div className="form-actions">
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save item"}
        </button>
        {!busy && (
          <Link
            className="text-button"
            href={
              item
                ? `${base}/${item.id}`
                : `/collections/${collectionId}/browse`
            }
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
