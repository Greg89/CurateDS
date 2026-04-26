import { FormEvent } from "react";
import {
  AttributeDefinition,
  Collection,
  ItemDetail,
  ItemFilters,
  ItemSummary,
  Location,
  Tag
} from "../../api";
import { SavedItemView } from "../types";
import { DynamicAttributeFields } from "../components/DynamicAttributeFields";
import { ItemDetailCard } from "../components/ItemDetailCard";
import { ItemFiltersPanel } from "../components/ItemFiltersPanel";
import { ItemList } from "../components/ItemList";
import { TagSelector } from "../components/TagMultiSelect";

export function ItemsPage({
  attributeDefinitions,
  createItemError,
  isCreatePending,
  isUpdatePending,
  itemAttributeFilters,
  itemAttributeValues,
  itemDescription,
  itemDetail,
  itemFilterLocationId,
  itemFilterTagIds,
  itemLocationId,
  itemName,
  itemQuantity,
  itemSearchText,
  itemSortBy,
  itemSortDirection,
  itemTagIds,
  items,
  itemsError,
  isEditing,
  isItemDetailLoading,
  isItemsLoading,
  locations,
  savedViewName,
  savedViews,
  selectedCollection,
  selectedItemId,
  tags,
  updateItemError,
  onApplySavedView,
  onAttributeFilterChange,
  onAttributeValueChange,
  onClearItemFilters,
  onDeleteSavedView,
  onEditItem,
  onItemDescriptionChange,
  onItemLocationChange,
  onItemNameChange,
  onItemQuantityChange,
  onItemSearchTextChange,
  onItemSortByChange,
  onItemSortDirectionChange,
  onItemSubmit,
  onItemFilterLocationChange,
  onResetItemForm,
  onSaveCurrentView,
  onSavedViewNameChange,
  onSelectItem,
  onToggleFilterTag,
  onToggleItemTag
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  createItemError: string | null;
  isCreatePending: boolean;
  isUpdatePending: boolean;
  itemAttributeFilters: Record<string, string>;
  itemAttributeValues: Record<string, string>;
  itemDescription: string;
  itemDetail: ItemDetail | null;
  itemFilterLocationId: string;
  itemFilterTagIds: string[];
  itemLocationId: string;
  itemName: string;
  itemQuantity: string;
  itemSearchText: string;
  itemSortBy: ItemFilters["sortBy"];
  itemSortDirection: ItemFilters["sortDirection"];
  itemTagIds: string[];
  items: ItemSummary[];
  itemsError: string | null;
  isEditing: boolean;
  isItemDetailLoading: boolean;
  isItemsLoading: boolean;
  locations: Location[];
  savedViewName: string;
  savedViews: SavedItemView[];
  selectedCollection: Collection;
  selectedItemId: string;
  tags: Tag[];
  updateItemError: string | null;
  onApplySavedView: (view: SavedItemView) => void;
  onAttributeFilterChange: (attributeKey: string, value: string) => void;
  onAttributeValueChange: (attributeDefinitionId: string, value: string) => void;
  onClearItemFilters: () => void;
  onDeleteSavedView: (viewId: string) => void;
  onEditItem: () => void;
  onItemDescriptionChange: (value: string) => void;
  onItemLocationChange: (value: string) => void;
  onItemNameChange: (value: string) => void;
  onItemQuantityChange: (value: string) => void;
  onItemSearchTextChange: (value: string) => void;
  onItemSortByChange: (value: ItemFilters["sortBy"]) => void;
  onItemSortDirectionChange: (value: ItemFilters["sortDirection"]) => void;
  onItemSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onItemFilterLocationChange: (value: string) => void;
  onResetItemForm: () => void;
  onSaveCurrentView: () => void;
  onSavedViewNameChange: (value: string) => void;
  onSelectItem: (itemId: string) => void;
  onToggleFilterTag: (tagId: string) => void;
  onToggleItemTag: (tagId: string) => void;
}>) {
  return (
    <section className="content-grid panel-wide">
      <section className="panel">
        <div className="panel-header">
          <h3>{isEditing ? "Edit Item" : "Create Item"}</h3>
          <p>
            {isEditing
              ? `Update the selected entry for ${selectedCollection.name}.`
              : `Create real catalog entries for ${selectedCollection.name}.`}
          </p>
        </div>

        <form className="collection-form" onSubmit={onItemSubmit}>
          <div className="form-mode-row">
            <p className="message">
              {isEditing ? "Editing the selected item." : "Creating a new item draft."}
            </p>
            {isEditing ? (
              <button className="secondary-button" onClick={onResetItemForm} type="button">
                Start New Item
              </button>
            ) : null}
          </div>

          <label className="field">
            <span>Name</span>
            <input
              value={itemName}
              onChange={(event) => onItemNameChange(event.target.value)}
              placeholder="Kind of Blue"
              maxLength={120}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              className="field-textarea"
              value={itemDescription}
              onChange={(event) => onItemDescriptionChange(event.target.value)}
              placeholder="Original mono pressing with clean sleeve."
              maxLength={2000}
              rows={3}
            />
          </label>

          <label className="field">
            <span>Quantity</span>
            <input
              value={itemQuantity}
              onChange={(event) => onItemQuantityChange(event.target.value)}
              inputMode="numeric"
              min={1}
              max={9999}
              type="number"
            />
          </label>

          <label className="field">
            <span>Location</span>
            <select
              value={itemLocationId}
              onChange={(event) => onItemLocationChange(event.target.value)}
            >
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <TagSelector
            disabled={false}
            selectedTagIds={itemTagIds}
            tags={tags}
            onToggle={onToggleItemTag}
          />

          <DynamicAttributeFields
            attributeDefinitions={attributeDefinitions}
            disabled={false}
            values={itemAttributeValues}
            onChange={onAttributeValueChange}
          />

          <button
            className="primary-button"
            disabled={isCreatePending || isUpdatePending}
            type="submit"
          >
            {isCreatePending || isUpdatePending
              ? "Saving Item..."
              : isEditing
                ? "Save Item Changes"
                : "Create Item"}
          </button>

          {createItemError || updateItemError ? (
            <p className="message error">{createItemError ?? updateItemError}</p>
          ) : null}
        </form>
      </section>

      <section className="panel panel-wide">
        <ItemFiltersPanel
          attributeDefinitions={attributeDefinitions.filter(
            (attributeDefinition) => attributeDefinition.isFilterable
          )}
          attributeFilters={itemAttributeFilters}
          disabled={false}
          locationId={itemFilterLocationId}
          locations={locations}
          savedViewName={savedViewName}
          savedViews={savedViews}
          searchText={itemSearchText}
          selectedTagIds={itemFilterTagIds}
          sortBy={itemSortBy}
          sortDirection={itemSortDirection}
          tags={tags}
          onApplySavedView={onApplySavedView}
          onAttributeFilterChange={onAttributeFilterChange}
          onClear={onClearItemFilters}
          onDeleteSavedView={onDeleteSavedView}
          onLocationChange={onItemFilterLocationChange}
          onSavedViewNameChange={onSavedViewNameChange}
          onSaveView={onSaveCurrentView}
          onSearchTextChange={onItemSearchTextChange}
          onSortByChange={onItemSortByChange}
          onSortDirectionChange={onItemSortDirectionChange}
          onToggleTag={onToggleFilterTag}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Item List</h3>
          <p>Browse the filtered results for this collection.</p>
        </div>

        {isItemsLoading ? <p className="message">Loading items...</p> : null}
        {itemsError ? <p className="message error">{itemsError}</p> : null}

        <ItemList
          items={items}
          selectedCollectionName={selectedCollection.name}
          selectedItemId={selectedItemId}
          onSelect={onSelectItem}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Item Detail</h3>
          <p>Review what was actually saved and jump into edits when needed.</p>
        </div>

        {isItemDetailLoading ? <p className="message">Loading item detail...</p> : null}

        <ItemDetailCard
          item={itemDetail}
          isEditing={isEditing && itemDetail?.id === selectedItemId}
          onEdit={onEditItem}
          selectedCollectionName={selectedCollection.name}
        />
      </section>
    </section>
  );
}
