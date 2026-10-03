"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import { ItemFailure } from "./item-shared";
import { SaveError } from "./save-error";
import {
  definitionSchema,
  fetchOptions,
  optionsKey,
  itemsKey,
  writeItem,
  type Definition,
  type ItemOptions,
} from "@/lib/items";
import { CollectionsError, overviewKey } from "@/lib/collections";
import { insightsKey } from "@/lib/insights";
import {
  createFieldInputSchema,
  fieldInputSchema,
  fieldTypes,
  vocabulary,
} from "@/lib/customization";

export function FieldSettings() {
  const collection = useCollection();
  const query = useQuery({
    queryKey: optionsKey(collection.id),
    queryFn: ({ signal }) => fetchOptions(collection.id, signal),
  });
  return (
    <section
      id="custom-fields"
      className="overview-settings"
      aria-labelledby="fields-title"
    >
      <header>
        <span className="eyebrow">The details you care about</span>
        <h2 id="fields-title">Choose your custom fields.</h2>
        <p>
          Keep details such as edition, maker, or purchase date. Start with just
          the fields that matter to this collection.
        </p>
      </header>
      {query.isPending ? (
        <p role="status">Loading custom fields…</p>
      ) : query.isError ? (
        <ItemFailure
          collectionId={collection.id}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <FieldsEditor key={collection.id} options={query.data} />
      )}
    </section>
  );
}
function FieldsEditor({ options }: { options: ItemOptions }) {
  const collection = useCollection();
  const words = vocabulary(collection);
  const client = useQueryClient();
  const [editing, setEditing] = useState<Definition | "new" | null>(null);
  const [removing, setRemoving] = useState<Definition | null>(null);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  const base = `/api/collections/${collection.id}/fields`;
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: optionsKey(collection.id) }),
      client.invalidateQueries({ queryKey: itemsKey(collection.id) }),
      client.invalidateQueries({ queryKey: ["item", collection.id] }),
      client.invalidateQueries({ queryKey: insightsKey(collection.id) }),
      client.invalidateQueries({ queryKey: overviewKey(collection.id) }),
    ]);
  }
  function close() {
    setEditing(null);
    setRemoving(null);
    requestAnimationFrame(() => addButton.current?.focus());
  }
  return (
    <>
      <ul className="field-list" aria-label="Custom fields">
        {options.definitions.map((field) => (
          <li key={field.id}>
            <div>
              <h3>{field.name}</h3>
              <p>
                {fieldTypes[field.dataType]} ·{" "}
                {field.itemTypeId
                  ? options.types.find((type) => type.id === field.itemTypeId)
                      ?.name || "Specific type"
                  : `All ${words.many}`}{" "}
                · {field.isRequired ? "Required" : "Optional"}
                {field.isFilterable ? " · Available in filters" : ""}
              </p>
            </div>
            <div className="settings-actions">
              <button
                className="text-button"
                disabled={!!editing || !!removing}
                onClick={() => {
                  setEditing(field);
                  setError(null);
                  setMessage("");
                }}
                aria-label={`Edit ${field.name} field`}
              >
                Edit
              </button>
              <button
                className="text-button"
                disabled={!!editing || !!removing}
                onClick={() => {
                  setRemoving(field);
                  setError(null);
                  setMessage("");
                }}
                aria-label={`Remove ${field.name} field`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {options.definitions.length === 0 && (
        <p>No custom fields yet. You can keep collecting without them.</p>
      )}
      <button
        ref={addButton}
        className="button"
        disabled={!!editing || !!removing}
        onClick={() => {
          setEditing("new");
          setError(null);
          setMessage("");
        }}
      >
        Add a custom field
      </button>
      {editing && (
        <FieldForm
          key={editing === "new" ? "new" : editing.id}
          field={editing === "new" ? undefined : editing}
          types={options.types}
          onCancel={close}
          onSave={async (data) => {
            const saved = definitionSchema.parse(
              await writeItem(
                `${base}${editing === "new" ? "" : `/${editing.id}`}`,
                editing === "new" ? "POST" : "PUT",
                data,
              ),
            );
            if (
              saved.collectionId !== collection.id ||
              (editing !== "new" && saved.id !== editing.id)
            )
              throw new CollectionsError(502);
            await refresh();
            close();
            setMessage("Custom field saved.");
          }}
        />
      )}
      {removing && (
        <form
          className="collection-form field-editor"
          aria-label={`Remove ${removing.name} field`}
          onSubmit={async (event) => {
            event.preventDefault();
            if (guard.current) return;
            guard.current = true;
            setBusy(true);
            setError(null);
            try {
              await writeItem(`${base}/${removing.id}`, "DELETE");
              await refresh();
              close();
              setMessage("Custom field removed.");
            } catch (cause) {
              setError(cause as Error);
            } finally {
              setBusy(false);
              guard.current = false;
            }
          }}
        >
          <h3>Remove {removing.name}?</h3>
          <p>
            This removes the field and permanently deletes its saved values from
            every {words.one} in this collection. Saved views using this field
            will need to be recreated.
          </p>
          {error && <SaveError error={error} />}
          <div className="settings-actions">
            <button className="button" disabled={busy}>
              Remove field and values
            </button>
            <button
              autoFocus
              type="button"
              className="text-button"
              disabled={busy}
              onClick={close}
            >
              Keep field
            </button>
          </div>
        </form>
      )}
      <p role="status">{message}</p>
    </>
  );
}
function FieldForm({
  field,
  types,
  onCancel,
  onSave,
}: {
  field?: Definition;
  types: ItemOptions["types"];
  onCancel: () => void;
  onSave: (data: unknown) => Promise<void>;
}) {
  const words = vocabulary(useCollection());
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [validation, setValidation] = useState("");
  return (
    <form
      className="collection-form field-editor"
      aria-label={field ? `Edit ${field.name} field` : "New custom field"}
      onSubmit={async (event) => {
        event.preventDefault();
        if (guard.current) return;
        const form = new FormData(event.currentTarget);
        const input = {
          name: form.get("name"),
          dataType: field?.dataType || form.get("dataType"),
          isRequired: form.has("isRequired"),
          isFilterable: form.has("isFilterable"),
          itemTypeId: form.get("itemTypeId") || null,
        };
        const parsed = (
          field ? fieldInputSchema : createFieldInputSchema
        ).safeParse(input);
        if (!parsed.success) {
          setValidation(parsed.error.issues[0].message);
          return;
        }
        guard.current = true;
        setBusy(true);
        setError(null);
        setValidation("");
        try {
          await onSave(parsed.data);
        } catch (cause) {
          setError(cause as Error);
        } finally {
          guard.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend>{field ? "Edit custom field" : "New custom field"}</legend>
        <label>
          Field name
          <input
            autoFocus
            name="name"
            required
            minLength={2}
            maxLength={60}
            defaultValue={field?.name || ""}
          />
        </label>
        <label>
          Kind of detail
          <select
            name="dataType"
            disabled={!!field}
            defaultValue={field?.dataType || "Text"}
          >
            {Object.entries(fieldTypes)
              .filter(
                ([key]) => key !== "SingleSelect" || field?.dataType === key,
              )
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        {field && (
          <p>
            The kind of detail stays fixed to protect existing values. Renaming
            changes its filter name; recreate saved views that use this field.
          </p>
        )}
        <label>
          Applies to
          <select name="itemTypeId" defaultValue={field?.itemTypeId || ""}>
            <option value="">All {words.many}</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <div className="check-options">
          <label>
            <input
              type="checkbox"
              name="isRequired"
              defaultChecked={field?.isRequired || false}
            />
            Required when saving
          </label>
          <label>
            <input
              type="checkbox"
              name="isFilterable"
              defaultChecked={field?.isFilterable ?? true}
            />
            Available in filters and insights
          </label>
        </div>
        <p>
          Required fields must be filled in the next time an applicable{" "}
          {words.one} is saved. Changing the type scope does not erase existing
          values.
        </p>
      </fieldset>
      {validation && <p role="alert">{validation}</p>}
      {error &&
        (error instanceof CollectionsError && error.status === 400 ? (
          <p role="alert">
            Check the field name and type. Another field may already use this
            name. Your changes are still here.
          </p>
        ) : (
          <SaveError error={error} />
        ))}
      <div className="settings-actions">
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save custom field"}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel field changes
        </button>
      </div>
    </form>
  );
}
