"use client";
import { useId } from "react";

export type IdentityDraft = {
  name: string;
  category: string;
  description: string;
  coverImageUrl: string;
  color: string;
};
export const emptyIdentity: IdentityDraft = {
  name: "",
  category: "",
  description: "",
  coverImageUrl: "",
  color: "forest",
};

export function CollectionIdentityFields({
  value,
  onChange,
  expanded = false,
}: {
  value: IdentityDraft;
  onChange: (value: IdentityDraft) => void;
  expanded?: boolean;
}) {
  const hintId = useId();
  const field = (name: keyof IdentityDraft) => ({
    name,
    value: value[name],
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => onChange({ ...value, [name]: event.target.value }),
  });
  return (
    <>
      <label>
        Collection name
        <input
          {...field("name")}
          autoFocus={!expanded}
          required
          minLength={3}
          maxLength={100}
          placeholder="The reading room"
        />
      </label>
      <label>
        Hobby or category <span>(optional)</span>
        <input
          {...field("category")}
          maxLength={100}
          placeholder="Books, records, little discoveries…"
        />
      </label>
      <label>
        Description <span>(optional)</span>
        <textarea
          {...field("description")}
          maxLength={1000}
          rows={3}
          placeholder="What makes this collection yours?"
        />
      </label>
      <details open={expanded || undefined}>
        <summary>
          {expanded ? "Cover and colour" : "Add a cover and colour"}
        </summary>
        <label>
          Cover image URL <span>(optional)</span>
          <input
            {...field("coverImageUrl")}
            type="url"
            maxLength={2048}
            placeholder="https://…"
            aria-describedby={hintId}
          />
        </label>
        <p id={hintId} className="field-hint">
          Use an HTTPS link to an image. Leave it blank for a simple illustrated
          cover.
        </p>
        <label>
          Collection colour
          <select {...field("color")}>
            <option value="forest">Forest</option>
            <option value="clay">Clay</option>
            <option value="slate">Slate</option>
          </select>
        </label>
      </details>
    </>
  );
}
