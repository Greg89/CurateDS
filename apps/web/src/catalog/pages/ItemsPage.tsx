import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Collection,
  createItem,
  deleteItem,
  deleteItemMedia,
  getItemDetail,
  listAttributeDefinitions,
  listItems,
  listItemTypes,
  listLocations,
  listTags,
  setPrimaryItemMedia,
  updateItem,
  uploadItemMedia
} from "../../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DynamicAttributeFields } from "../components/DynamicAttributeFields";
import { ItemDetailCard } from "../components/ItemDetailCard";
import { ItemFiltersPanel } from "../components/ItemFiltersPanel";
import { ItemList } from "../components/ItemList";
import { TagSelector } from "../components/TagMultiSelect";
import { useItemFilters } from "../hooks/useItemFilters";
import { useItemForm } from "../hooks/useItemForm";
import { useSavedViews } from "../hooks/useSavedViews";

export function ItemsPage({
  selectedCollection
}: Readonly<{
  selectedCollection: Collection;
}>) {
  const collectionId = selectedCollection.id;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    itemFilters,
    itemSearchText,
    setItemSearchText,
    itemFilterLocationId,
    setItemFilterLocationId,
    itemFilterTagIds,
    setItemFilterTagIds,
    itemAttributeFilters,
    itemSortBy,
    setItemSortBy,
    itemSortDirection,
    setItemSortDirection,
    itemPage,
    setItemPage,
    pageSize,
    normalizedItemFilterTagIds,
    itemFilterMinQuantity,
    setItemFilterMinQuantity,
    itemFilterMaxQuantity,
    setItemFilterMaxQuantity,
    itemFilterCreatedAfter,
    setItemFilterCreatedAfter,
    itemFilterCreatedBefore,
    setItemFilterCreatedBefore,
    itemFilterHasNoLocation,
    setItemFilterHasNoLocation,
    itemFilterHasNoTags,
    setItemFilterHasNoTags,
    itemFilterTypeId,
    setItemFilterTypeId,
    clearItemFilters,
    toggleFilterTag,
    handleAttributeFilterChange,
    applySavedView
  } = useItemFilters(collectionId);

  const {
    itemName,
    setItemName,
    itemDescription,
    setItemDescription,
    itemQuantity,
    setItemQuantity,
    itemLocationId,
    setItemLocationId,
    itemTypeId,
    setItemTypeId,
    itemTagIds,
    itemAttributeValues,
    selectedItemId,
    setSelectedItemId,
    editingItemId,
    setEditingItemId,
    itemSaveCount,
    setItemSaveCount,
    populateItemForm,
    resetItemForm,
    toggleItemTag,
    handleAttributeValueChange
  } = useItemForm(collectionId);

  const {
    savedViewName,
    setSavedViewName,
    savedViews,
    saveCurrentView,
    deleteSavedView
  } = useSavedViews(collectionId);

  const attributeDefinitionsQuery = useQuery({
    queryKey: ["attribute-definitions", collectionId],
    queryFn: () => listAttributeDefinitions(collectionId)
  });

  const itemsQuery = useQuery({
    queryKey: [
      "items",
      collectionId,
      itemPage,
      itemSearchText,
      itemFilterLocationId,
      itemFilterTypeId,
      itemSortBy,
      itemSortDirection,
      JSON.stringify(itemAttributeFilters),
      ...normalizedItemFilterTagIds
    ],
    queryFn: () => listItems(collectionId, itemFilters, itemPage, pageSize)
  });

  const itemDetailQuery = useQuery({
    queryKey: ["item-detail", collectionId, selectedItemId],
    queryFn: () => getItemDetail(collectionId, selectedItemId),
    enabled: selectedItemId.length > 0
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: listTags
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations
  });

  const itemTypesQuery = useQuery({
    queryKey: ["item-types", collectionId],
    queryFn: () => listItemTypes(collectionId)
  });

  const createItemMutation = useMutation({
    mutationFn: createItem,
    onSuccess: async (item) => {
      resetItemForm();
      setSelectedItemId(item.id);
      setItemSaveCount((c) => c + 1);
      await queryClient.invalidateQueries({ queryKey: ["items", collectionId] });
      await queryClient.invalidateQueries({ queryKey: ["item-detail", collectionId, item.id] });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: updateItem,
    onSuccess: async (item) => {
      populateItemForm(item);
      setSelectedItemId(item.id);
      setEditingItemId(item.id);
      setItemSaveCount((c) => c + 1);
      await queryClient.invalidateQueries({ queryKey: ["items", collectionId] });
      await queryClient.invalidateQueries({ queryKey: ["item-detail", collectionId, item.id] });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => {
      setSelectedItemId("");
      await queryClient.invalidateQueries({ queryKey: ["items", collectionId] });
    }
  });

  const uploadItemMediaMutation = useMutation({
    mutationFn: uploadItemMedia,
    onSuccess: async (_asset, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["item-detail", variables.collectionId, variables.itemId] });
      await queryClient.invalidateQueries({ queryKey: ["items", variables.collectionId] });
    }
  });

  const deleteItemMediaMutation = useMutation({
    mutationFn: deleteItemMedia,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["item-detail", variables.collectionId, variables.itemId] });
      await queryClient.invalidateQueries({ queryKey: ["items", variables.collectionId] });
    }
  });

  const setPrimaryItemMediaMutation = useMutation({
    mutationFn: setPrimaryItemMedia,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["item-detail", variables.collectionId, variables.itemId] });
      await queryClient.invalidateQueries({ queryKey: ["items", variables.collectionId] });
    }
  });

  const attributeDefinitions = attributeDefinitionsQuery.data ?? [];
  const items = itemsQuery.data?.items ?? [];
  const itemDetail = itemDetailQuery.data ?? null;
  const tags = tagsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const itemTypes = itemTypesQuery.data ?? [];
  const itemTotalPages = itemsQuery.data?.totalPages ?? 1;
  const itemTotalCount = itemsQuery.data?.totalCount ?? 0;
  const isEditing = editingItemId !== null;

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

  // Close form drawer after a successful save
  useEffect(() => {
    if (itemSaveCount > 0) {
      setIsFormDrawerOpen(false);
    }
  }, [itemSaveCount]);

  // Escape key closes open drawers
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

  // Drill-through from Reports page via URL search params
  useEffect(() => {
    const drillTagId = searchParams.get("tagId");
    const drillLocationId = searchParams.get("locationId");
    const drillItemId = searchParams.get("itemId");

    if (!drillTagId && !drillLocationId && !drillItemId) return;

    if (drillItemId) {
      clearItemFilters();
      setSelectedItemId(drillItemId);
    }
    if (drillTagId) setItemFilterTagIds([drillTagId]);
    if (drillLocationId) setItemFilterLocationId(drillLocationId);
    setItemPage(1);

    const next = new URLSearchParams(searchParams);
    next.delete("tagId");
    next.delete("locationId");
    next.delete("itemId");
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-select the first item when the results change and nothing is selected
  useEffect(() => {
    if (!itemsQuery.data) return;

    const dataItems = itemsQuery.data.items;

    if (dataItems.length === 0) {
      if (selectedItemId) setSelectedItemId("");
      return;
    }

    const hasSelectedItem = dataItems.some((item) => item.id === selectedItemId);
    if (!hasSelectedItem) setSelectedItemId(dataItems[0].id);
  }, [itemsQuery.data, selectedItemId]);

  function handleSelectItem(itemId: string) {
    setSelectedItemId(itemId);
    setIsDetailDrawerOpen(true);
  }

  function handleEditFromDetail() {
    if (!itemDetailQuery.data) return;
    populateItemForm(itemDetailQuery.data);
    setEditingItemId(itemDetailQuery.data.id);
    setIsDetailDrawerOpen(false);
    setIsFormDrawerOpen(true);
  }

  function handleAddItem() {
    resetItemForm();
    setIsFormDrawerOpen(true);
  }

  function handleCancelForm() {
    resetItemForm();
    setIsFormDrawerOpen(false);
  }

  function handleDeleteConfirmed() {
    deleteItemMutation.mutate({ collectionId, itemId: selectedItemId });
    setShowDeleteItemConfirm(false);
    setIsDetailDrawerOpen(false);
  }

  function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const attributeValues = attributeDefinitions
      .map((d) => ({ attributeDefinitionId: d.id, value: itemAttributeValues[d.id] ?? "" }))
      .filter((av) => av.value.trim().length > 0);

    if (editingItemId) {
      updateItemMutation.mutate({
        collectionId,
        itemId: editingItemId,
        name: itemName,
        description: itemDescription,
        quantity: Number(itemQuantity),
        locationId: itemLocationId || null,
        itemTypeId: itemTypeId || null,
        tagIds: itemTagIds,
        attributeValues
      });
      return;
    }

    createItemMutation.mutate({
      collectionId,
      name: itemName,
      description: itemDescription,
      quantity: Number(itemQuantity),
      locationId: itemLocationId || null,
      itemTypeId: itemTypeId || null,
      tagIds: itemTagIds,
      attributeValues
    });
  }

  return (
    <section className="items-workspace">
      {/* Toolbar */}
      <div className="panel items-toolbar">
        <input
          className="items-toolbar-search"
          placeholder="Search items"
          value={itemSearchText}
          onChange={(e) => { setItemPage(1); setItemSearchText(e.target.value); }}
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
            attributeDefinitions={attributeDefinitions.filter((d) => d.isFilterable)}
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
            onApplySavedView={applySavedView}
            onAttributeFilterChange={handleAttributeFilterChange}
            onClear={clearItemFilters}
            onDeleteSavedView={deleteSavedView}
            onLocationChange={(v) => { setItemPage(1); setItemFilterLocationId(v); }}
            onItemTypeIdChange={(v) => { setItemPage(1); setItemFilterTypeId(v); }}
            onSavedViewNameChange={setSavedViewName}
            onSaveView={() => saveCurrentView(itemFilters)}
            onSearchTextChange={(v) => { setItemPage(1); setItemSearchText(v); }}
            onSortByChange={(v) => { setItemPage(1); setItemSortBy(v); }}
            onSortDirectionChange={(v) => { setItemPage(1); setItemSortDirection(v); }}
            onToggleTag={toggleFilterTag}
            onMinQuantityChange={(v) => { setItemPage(1); setItemFilterMinQuantity(v); }}
            onMaxQuantityChange={(v) => { setItemPage(1); setItemFilterMaxQuantity(v); }}
            onCreatedAfterChange={(v) => { setItemPage(1); setItemFilterCreatedAfter(v); }}
            onCreatedBeforeChange={(v) => { setItemPage(1); setItemFilterCreatedBefore(v); }}
            onHasNoLocationChange={(v) => { setItemPage(1); setItemFilterHasNoLocation(v); }}
            onHasNoTagsChange={(v) => { setItemPage(1); setItemFilterHasNoTags(v); }}
          />
        </div>
      )}

      {/* Item list */}
      <section className="panel">
        <div className="panel-header">
          <h3>Item List</h3>
          <p>Browse the filtered results for this collection.</p>
        </div>

        {itemsQuery.isLoading ? <p className="message">Loading items...</p> : null}
        {itemsQuery.isError ? <p className="message error">{itemsQuery.error.message}</p> : null}

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
              onClick={() => setItemPage(itemPage - 1)}
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
              onClick={() => setItemPage(itemPage + 1)}
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
        {itemDetailQuery.isLoading && <p className="message">Loading item detail...</p>}
        <ItemDetailCard
          item={itemDetail}
          isEditing={isEditing && itemDetail?.id === selectedItemId}
          onEdit={handleEditFromDetail}
          onDelete={() => setShowDeleteItemConfirm(true)}
          selectedCollectionName={selectedCollection.name}
          onUploadMedia={(file) =>
            uploadItemMediaMutation.mutate({ collectionId, itemId: selectedItemId, file })
          }
          onDeleteMedia={(mediaAssetId) =>
            deleteItemMediaMutation.mutate({ collectionId, itemId: selectedItemId, mediaAssetId })
          }
          onSetPrimaryMedia={(mediaAssetId) =>
            setPrimaryItemMediaMutation.mutate({ collectionId, itemId: selectedItemId, mediaAssetId })
          }
          isUploadPending={uploadItemMediaMutation.isPending}
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

        <form className="collection-form" onSubmit={handleItemSubmit}>
          <div className="form-mode-row">
            <p className="message">
              {isEditing ? "Editing the selected item." : "Creating a new item draft."}
            </p>
            {isEditing ? (
              <button className="secondary-button" onClick={resetItemForm} type="button">
                Start New Item
              </button>
            ) : null}
          </div>

          <label className="field">
            <span>Name</span>
            <input
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="Kind of Blue"
              maxLength={120}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              className="field-textarea"
              value={itemDescription}
              onChange={(event) => setItemDescription(event.target.value)}
              placeholder="Original mono pressing with clean sleeve."
              maxLength={2000}
              rows={3}
            />
          </label>

          <label className="field">
            <span>Quantity</span>
            <input
              value={itemQuantity}
              onChange={(event) => setItemQuantity(event.target.value)}
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
              onChange={(event) => setItemLocationId(event.target.value)}
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
                onChange={(event) => setItemTypeId(event.target.value)}
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
            onToggle={toggleItemTag}
          />

          <DynamicAttributeFields
            attributeDefinitions={attributeDefinitions.filter(
              (d) => d.itemTypeId === null || d.itemTypeId === (itemTypeId || null)
            )}
            disabled={false}
            values={itemAttributeValues}
            onChange={handleAttributeValueChange}
          />

          <button
            className="primary-button"
            disabled={createItemMutation.isPending || updateItemMutation.isPending}
            type="submit"
          >
            {createItemMutation.isPending || updateItemMutation.isPending
              ? "Saving Item..."
              : isEditing
                ? "Save Item Changes"
                : "Create Item"}
          </button>

          {createItemMutation.error || updateItemMutation.error ? (
            <p className="message error">
              {createItemMutation.error?.message ?? updateItemMutation.error?.message}
            </p>
          ) : null}
        </form>
      </div>

      {showDeleteItemConfirm && itemDetail ? (
        <ConfirmDialog
          title={`Delete "${itemDetail.name}"?`}
          message="This item will be permanently removed. This action cannot be undone."
          isPending={deleteItemMutation.isPending}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteItemConfirm(false)}
        />
      ) : null}
    </section>
  );
}
