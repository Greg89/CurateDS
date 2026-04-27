import { FormEvent, useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AttributeDataType,
  createAttributeDefinition,
  createCollection,
  createItem,
  createLocation,
  createTag,
  deleteAttributeDefinition,
  deleteCollection,
  deleteItem,
  deleteLocation,
  deleteTag,
  getItemDetail,
  listAttributeDefinitions,
  listCollections,
  listItems,
  listLocations,
  listTags,
  updateItem,
  uploadItemMedia,
  deleteItemMedia,
  setPrimaryItemMedia
} from "../api";
import { CatalogSection } from "./types";
import { readSidebarCollapsedState, sidebarStateStorageKey } from "./utils";
import { useItemFilters } from "./hooks/useItemFilters";
import { useItemForm } from "./hooks/useItemForm";
import { useSavedViews } from "./hooks/useSavedViews";
import { CollectionList } from "./components/CollectionList";
import { OverviewPage } from "./pages/OverviewPage";
import { ItemsPage } from "./pages/ItemsPage";
import { SettingsPage } from "./pages/SettingsPage";

export function CatalogApp({
  section
}: Readonly<{
  section: CatalogSection;
}>) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { collectionId: routeCollectionId } = useParams<{ collectionId: string }>();
  const selectedCollectionId = routeCollectionId ?? "";

  const [collectionName, setCollectionName] = useState("");
  const [attributeName, setAttributeName] = useState("");
  const [attributeDataType, setAttributeDataType] =
    useState<AttributeDataType>("Text");
  const [attributeIsRequired, setAttributeIsRequired] = useState(false);
  const [attributeIsFilterable, setAttributeIsFilterable] = useState(true);
  const [tagName, setTagName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsedState);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

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
    normalizedItemFilterTagIds,
    clearItemFilters,
    toggleFilterTag,
    handleAttributeFilterChange,
    applySavedView
  } = useItemFilters(selectedCollectionId);

  const {
    itemName,
    setItemName,
    itemDescription,
    setItemDescription,
    itemQuantity,
    setItemQuantity,
    itemLocationId,
    setItemLocationId,
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
  } = useItemForm(selectedCollectionId);

  const {
    savedViewName,
    setSavedViewName,
    savedViews,
    saveCurrentView,
    deleteSavedView
  } = useSavedViews(selectedCollectionId);

  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    queryFn: listCollections
  });

  const selectedCollection =
    collectionsQuery.data?.find((collection) => collection.id === selectedCollectionId) ??
    null;
  const hasSelectedCollection = selectedCollection !== null;

  const attributeDefinitionsQuery = useQuery({
    queryKey: ["attribute-definitions", selectedCollectionId],
    queryFn: () => listAttributeDefinitions(selectedCollectionId),
    enabled: hasSelectedCollection
  });

  const itemsQuery = useQuery({
    queryKey: [
      "items",
      selectedCollectionId,
      itemPage,
      itemSearchText,
      itemFilterLocationId,
      itemSortBy,
      itemSortDirection,
      JSON.stringify(itemAttributeFilters),
      ...normalizedItemFilterTagIds
    ],
    queryFn: () => listItems(selectedCollectionId, itemFilters, itemPage, pageSize),
    enabled: hasSelectedCollection
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: listTags
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations
  });

  const itemDetailQuery = useQuery({
    queryKey: ["item-detail", selectedCollectionId, selectedItemId],
    queryFn: () => getItemDetail(selectedCollectionId, selectedItemId),
    enabled: hasSelectedCollection && selectedItemId.length > 0
  });

  const createCollectionMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: async (collection) => {
      setCollectionName("");
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigateToCollection(collection.id, "overview");
    }
  });

  const createAttributeDefinitionMutation = useMutation({
    mutationFn: createAttributeDefinition,
    onSuccess: async () => {
      setAttributeName("");
      setAttributeDataType("Text");
      setAttributeIsRequired(false);
      setAttributeIsFilterable(true);
      await queryClient.invalidateQueries({
        queryKey: ["attribute-definitions", selectedCollectionId]
      });
    }
  });

  const createItemMutation = useMutation({
    mutationFn: createItem,
    onSuccess: async (item) => {
      resetItemForm();
      setSelectedItemId(item.id);
      setItemSaveCount((c) => c + 1);
      await queryClient.invalidateQueries({ queryKey: ["items", selectedCollectionId] });
      await queryClient.invalidateQueries({
        queryKey: ["item-detail", selectedCollectionId, item.id]
      });
    }
  });

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: async () => {
      setTagName("");
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  });

  const createLocationMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: async () => {
      setLocationName("");
      setLocationDescription("");
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: updateItem,
    onSuccess: async (item) => {
      populateItemForm(item);
      setSelectedItemId(item.id);
      setEditingItemId(item.id);
      setItemSaveCount((c) => c + 1);
      await queryClient.invalidateQueries({ queryKey: ["items", selectedCollectionId] });
      await queryClient.invalidateQueries({
        queryKey: ["item-detail", selectedCollectionId, item.id]
      });
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate("/");
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => {
      setSelectedItemId("");
      await queryClient.invalidateQueries({ queryKey: ["items", selectedCollectionId] });
    }
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      await queryClient.invalidateQueries({ queryKey: ["items", selectedCollectionId] });
    }
  });

  const deleteLocationMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
      await queryClient.invalidateQueries({ queryKey: ["items", selectedCollectionId] });
    }
  });

  const deleteAttributeDefinitionMutation = useMutation({
    mutationFn: deleteAttributeDefinition,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attributeDefinitions", selectedCollectionId] });
      await queryClient.invalidateQueries({ queryKey: ["items", selectedCollectionId] });
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

  function navigateToCollection(
    collectionId: string,
    nextSection: CatalogSection = section
  ) {
    navigate(`/collections/${collectionId}/${nextSection}`);
  }

  function handleCollectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCollectionMutation.mutate(collectionName);
  }

  function handleAttributeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCollectionId) {
      return;
    }

    createAttributeDefinitionMutation.mutate({
      collectionId: selectedCollectionId,
      name: attributeName,
      dataType: attributeDataType,
      isRequired: attributeIsRequired,
      isFilterable: attributeIsFilterable
    });
  }

  function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCollectionId) {
      return;
    }

    const attributeValues = (attributeDefinitionsQuery.data ?? [])
      .map((attributeDefinition) => ({
        attributeDefinitionId: attributeDefinition.id,
        value: itemAttributeValues[attributeDefinition.id] ?? ""
      }))
      .filter((attributeValue) => attributeValue.value.trim().length > 0);

    if (editingItemId) {
      updateItemMutation.mutate({
        collectionId: selectedCollectionId,
        itemId: editingItemId,
        name: itemName,
        description: itemDescription,
        quantity: Number(itemQuantity),
        locationId: itemLocationId || null,
        tagIds: itemTagIds,
        attributeValues
      });

      return;
    }

    createItemMutation.mutate({
      collectionId: selectedCollectionId,
      name: itemName,
      description: itemDescription,
      quantity: Number(itemQuantity),
      locationId: itemLocationId || null,
      tagIds: itemTagIds,
      attributeValues
    });
  }

  function handleTagSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTagMutation.mutate(tagName);
  }

  function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createLocationMutation.mutate({
      name: locationName,
      description: locationDescription
    });
  }

  function beginEditingSelectedItem() {
    if (!itemDetailQuery.data) {
      return;
    }

    populateItemForm(itemDetailQuery.data);
    setEditingItemId(itemDetailQuery.data.id);
    navigateToCollection(selectedCollectionId, "items");
  }

  useEffect(() => {
    setSelectedItemId("");
  }, [selectedCollectionId]);

  useEffect(() => {
    if (!itemsQuery.data) {
      return;
    }

    const dataItems = itemsQuery.data.items;

    if (dataItems.length === 0) {
      if (selectedItemId) {
        setSelectedItemId("");
      }

      return;
    }

    const hasSelectedItem = dataItems.some((item) => item.id === selectedItemId);

    if (!hasSelectedItem) {
      setSelectedItemId(dataItems[0].id);
    }
  }, [itemsQuery.data, selectedItemId]);

  useEffect(() => {
    if (
      selectedCollectionId &&
      collectionsQuery.isSuccess &&
      !collectionsQuery.data.some((collection) => collection.id === selectedCollectionId)
    ) {
      navigate("/", { replace: true });
    }
  }, [collectionsQuery.data, collectionsQuery.isSuccess, navigate, selectedCollectionId]);

  useEffect(() => {
    window.localStorage.setItem(
      sidebarStateStorageKey,
      JSON.stringify(isSidebarCollapsed)
    );
  }, [isSidebarCollapsed]);

  return (
    <main className={`app-shell${isSidebarCollapsed ? " sidebar-is-collapsed" : ""}${isSidebarMobileOpen ? " sidebar-mobile-open" : ""}`}>
      <button
        aria-hidden={!isSidebarMobileOpen}
        className={`sidebar-backdrop${isSidebarMobileOpen ? " visible" : ""}`}
        onClick={() => setIsSidebarMobileOpen(false)}
        tabIndex={isSidebarMobileOpen ? 0 : -1}
        type="button"
      />

      <aside className={`sidebar panel${isSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        {isSidebarCollapsed ? (
          <div className="sidebar-collapsed-rail">
            <button
              aria-expanded={false}
              aria-label="Expand collection sidebar"
              className="secondary-button sidebar-toggle-icon sidebar-desktop-toggle"
              onClick={() => setIsSidebarCollapsed(false)}
              type="button"
            >
              <span aria-hidden="true">&#8250;</span>
            </button>
          </div>
        ) : (
          <>
            <div className="sidebar-top">
              <div className="sidebar-header">
                <p className="eyebrow">CurateDS</p>
                <h1>Collections</h1>
                <p className="copy">
                  Shape collections, switch context quickly, and keep the main workspace focused.
                </p>
              </div>

              <div className="sidebar-controls">
                <button
                  aria-expanded={true}
                  aria-label="Collapse collection sidebar"
                  className="secondary-button sidebar-toggle-icon sidebar-desktop-toggle"
                  onClick={() => setIsSidebarCollapsed(true)}
                  type="button"
                >
                  <span aria-hidden="true">&#8249;</span>
                </button>
                <button
                  aria-label="Close collection sidebar"
                  className="secondary-button sidebar-toggle sidebar-close-button"
                  onClick={() => setIsSidebarMobileOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="sidebar-body">
              <form className="collection-form" onSubmit={handleCollectionSubmit}>
                <label className="field">
                  <span>New Collection</span>
                  <input
                    value={collectionName}
                    onChange={(event) => setCollectionName(event.target.value)}
                    placeholder="Board Games"
                    maxLength={100}
                  />
                </label>

                <button
                  className="primary-button"
                  disabled={createCollectionMutation.isPending}
                  type="submit"
                >
                  {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
                </button>

                {createCollectionMutation.error ? (
                  <p className="message error">{createCollectionMutation.error.message}</p>
                ) : null}
              </form>

              {collectionsQuery.isLoading ? <p className="message">Loading collections...</p> : null}
              {collectionsQuery.isError ? (
                <p className="message error">{collectionsQuery.error.message}</p>
              ) : null}

              <CollectionList
                collections={collectionsQuery.data ?? []}
                selectedCollectionId={selectedCollectionId}
                onSelect={(collectionId) => {
                  setIsSidebarMobileOpen(false);
                  navigateToCollection(collectionId);
                }}
              />
            </div>
          </>
        )}
      </aside>

      <section className="workspace-shell">
        <header className="panel top-bar">
          <div className="top-bar-main">
            <div className="top-bar-title-row">
              <button
                aria-expanded={isSidebarMobileOpen}
                aria-label="Open collection sidebar"
                className="secondary-button mobile-sidebar-toggle"
                onClick={() => setIsSidebarMobileOpen(true)}
                type="button"
              >
                Collections
              </button>

              <div>
                <p className="eyebrow subtle">
                  {selectedCollection ? selectedCollection.name : "No collection selected"}
                </p>
                <h2>
                  {section === "overview"
                    ? "Collection Overview"
                    : section === "items"
                      ? "Items Workspace"
                      : "Collection Settings"}
                </h2>
              </div>
            </div>

            <p className="panel-copy top-bar-copy">
              {selectedCollection
                ? section === "overview"
                  ? "See the collection at a glance before drilling into items or settings."
                  : section === "items"
                    ? "Create, filter, sort, and refine catalog entries in one focused workspace."
                    : "Manage custom fields, reusable tags, and locations for this collection."
                : "Create or choose a collection from the sidebar to begin."}
            </p>
          </div>

          {selectedCollection ? (
            <nav className="tab-nav">
              <NavLink className={({ isActive }) => `tab-link${isActive ? " active" : ""}`} to={`/collections/${selectedCollection.id}/overview`}>
                Overview
              </NavLink>
              <NavLink className={({ isActive }) => `tab-link${isActive ? " active" : ""}`} to={`/collections/${selectedCollection.id}/items`}>
                Items
              </NavLink>
              <NavLink className={({ isActive }) => `tab-link${isActive ? " active" : ""}`} to={`/collections/${selectedCollection.id}/settings`}>
                Settings
              </NavLink>
            </nav>
          ) : null}
        </header>

        <section className="content-shell">
          {!selectedCollection ? (
            <section className="panel">
              <div className="empty-state">
                <p>No collection selected.</p>
                <p>Create a collection from the sidebar to start shaping the catalog.</p>
              </div>
            </section>
          ) : section === "overview" ? (
            <OverviewPage
              attributeDefinitions={attributeDefinitionsQuery.data ?? []}
              items={itemsQuery.data?.items ?? []}
              locations={locationsQuery.data ?? []}
              selectedCollection={selectedCollection}
              tags={tagsQuery.data ?? []}
            />
          ) : section === "items" ? (
            <ItemsPage
              attributeDefinitions={attributeDefinitionsQuery.data ?? []}
              createItemError={createItemMutation.error?.message ?? null}
              isCreatePending={createItemMutation.isPending}
              isUpdatePending={updateItemMutation.isPending}
              itemAttributeFilters={itemAttributeFilters}
              itemAttributeValues={itemAttributeValues}
              itemDescription={itemDescription}
              itemDetail={itemDetailQuery.data ?? null}
              itemFilterLocationId={itemFilterLocationId}
              itemFilterTagIds={itemFilterTagIds}
              itemLocationId={itemLocationId}
              itemName={itemName}
              itemQuantity={itemQuantity}
              itemSearchText={itemSearchText}
              itemSortBy={itemSortBy}
              itemSortDirection={itemSortDirection}
              itemTagIds={itemTagIds}
              items={itemsQuery.data?.items ?? []}
              itemSaveCount={itemSaveCount}
              itemsError={itemsQuery.isError ? itemsQuery.error.message : null}
              isEditing={editingItemId !== null}
              isItemDetailLoading={itemDetailQuery.isLoading}
              isItemsLoading={itemsQuery.isLoading}
              itemPage={itemPage}
              itemTotalPages={itemsQuery.data?.totalPages ?? 1}
              itemTotalCount={itemsQuery.data?.totalCount ?? 0}
              locations={locationsQuery.data ?? []}
              savedViewName={savedViewName}
              savedViews={savedViews}
              selectedCollection={selectedCollection}
              selectedItemId={selectedItemId}
              tags={tagsQuery.data ?? []}
              updateItemError={updateItemMutation.error?.message ?? null}
              onApplySavedView={applySavedView}
              onAttributeFilterChange={handleAttributeFilterChange}
              onAttributeValueChange={handleAttributeValueChange}
              onClearItemFilters={clearItemFilters}
              onDeleteSavedView={deleteSavedView}
              onEditItem={beginEditingSelectedItem}
              onItemDescriptionChange={setItemDescription}
              onItemLocationChange={setItemLocationId}
              onItemNameChange={setItemName}
              onItemQuantityChange={setItemQuantity}
              onItemSearchTextChange={(v) => { setItemPage(1); setItemSearchText(v); }}
              onItemSortByChange={(v) => { setItemPage(1); setItemSortBy(v); }}
              onItemSortDirectionChange={(v) => { setItemPage(1); setItemSortDirection(v); }}
              onItemSubmit={handleItemSubmit}
              onItemFilterLocationChange={(v) => { setItemPage(1); setItemFilterLocationId(v); }}
              onResetItemForm={resetItemForm}
              onSaveCurrentView={() => saveCurrentView(itemFilters)}
              onSavedViewNameChange={setSavedViewName}
              onSelectItem={setSelectedItemId}
              onToggleFilterTag={toggleFilterTag}
              onToggleItemTag={toggleItemTag}
              isDeleteItemPending={deleteItemMutation.isPending}
              onDeleteItem={() =>
                deleteItemMutation.mutate({
                  collectionId: selectedCollectionId,
                  itemId: selectedItemId
                })
              }
              onItemPageChange={setItemPage}
              onUploadItemMedia={(file) =>
                uploadItemMediaMutation.mutate({
                  collectionId: selectedCollectionId,
                  itemId: selectedItemId,
                  file
                })
              }
              onDeleteItemMedia={(mediaAssetId) =>
                deleteItemMediaMutation.mutate({
                  collectionId: selectedCollectionId,
                  itemId: selectedItemId,
                  mediaAssetId
                })
              }
              onSetPrimaryItemMedia={(mediaAssetId) =>
                setPrimaryItemMediaMutation.mutate({
                  collectionId: selectedCollectionId,
                  itemId: selectedItemId,
                  mediaAssetId
                })
              }
              isUploadMediaPending={uploadItemMediaMutation.isPending}
            />
          ) : (
            <SettingsPage
              attributeDataType={attributeDataType}
              attributeDefinitions={attributeDefinitionsQuery.data ?? []}
              attributeIsFilterable={attributeIsFilterable}
              attributeIsRequired={attributeIsRequired}
              attributeName={attributeName}
              createAttributeDefinitionError={
                createAttributeDefinitionMutation.error?.message ?? null
              }
              createLocationError={createLocationMutation.error?.message ?? null}
              createTagError={createTagMutation.error?.message ?? null}
              isCreateAttributePending={createAttributeDefinitionMutation.isPending}
              isCreateLocationPending={createLocationMutation.isPending}
              isCreateTagPending={createTagMutation.isPending}
              items={itemsQuery.data?.items ?? []}
              locationDescription={locationDescription}
              locationName={locationName}
              locations={locationsQuery.data ?? []}
              selectedCollection={selectedCollection}
              tagName={tagName}
              tags={tagsQuery.data ?? []}
              onAttributeDataTypeChange={setAttributeDataType}
              onAttributeIsFilterableChange={setAttributeIsFilterable}
              onAttributeIsRequiredChange={setAttributeIsRequired}
              onAttributeNameChange={setAttributeName}
              onAttributeSubmit={handleAttributeSubmit}
              onLocationDescriptionChange={setLocationDescription}
              onLocationNameChange={setLocationName}
              onLocationSubmit={handleLocationSubmit}
              onTagNameChange={setTagName}
              onTagSubmit={handleTagSubmit}
              isDeleteCollectionPending={deleteCollectionMutation.isPending}
              onDeleteCollection={() => deleteCollectionMutation.mutate(selectedCollectionId)}
              isDeleteAttributeDefinitionPending={deleteAttributeDefinitionMutation.isPending}
              onDeleteAttributeDefinition={(id) =>
                deleteAttributeDefinitionMutation.mutate({
                  collectionId: selectedCollectionId,
                  attributeDefinitionId: id
                })
              }
              isDeleteTagPending={deleteTagMutation.isPending}
              onDeleteTag={(id) => deleteTagMutation.mutate(id)}
              isDeleteLocationPending={deleteLocationMutation.isPending}
              onDeleteLocation={(id) => deleteLocationMutation.mutate(id)}
            />
          )}
        </section>
      </section>
    </main>
  );
}
