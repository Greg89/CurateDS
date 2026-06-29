import { FormEvent, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Collection,
  hasActiveItemFilters,
  parseItemFiltersSearchParams,
  getItemDetail,
  listAttributeDefinitions,
  listItems,
  listItemTypes,
  listLocations,
  listTags
} from "../../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ItemDetailDrawer } from "../components/ItemDetailDrawer";
import { ItemFiltersPanel } from "../components/ItemFiltersPanel";
import { ItemFormDrawer } from "../components/ItemFormDrawer";
import { ItemList } from "../components/ItemList";
import { ItemsToolbar } from "../components/ItemsToolbar";
import { useItemFilters } from "../hooks/useItemFilters";
import { useItemForm } from "../hooks/useItemForm";
import { useItemMutations } from "../hooks/useItemMutations";
import { useItemsWorkspaceState } from "../hooks/useItemsWorkspaceState";
import { useSavedViews } from "../hooks/useSavedViews";
import { buildItemFiltersCacheKey } from "../utils";

export function ItemsPage({
  selectedCollection
}: Readonly<{
  selectedCollection: Collection;
}>) {
  const collectionId = selectedCollection.id;
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    itemFilters,
    itemSearchText,
    setItemSearchText,
    itemFilterLocationId,
    setItemFilterLocationId,
    itemFilterTagIds,
    itemAttributeFilters,
    itemSortBy,
    setItemSortBy,
    itemSortDirection,
    setItemSortDirection,
    itemPage,
    setItemPage,
    pageSize,
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
    applyItemFilters,
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

  const {
    createItemMutation,
    updateItemMutation,
    deleteItemMutation,
    uploadItemMediaMutation,
    deleteItemMediaMutation,
    setPrimaryItemMediaMutation
  } = useItemMutations({
    collectionId,
    populateItemForm,
    setSelectedItemId,
    setEditingItemId,
    setItemSaveCount,
    onCreateSuccess: resetItemForm
  });

  const attributeDefinitionsQuery = useQuery({
    queryKey: ["attribute-definitions", collectionId],
    queryFn: () => listAttributeDefinitions(collectionId)
  });

  const itemFiltersCacheKey = buildItemFiltersCacheKey(itemFilters);

  const itemsQuery = useQuery({
    queryKey: [
      "items",
      collectionId,
      itemPage,
      pageSize,
      itemFiltersCacheKey
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

  const attributeDefinitions = attributeDefinitionsQuery.data ?? [];
  const items = itemsQuery.data?.items ?? [];
  const itemDetail = itemDetailQuery.data ?? null;
  const tags = tagsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const itemTypes = itemTypesQuery.data ?? [];
  const itemTotalPages = itemsQuery.data?.totalPages ?? 1;
  const itemTotalCount = itemsQuery.data?.totalCount ?? 0;
  const isEditing = editingItemId !== null;

  const {
    activeFilterCount,
    anyDrawerOpen,
    isDetailDrawerOpen,
    isFiltersOpen,
    isFormDrawerOpen,
    showDeleteItemConfirm,
    viewMode,
    setViewMode,
    toggleFilters,
    openDetailDrawer,
    closeDetailDrawer,
    openFormDrawer,
    closeFormDrawer,
    closeDrawers,
    openDeleteItemConfirm,
    closeDeleteItemConfirm
  } = useItemsWorkspaceState({
    itemFilters,
    itemSaveCount
  });

  // Drill-through from Reports page via URL search params
  useEffect(() => {
    const drillItemId = searchParams.get("itemId");
    const drillFilters = parseItemFiltersSearchParams(searchParams);

    if (!drillItemId && !hasActiveItemFilters(drillFilters)) {
      return;
    }

    applyItemFilters(drillFilters);

    if (drillItemId) {
      setSelectedItemId(drillItemId);
    }

    const next = new URLSearchParams(searchParams);
    next.delete("searchText");
    next.delete("locationId");
    next.delete("itemTypeId");
    next.delete("sortBy");
    next.delete("sortDirection");
    next.delete("minQuantity");
    next.delete("maxQuantity");
    next.delete("createdAfter");
    next.delete("createdBefore");
    next.delete("tagIds");
    next.delete("attributeFilters");
    next.delete("itemId");
    next.delete("hasNoLocation");
    next.delete("hasNoTags");
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
    openDetailDrawer();
  }

  function handleEditFromDetail() {
    if (!itemDetailQuery.data) return;
    populateItemForm(itemDetailQuery.data);
    setEditingItemId(itemDetailQuery.data.id);
    closeDetailDrawer();
    openFormDrawer();
  }

  function handleAddItem() {
    resetItemForm();
    openFormDrawer();
  }

  function handleCancelForm() {
    resetItemForm();
    closeFormDrawer();
  }

  function handleDeleteConfirmed() {
    deleteItemMutation.mutate({ collectionId, itemId: selectedItemId });
    closeDeleteItemConfirm();
    closeDetailDrawer();
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
      <ItemsToolbar
        searchText={itemSearchText}
        onSearchTextChange={(v) => { setItemPage(1); setItemSearchText(v); }}
        isFiltersOpen={isFiltersOpen}
        onToggleFilters={toggleFilters}
        activeFilterCount={activeFilterCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddItem={handleAddItem}
      />

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

      {anyDrawerOpen && (
        <button
          aria-label="Close panel"
          className="drawer-backdrop"
          onClick={closeDrawers}
          type="button"
        />
      )}

      <ItemDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={closeDetailDrawer}
        isLoading={itemDetailQuery.isLoading}
        item={itemDetail}
        isEditing={isEditing && itemDetail?.id === selectedItemId}
        selectedCollectionName={selectedCollection.name}
        onEdit={handleEditFromDetail}
        onDelete={openDeleteItemConfirm}
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

      <ItemFormDrawer
        isOpen={isFormDrawerOpen}
        isEditing={isEditing}
        onClose={handleCancelForm}
        onSubmit={handleItemSubmit}
        onResetForm={resetItemForm}
        isPending={createItemMutation.isPending || updateItemMutation.isPending}
        error={createItemMutation.error ?? updateItemMutation.error ?? null}
        name={itemName}
        description={itemDescription}
        quantity={itemQuantity}
        locationId={itemLocationId}
        itemTypeId={itemTypeId}
        tagIds={itemTagIds}
        attributeValues={itemAttributeValues}
        onNameChange={setItemName}
        onDescriptionChange={setItemDescription}
        onQuantityChange={setItemQuantity}
        onLocationIdChange={setItemLocationId}
        onItemTypeIdChange={setItemTypeId}
        onToggleTag={toggleItemTag}
        onAttributeValueChange={handleAttributeValueChange}
        locations={locations}
        itemTypes={itemTypes}
        tags={tags}
        attributeDefinitions={attributeDefinitions}
      />

      {showDeleteItemConfirm && itemDetail ? (
        <ConfirmDialog
          title={`Delete "${itemDetail.name}"?`}
          message="This item will be permanently removed. This action cannot be undone."
          isPending={deleteItemMutation.isPending}
          onConfirm={handleDeleteConfirmed}
          onCancel={closeDeleteItemConfirm}
        />
      ) : null}
    </section>
  );
}
