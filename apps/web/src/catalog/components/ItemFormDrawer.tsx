import { FormEvent } from "react";
import { AttributeDefinition, ItemType, Location, Tag } from "../../api";
import { DialogSurface } from "./DialogSurface";
import { DynamicAttributeFields } from "./DynamicAttributeFields";
import { TagSelector } from "./TagMultiSelect";

interface ItemFormDrawerProps {
  isOpen: boolean;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onResetForm: () => void;
  isPending: boolean;
  error: Error | null;
  // Form field values
  name: string;
  description: string;
  quantity: string;
  locationId: string;
  itemTypeId: string;
  tagIds: string[];
  attributeValues: Record<string, string>;
  // Field callbacks
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onQuantityChange: (v: string) => void;
  onLocationIdChange: (v: string) => void;
  onItemTypeIdChange: (v: string) => void;
  onToggleTag: (tagId: string) => void;
  onAttributeValueChange: (defId: string, value: string) => void;
  // Lookup data
  locations: Location[];
  itemTypes: ItemType[];
  tags: Tag[];
  attributeDefinitions: AttributeDefinition[];
}

export function ItemFormDrawer({
  isOpen,
  isEditing,
  onClose,
  onSubmit,
  onResetForm,
  isPending,
  error,
  name,
  description,
  quantity,
  locationId,
  itemTypeId,
  tagIds,
  attributeValues,
  onNameChange,
  onDescriptionChange,
  onQuantityChange,
  onLocationIdChange,
  onItemTypeIdChange,
  onToggleTag,
  onAttributeValueChange,
  locations,
  itemTypes,
  tags,
  attributeDefinitions,
}: Readonly<ItemFormDrawerProps>) {
  return (
    <DialogSurface
      ariaLabel={isEditing ? "Edit item" : "Create item"}
      className={`item-drawer form-drawer${isOpen ? " open" : ""}`}
      isOpen={isOpen}
      initialFocusSelector="[data-autofocus='true']"
      onRequestClose={onClose}
    >
      <div className="drawer-header">
        <h2>{isEditing ? "Edit Item" : "Create Item"}</h2>
        <button
          aria-label="Close item form"
          className="secondary-button"
          onClick={onClose}
          type="button"
        >
          &#x2715;
        </button>
      </div>

      <form className="collection-form" onSubmit={onSubmit}>
        <div className="form-mode-row">
          <p className="message">
            {isEditing ? "Editing the selected item." : "Creating a new item draft."}
          </p>
          {isEditing ? (
            <button className="secondary-button" onClick={onResetForm} type="button">
              Start New Item
            </button>
          ) : null}
        </div>

        <label className="field">
          <span>Name</span>
          <input
            data-autofocus="true"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Kind of Blue"
            maxLength={120}
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            className="field-textarea"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Original mono pressing with clean sleeve."
            maxLength={2000}
            rows={3}
          />
        </label>

        <label className="field">
          <span>Quantity</span>
          <input
            value={quantity}
            onChange={(event) => onQuantityChange(event.target.value)}
            inputMode="numeric"
            min={1}
            max={9999}
            type="number"
          />
        </label>

        <label className="field">
          <span>Location</span>
          <select
            value={locationId}
            onChange={(event) => onLocationIdChange(event.target.value)}
          >
            <option value="">No location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        {itemTypes.length > 0 && (
          <label className="field">
            <span>Item Type</span>
            <select
              value={itemTypeId}
              onChange={(event) => onItemTypeIdChange(event.target.value)}
            >
              <option value="">No type</option>
              {itemTypes.map((itemType) => (
                <option key={itemType.id} value={itemType.id}>
                  {itemType.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <TagSelector
          disabled={false}
          selectedTagIds={tagIds}
          tags={tags}
          onToggle={onToggleTag}
        />

        <DynamicAttributeFields
          attributeDefinitions={attributeDefinitions.filter(
            (d) => d.itemTypeId === null || d.itemTypeId === (itemTypeId || null)
          )}
          disabled={false}
          values={attributeValues}
          onChange={onAttributeValueChange}
        />

        <button
          className="primary-button"
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? "Saving Item..."
            : isEditing
              ? "Save Item Changes"
              : "Create Item"}
        </button>

        {error ? (
          <p className="message error">{error.message}</p>
        ) : null}
      </form>
    </DialogSurface>
  );
}
