import { FormEvent, useEffect, useState } from "react";
import {
  AttributeDefinition,
  Collection,
  ItemDetail,
  ItemFilters,
  ItemSummary,
  ItemType,
  Location,
  Tag
} from "../../api";
import { SavedItemView } from "../types";
import { ConfirmDialog } from "../components/ConfirmDialog";
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
  itemFilterTypeId,
  itemLocationId,
  itemTypeId,
  itemName,
  itemQuantity,
  itemSaveCount,
  itemSearchText,
  itemSortBy,
  itemSortDirection,
  itemTagIds,
  itemTypes,
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
  itemFilterMinQuantity,
  itemFilterMaxQuantity,
  itemFilterCreatedAfter,
  itemFilterCreatedBefore,
  itemFilterHasNoLocation,
  itemFilterHasNoTags,
  onApplySavedView,
  onAttributeFilterChange,
  onAttributeValueChange,
  onClearItemFilters,
  onDeleteSavedView,
  onEditItem,
  onItemDescriptionChange,
  onItemLocationChange,
  onItemTypeIdChange,
  onItemNameChange,
  onItemQuantityChange,
  onItemSearchTextChange,
  onItemSortByChange,
  onItemSortDirectionChange,
  onItemSubmit,
  onItemFilterLocationChange,
  onItemFilterTypeIdChange,
  onResetItemForm,
  onSaveCurrentView,
  onSavedViewNameChange,
  onSelectItem,
  onToggleFilterTag,
  onToggleItemTag,
  onItemMinQuantityChange,
  onItemMaxQuantityChange,
  onItemCreatedAfterChange,
  onItemCreatedBeforeChange,
  onItemHasNoLocationChange,
  onItemHasNoTagsChange,
  isDeleteItemPending,
  onDeleteItem,
  itemPage,
  itemTotalPages,
  itemTotalCount,
  onItemPageChange,
  onUploadItemMedia,
  onDeleteItemMedia,
  onSetPrimaryItemMedia,
  isUploadMediaPending
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
  itemFilterTypeId: string;
  itemLocationId: string;
  itemTypeId: string;
  itemName: string;
  itemQuantity: string;
  itemSaveCount: number;
  itemSearchText: string;
  itemSortBy: ItemFilters["sortBy"];
  itemSortDirection: ItemFilters["sortDirection"];
  itemTagIds: string[];
  itemTypes: ItemType[];
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
  itemFilterMinQuantity: number | undefined;
  itemFilterMaxQuantity: number | undefined;
  itemFilterCreatedAfter: string;
  itemFilterCreatedBefore: string;
  itemFilterHasNoLocation: boolean;
  itemFilterHasNoTags: boolean;
  onApplySavedView: (view: SavedItemView) => void;
  onAttributeFilterChange: (attributeKey: string, value: string) => void;
  onAttributeValueChange: (attributeDefinitionId: string, value: string) => void;
  onClearItemFilters: () => void;
  onDeleteSavedView: (viewId: string) => void;
  onEditItem: () => void;
  onItemDescriptionChange: (value: string) => void;
  onItemLocationChange: (value: string) => void;
  onItemTypeIdChange: (value: string) => void;
  onItemNameChange: (value: string) => void;
  onItemQuantityChange: (value: string) => void;
  onItemSearchTextChange: (value: string) => void;
  onItemSortByChange: (value: ItemFilters["sortBy"]) => void;
  onItemSortDirectionChange: (value: ItemFilters["sortDirection"]) => void;
  onItemSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onItemFilterLocationChange: (value: string) => void;
  onItemFilterTypeIdChange: (value: string) => void;
  onResetItemForm: () => void;
  onSaveCurrentView: () => void;
  onSavedViewNameChange: (value: string) => void;
  onSelectItem: (itemId: string) => void;
  onToggleFilterTag: (tagId: string) => void;
  onToggleItemTag: (tagId: string) => void;
  onItemMinQuantityChange: (value: number | undefined) => void;
  onItemMaxQuantityChange: (value: number | undefined) => void;
  onItemCreatedAfterChange: (value: string) => void;
  onItemCreatedBeforeChange: (value: string) => void;
  onItemHasNoLocationChange: (value: boolean) => void;
  onItemHasNoTagsChange: (value: boolean) => void;
  isDeleteItemPending: boolean;
  onDeleteItem: () => void;
  itemPage: number;
  itemTotalPages: number;
  itemTotalCount: number;
  onItemPageChange: (page: number) => void;
  onUploadItemMedia: (file: File) => void;
  onDeleteItemMedia: (mediaAssetId: string) => void;
  onSetPrimaryItemMedia: (mediaAssetId: string) => void;
  isUploadMediaPending: boolean;
}>) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const anyDrawerOpen = isDetailDrawerOpen || isFormDrawerOpen;

  const activeFilterCount =
    (itemSearchText.trim().length > 0 ? 1 : 0) +
    (itemFilterLocationId.length > 0 ? 1 : 0) +
    (itemFilterTagIds.length > 0 ? 1 : 0) +
    (itemFilterTypeId.length > 0 ? 1 : 0) +
    Object.values(itemAttributeFilters).filter((v) => v.trim().length > 0).length +
    (itemSortBy !== "updatedUtc" || itemSortDirection !== "desc" ? 1 : 0) +
    (itemFilterMinQuantity != null ? 1 : 0) +
    (itemFilterMaxQuantity != null ? 1 : 0) +
    (itemFilterCreatedAfter.length > 0 ? 1 : 0) +
    (itemFilterCreatedBefore.length > 0 ? 1 : 0) +
    (itemFilterHasNoLocation ? 1 : 0) +
    (itemFilterHasNoTags ? 1 : 0);

  useEffect(() => {
    if (itemSaveCount > 0) {
      setIsFormDrawerOpen(false);
    }
  }, [itemSaveCount]);

  useEffect(() => {
    if (!anyDrawerOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsDetailDrawerOpen(false);
        setIsFormDrawerOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [anyDrawerOpen]);

  function handleSelectItem(itemId: string) {
    onSelectItem(itemId);
    setIsDetailDrawerOpen(true);
  }

  function handleEditFromDetail() {
    onEditItem();
    setIsDetailDrawerOpen(false);
    setIsFormDrawerOpen(true);
  }

  function handleAddItem() {
    onResetItemForm();
    setIsFormDrawerOpen(true);
  }

  function handleCancelForm() {
    onResetItemForm();
    setIsFormDrawerOpen(false);
  }

  function handleDeleteConfirmed() {
    onDeleteItem();
    setShowDeleteItemConfirm(false);
    setIsDetailDrawerOpen(false);
  }

  return (
    <section className="items-workspace">
      {/* Toolbar */}
      <div className="panel items-toolbar">
        <input
          className="items-toolbar-search"
          placeholder="Search items"
          value={itemSearchText}
          onChange={(e) => onItemSearchTextChange(e.target.value)}
        />
        <button
          className={`secondary-button filters-toggle${isFiltersOpen ? " active" : ""}`}
          onClick={() => setIsFiltersOpen((f) => !f)}
          type="button"
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            aria-label="Card view"
            aria-pressed={viewMode === "cards"}
            className={`secondary-button view-toggle-btn${viewMode === "cards" ? " active" : ""}`}
            onClick={() => setViewMode("cards")}
            title="Card view"
            type="button"
          >
            &#9646;&#9646;
          </button>
          <button
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
            className={`secondary-button view-toggle-btn${viewMode === "table" ? " active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table view"
            type="button"
          >
            &#9776;
          </button>
        </div>
        <button
          className="primary-button"
          onClick={handleAddItem}
          type="button"
        >
          + Add Item
        </button>
      </div>

      {/* Collapsible filters panel */}
      {isFiltersOpen && (
        <div className="filters-collapsible panel">
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
            itemTypes={itemTypes}
            itemTypeId={itemFilterTypeId}
            minQuantity={itemFilterMinQuantity}
            maxQuantity={itemFilterMaxQuantity}
            createdAfter={itemFilterCreatedAfter}
            createdBefore={itemFilterCreatedBefore}
            hasNoLocation={itemFilterHasNoLocation}
            hasNoTags={itemFilterHasNoTags}
            onApplySavedView={onApplySavedView}
            onAttributeFilterChange={onAttributeFilterChange}
            onClear={onClearItemFilters}
            onDeleteSavedView={onDeleteSavedView}
            onLocationChange={onItemFilterLocationChange}
            onItemTypeIdChange={onItemFilterTypeIdChange}
            onSavedViewNameChange={onSavedViewNameChange}
            onSaveView={onSaveCurrentView}
            onSearchTextChange={onItemSearchTextChange}
            onSortByChange={onItemSortByChange}
            onSortDirectionChange={onItemSortDirectionChange}
            onToggleTag={onToggleFilterTag}
            onMinQuantityChange={onItemMinQuantityChange}
            onMaxQuantityChange={onItemMaxQuantityChange}
            onCreatedAfterChange={onItemCreatedAfterChange}
            onCreatedBeforeChange={onItemCreatedBeforeChange}
            onHasNoLocationChange={onItemHasNoLocationChange}
            onHasNoTagsChange={onItemHasNoTagsChange}
          />
        </div>
      )}

      {/* Item list */}
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
          viewMode={viewMode}
          onSelect={handleSelectItem}
        />

        {itemTotalPages > 1 && (
          <div className="pagination">
            <button
              className="secondary-button"
              disabled={itemPage <= 1}
              onClick={() => onItemPageChange(itemPage - 1)}
              type="button"
            >
              &lsaquo; Previous
            </button>
            <span className="pagination-info">
              Page {itemPage} of {itemTotalPages} &mdash; {itemTotalCount} items
            </span>
            <button
              className="secondary-button"
              disabled={itemPage >= itemTotalPages}
              onClick={() => onItemPageChange(itemPage + 1)}
              type="button"
            >
              Next &rsaquo;
            </button>
          </div>
        )}
      </section>

      {/* Drawer backdrop */}
      {anyDrawerOpen && (
        <button
          aria-label="Close panel"
          className="drawer-backdrop"
          onClick={() => {
            setIsDetailDrawerOpen(false);
            setIsFormDrawerOpen(false);
          }}
          type="button"
        />
      )}

      {/* Detail drawer */}
      <div
        aria-hidden={!isDetailDrawerOpen}
        aria-label="Item detail"
        aria-modal={isDetailDrawerOpen}
        className={`item-drawer detail-drawer${isDetailDrawerOpen ? " open" : ""}`}
        role="dialog"
      >
        <div className="drawer-header">
          <h2>Item Detail</h2>
          <button
            aria-label="Close item detail"
            className="secondary-button"
            onClick={() => setIsDetailDrawerOpen(false)}
            type="button"
          >
            &#x2715;
          </button>
        </div>
        {isItemDetailLoading && <p className="message">Loading item detail...</p>}
        <ItemDetailCard
          item={itemDetail}
          isEditing={isEditing && itemDetail?.id === selectedItemId}
          onEdit={handleEditFromDetail}
          onDelete={() => setShowDeleteItemConfirm(true)}
          selectedCollectionName={selectedCollection.name}
          onUploadMedia={onUploadItemMedia}
          onDeleteMedia={onDeleteItemMedia}
          onSetPrimaryMedia={onSetPrimaryItemMedia}
          isUploadPending={isUploadMediaPending}
        />
      </div>

      {/* Form drawer */}
      <div
        aria-hidden={!isFormDrawerOpen}
        aria-label={isEditing ? "Edit item" : "Create item"}
        aria-modal={isFormDrawerOpen}
        className={`item-drawer form-drawer${isFormDrawerOpen ? " open" : ""}`}
        role="dialog"
      >
        <div className="drawer-header">
          <h2>{isEditing ? "Edit Item" : "Create Item"}</h2>
          <button
            aria-label="Close item form"
            className="secondary-button"
            onClick={handleCancelForm}
            type="button"
          >
            &#x2715;
          </button>
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
            selectedTagIds={itemTagIds}
            tags={tags}
            onToggle={onToggleItemTag}
          />

          <DynamicAttributeFields
            attributeDefinitions={attributeDefinitions.filter(
              (d) => d.itemTypeId === null || d.itemTypeId === (itemTypeId || null)
            )}
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
      </div>

      {showDeleteItemConfirm && itemDetail ? (
        <ConfirmDialog
          title={`Delete "${itemDetail.name}"?`}
          message="This item will be permanently removed. This action cannot be undone."
          isPending={isDeleteItemPending}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteItemConfirm(false)}
        />
      ) : null}
    </section>
  );
}
