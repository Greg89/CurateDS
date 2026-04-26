import { useState } from "react";
import { Tag } from "../../api";

export function TagSelector({
  disabled,
  selectedTagIds,
  tags,
  onToggle
}: Readonly<{
  disabled: boolean;
  selectedTagIds: string[];
  tags: Tag[];
  onToggle: (tagId: string) => void;
}>) {
  if (tags.length === 0) {
    return (
      <div className="empty-state compact">
        <p>No tags available yet.</p>
        <p>Add one in settings and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="field">
      <span>Tags</span>
      <TagMultiSelect
        disabled={disabled}
        emptyLabel="Select tags"
        selectedTagIds={selectedTagIds}
        tags={tags}
        onToggle={onToggle}
      />
    </div>
  );
}

export function TagMultiSelect({
  disabled,
  emptyLabel,
  selectedTagIds,
  tags,
  onToggle
}: Readonly<{
  disabled: boolean;
  emptyLabel: string;
  selectedTagIds: string[];
  tags: Tag[];
  onToggle: (tagId: string) => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const triggerLabel = selectedTags.length === 0
    ? emptyLabel
    : selectedTags.length <= 2
      ? selectedTags.map((tag) => tag.name).join(", ")
      : `${selectedTags.length} tags selected`;

  return (
    <div className={`multi-select${isOpen ? " open" : ""}`}>
      <button
        aria-expanded={isOpen}
        className="multi-select-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className="multi-select-value">{triggerLabel}</span>
        <span aria-hidden="true" className="multi-select-chevron">
          {isOpen ? "\u2303" : "\u2304"}
        </span>
      </button>

      {isOpen ? (
        <div className="multi-select-menu">
          {selectedTags.length > 0 ? (
            <div className="multi-select-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  for (const tagId of selectedTagIds) {
                    onToggle(tagId);
                  }
                }}
                type="button"
              >
                Clear {selectedTags.length} selected
              </button>
            </div>
          ) : null}

          <ul className="multi-select-list">
            {tags.map((tag) => (
              <li key={tag.id}>
                <label className="multi-select-option">
                  <input
                    checked={selectedTagIds.includes(tag.id)}
                    disabled={disabled}
                    onChange={() => onToggle(tag.id)}
                    type="checkbox"
                  />
                  <span>{tag.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
