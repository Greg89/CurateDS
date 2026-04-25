import { FormEvent, useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appConfig
} from "../config";
import {
  AttributeDataType,
  AttributeDefinition,
  Collection,
  createAttributeDefinition,
  createCollection,
  createItem,
  createLocation,
  createTag,
  getItemDetail,
  ItemDetail,
  ItemFilters,
  ItemSummary,
  listAttributeDefinitions,
  listCollections,
  listItems,
  listLocations,
  listTags,
  Location,
  Tag,
  updateItem
} from "../api";

const attributeDataTypes: AttributeDataType[] = [
  "Text",
  "Number",
  "Decimal",
  "Boolean",
  "Date",
  "SingleSelect"
];

type CatalogSection = "overview" | "items" | "settings";

interface SavedItemView {
  id: string;
  name: string;
  filters: ItemFilters;
}

const sidebarStateStorageKey = "curateds:sidebar-collapsed";

export function CatalogApp({
  section
}: Readonly<{
  section: CatalogSection;
}>) {
  const defaultSortBy: ItemFilters["sortBy"] = "updatedUtc";
  const defaultSortDirection: ItemFilters["sortDirection"] = "desc";
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
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemLocationId, setItemLocationId] = useState("");
  const [itemTagIds, setItemTagIds] = useState<string[]>([]);
  const [itemAttributeValues, setItemAttributeValues] = useState<
    Record<string, string>
  >({});
  const [selectedItemId, setSelectedItemId] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemSearchText, setItemSearchText] = useState("");
  const [itemFilterLocationId, setItemFilterLocationId] = useState("");
  const [itemFilterTagIds, setItemFilterTagIds] = useState<string[]>([]);
  const [itemAttributeFilters, setItemAttributeFilters] = useState<
    Record<string, string>
  >({});
  const [itemSortBy, setItemSortBy] =
    useState<ItemFilters["sortBy"]>(defaultSortBy);
  const [itemSortDirection, setItemSortDirection] =
    useState<ItemFilters["sortDirection"]>(defaultSortDirection);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViews, setSavedViews] = useState<SavedItemView[]>([]);
  const [savedViewsCollectionId, setSavedViewsCollectionId] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsedState);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const normalizedItemFilterTagIds = normalizeTagIds(itemFilterTagIds);

  const itemFilters: ItemFilters = {
    searchText: itemSearchText,
    locationId: itemFilterLocationId,
    tagIds: normalizedItemFilterTagIds,
    attributeFilters: itemAttributeFilters,
    sortBy: itemSortBy,
    sortDirection: itemSortDirection
  };

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
      itemSearchText,
      itemFilterLocationId,
      itemSortBy,
      itemSortDirection,
      JSON.stringify(itemAttributeFilters),
      ...normalizedItemFilterTagIds
    ],
    queryFn: () => listItems(selectedCollectionId, itemFilters),
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
      await queryClient.invalidateQueries({ queryKey: ["items", selectedCollectionId] });
      await queryClient.invalidateQueries({
        queryKey: ["item-detail", selectedCollectionId, item.id]
      });
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

  function handleAttributeValueChange(attributeDefinitionId: string, value: string) {
    setItemAttributeValues((currentValues) => ({
      ...currentValues,
      [attributeDefinitionId]: value
    }));
  }

  function populateItemForm(item: ItemDetail) {
    setItemName(item.name);
    setItemDescription(item.description ?? "");
    setItemQuantity(item.quantity.toString());
    setItemLocationId(item.locationId ?? "");
    setItemTagIds(item.tags.map((tag) => tag.id));
    setItemAttributeValues(
      Object.fromEntries(
        item.attributeValues.map((attributeValue) => [
          attributeValue.attributeDefinitionId,
          attributeValue.value.toLowerCase() === "true" ||
          attributeValue.value.toLowerCase() === "false"
            ? attributeValue.value.toLowerCase()
            : attributeValue.value
        ])
      )
    );
  }

  function resetItemForm() {
    setItemName("");
    setItemDescription("");
    setItemQuantity("1");
    setItemLocationId("");
    setItemTagIds([]);
    setItemAttributeValues({});
    setEditingItemId(null);
  }

  function toggleItemTag(tagId: string) {
    setItemTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId]
    );
  }

  function beginEditingSelectedItem() {
    if (!itemDetailQuery.data) {
      return;
    }

    populateItemForm(itemDetailQuery.data);
    setEditingItemId(itemDetailQuery.data.id);
    navigateToCollection(selectedCollectionId, "items");
  }

  function clearItemFilters() {
    setItemSearchText("");
    setItemFilterLocationId("");
    setItemFilterTagIds([]);
    setItemAttributeFilters({});
    setItemSortBy(defaultSortBy);
    setItemSortDirection(defaultSortDirection);
  }

  function toggleFilterTag(tagId: string) {
    setItemFilterTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId]
    );
  }

  function handleAttributeFilterChange(attributeKey: string, value: string) {
    setItemAttributeFilters((currentFilters) => ({
      ...currentFilters,
      [attributeKey]: value
    }));
  }

  function saveCurrentView() {
    const normalizedName = savedViewName.trim();

    if (!selectedCollectionId || normalizedName.length === 0) {
      return;
    }

    const nextView: SavedItemView = {
      id: crypto.randomUUID(),
      name: normalizedName,
      filters: {
        searchText: itemSearchText,
        locationId: itemFilterLocationId,
        tagIds: itemFilterTagIds,
        attributeFilters: itemAttributeFilters,
        sortBy: itemSortBy,
        sortDirection: itemSortDirection
      }
    };

    setSavedViews((currentViews) => [...currentViews, nextView]);
    setSavedViewName("");
  }

  function applySavedView(view: SavedItemView) {
    setItemSearchText(view.filters.searchText ?? "");
    setItemFilterLocationId(view.filters.locationId ?? "");
    setItemFilterTagIds(view.filters.tagIds ?? []);
    setItemAttributeFilters(view.filters.attributeFilters ?? {});
    setItemSortBy(view.filters.sortBy ?? defaultSortBy);
    setItemSortDirection(view.filters.sortDirection ?? defaultSortDirection);
  }

  function deleteSavedView(viewId: string) {
    setSavedViews((currentViews) =>
      currentViews.filter((view) => view.id !== viewId)
    );
  }

  useEffect(() => {
    if (!itemsQuery.data) {
      return;
    }

    if (itemsQuery.data.length === 0) {
      if (selectedItemId) {
        setSelectedItemId("");
      }

      return;
    }

    const hasSelectedItem = itemsQuery.data.some((item) => item.id === selectedItemId);

    if (!hasSelectedItem) {
      setSelectedItemId(itemsQuery.data[0].id);
    }
  }, [itemsQuery.data, selectedItemId]);

  useEffect(() => {
    resetItemForm();
  }, [selectedCollectionId]);

  useEffect(() => {
    clearItemFilters();
  }, [selectedCollectionId]);

  useEffect(() => {
    if (!selectedCollectionId) {
      setSavedViews([]);
      setSavedViewName("");
      setSavedViewsCollectionId("");
      return;
    }

    setSavedViews(readSavedViews(selectedCollectionId));
    setSavedViewName("");
    setSavedViewsCollectionId(selectedCollectionId);
  }, [selectedCollectionId]);

  useEffect(() => {
    if (!selectedCollectionId || savedViewsCollectionId !== selectedCollectionId) {
      return;
    }

    window.localStorage.setItem(
      getSavedViewsStorageKey(selectedCollectionId),
      JSON.stringify(savedViews)
    );
  }, [savedViews, savedViewsCollectionId, selectedCollectionId]);

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

  const savedViewsSummary = savedViews.length > 0
    ? savedViews.map((view) => view.name).join(", ")
    : "No saved views yet.";

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
              <span aria-hidden="true">&gt;</span>
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
                  <span aria-hidden="true">&lt;</span>
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

          <div className="top-bar-meta">
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

            <p className="meta top-bar-api">API: {appConfig.apiBaseUrl}</p>
          </div>
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
              items={itemsQuery.data ?? []}
              itemDetail={itemDetailQuery.data ?? null}
              locations={locationsQuery.data ?? []}
              savedViewsSummary={savedViewsSummary}
              selectedCollection={selectedCollection}
              tags={tagsQuery.data ?? []}
              onEditItem={beginEditingSelectedItem}
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
              items={itemsQuery.data ?? []}
              itemsError={itemsQuery.isError ? itemsQuery.error.message : null}
              isEditing={editingItemId !== null}
              isItemDetailLoading={itemDetailQuery.isLoading}
              isItemsLoading={itemsQuery.isLoading}
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
              onItemSearchTextChange={setItemSearchText}
              onItemSortByChange={setItemSortBy}
              onItemSortDirectionChange={setItemSortDirection}
              onItemSubmit={handleItemSubmit}
              onItemFilterLocationChange={setItemFilterLocationId}
              onResetItemForm={resetItemForm}
              onSaveCurrentView={saveCurrentView}
              onSavedViewNameChange={setSavedViewName}
              onSelectItem={setSelectedItemId}
              onToggleFilterTag={toggleFilterTag}
              onToggleItemTag={toggleItemTag}
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
            />
          )}
        </section>
      </section>
    </main>
  );
}

function OverviewPage({
  attributeDefinitions,
  items,
  itemDetail,
  locations,
  savedViewsSummary,
  selectedCollection,
  tags,
  onEditItem
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  items: ItemSummary[];
  itemDetail: ItemDetail | null;
  locations: Location[];
  savedViewsSummary: string;
  selectedCollection: Collection;
  tags: Tag[];
  onEditItem: () => void;
}>) {
  return (
    <section className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <h3>{selectedCollection.name}</h3>
          <p>Overview of the current collection shape, organization, and activity.</p>
        </div>

        <div className="metric-grid">
          <MetricCard label="Items" value={items.length.toString()} />
          <MetricCard
            label="Attributes"
            value={attributeDefinitions.length.toString()}
          />
          <MetricCard label="Tags" value={tags.length.toString()} />
          <MetricCard label="Locations" value={locations.length.toString()} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Saved Views</h3>
          <p>Quick access combinations for item browsing in this collection.</p>
        </div>

        <div className="empty-state compact">
          <p>{savedViewsSummary}</p>
          <p>Saved views live in the browser for now so you can refine workflows safely.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Collection Shape</h3>
          <p>Custom fields that make this collection hobby-specific without changing the core model.</p>
        </div>

        <AttributeDefinitionList
          attributeDefinitions={attributeDefinitions}
          selectedCollectionName={selectedCollection.name}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Organization Snapshot</h3>
          <p>Reusable labels and storage zones available to items in this collection.</p>
        </div>

        <OrganizationSummary locations={locations} tags={tags} />
      </section>

      <section className="panel panel-wide">
        <div className="panel-header">
          <h3>Selected Item</h3>
          <p>Keep the current item detail close at hand while navigating the collection.</p>
        </div>

        <ItemDetailCard
          isEditing={false}
          item={itemDetail}
          onEdit={onEditItem}
          selectedCollectionName={selectedCollection.name}
        />
      </section>
    </section>
  );
}

function ItemsPage({
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

function SettingsPage({
  attributeDataType,
  attributeDefinitions,
  attributeIsFilterable,
  attributeIsRequired,
  attributeName,
  createAttributeDefinitionError,
  createLocationError,
  createTagError,
  isCreateAttributePending,
  isCreateLocationPending,
  isCreateTagPending,
  locationDescription,
  locationName,
  locations,
  selectedCollection,
  tagName,
  tags,
  onAttributeDataTypeChange,
  onAttributeIsFilterableChange,
  onAttributeIsRequiredChange,
  onAttributeNameChange,
  onAttributeSubmit,
  onLocationDescriptionChange,
  onLocationNameChange,
  onLocationSubmit,
  onTagNameChange,
  onTagSubmit
}: Readonly<{
  attributeDataType: AttributeDataType;
  attributeDefinitions: AttributeDefinition[];
  attributeIsFilterable: boolean;
  attributeIsRequired: boolean;
  attributeName: string;
  createAttributeDefinitionError: string | null;
  createLocationError: string | null;
  createTagError: string | null;
  isCreateAttributePending: boolean;
  isCreateLocationPending: boolean;
  isCreateTagPending: boolean;
  locationDescription: string;
  locationName: string;
  locations: Location[];
  selectedCollection: Collection;
  tagName: string;
  tags: Tag[];
  onAttributeDataTypeChange: (value: AttributeDataType) => void;
  onAttributeIsFilterableChange: (value: boolean) => void;
  onAttributeIsRequiredChange: (value: boolean) => void;
  onAttributeNameChange: (value: string) => void;
  onAttributeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLocationDescriptionChange: (value: string) => void;
  onLocationNameChange: (value: string) => void;
  onLocationSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTagNameChange: (value: string) => void;
  onTagSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <section className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <h3>Attribute Definitions</h3>
          <p>Define reusable item fields for {selectedCollection.name}.</p>
        </div>

        <form className="collection-form" onSubmit={onAttributeSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              value={attributeName}
              onChange={(event) => onAttributeNameChange(event.target.value)}
              placeholder="Release Year"
              maxLength={60}
            />
          </label>

          <label className="field">
            <span>Data Type</span>
            <select
              value={attributeDataType}
              onChange={(event) =>
                onAttributeDataTypeChange(event.target.value as AttributeDataType)
              }
            >
              {attributeDataTypes.map((dataType) => (
                <option key={dataType} value={dataType}>
                  {dataType}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-row">
            <input
              checked={attributeIsRequired}
              onChange={(event) => onAttributeIsRequiredChange(event.target.checked)}
              type="checkbox"
            />
            <span>Required for future items</span>
          </label>

          <label className="checkbox-row">
            <input
              checked={attributeIsFilterable}
              onChange={(event) => onAttributeIsFilterableChange(event.target.checked)}
              type="checkbox"
            />
            <span>Filterable in list views</span>
          </label>

          <button className="primary-button" disabled={isCreateAttributePending} type="submit">
            {isCreateAttributePending ? "Saving..." : "Add Attribute"}
          </button>

          {createAttributeDefinitionError ? (
            <p className="message error">{createAttributeDefinitionError}</p>
          ) : null}
        </form>

        <AttributeDefinitionList
          attributeDefinitions={attributeDefinitions}
          selectedCollectionName={selectedCollection.name}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Organization</h3>
          <p>Create reusable tags and storage locations for your items.</p>
        </div>

        <form className="collection-form" onSubmit={onTagSubmit}>
          <label className="field">
            <span>Tag Name</span>
            <input
              value={tagName}
              onChange={(event) => onTagNameChange(event.target.value)}
              placeholder="Wishlist"
              maxLength={50}
            />
          </label>

          <button className="primary-button" disabled={isCreateTagPending} type="submit">
            {isCreateTagPending ? "Saving..." : "Add Tag"}
          </button>

          {createTagError ? <p className="message error">{createTagError}</p> : null}
        </form>

        <form className="collection-form section-gap" onSubmit={onLocationSubmit}>
          <label className="field">
            <span>Location Name</span>
            <input
              value={locationName}
              onChange={(event) => onLocationNameChange(event.target.value)}
              placeholder="Office Shelf"
              maxLength={80}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <input
              value={locationDescription}
              onChange={(event) => onLocationDescriptionChange(event.target.value)}
              placeholder="Upper left bookcase"
              maxLength={240}
            />
          </label>

          <button className="primary-button" disabled={isCreateLocationPending} type="submit">
            {isCreateLocationPending ? "Saving..." : "Add Location"}
          </button>

          {createLocationError ? <p className="message error">{createLocationError}</p> : null}
        </form>

        <OrganizationSummary locations={locations} tags={tags} />
      </section>
    </section>
  );
}

function CollectionList({
  collections,
  selectedCollectionId,
  onSelect
}: Readonly<{
  collections: Collection[];
  selectedCollectionId: string;
  onSelect: (collectionId: string) => void;
}>) {
  if (collections.length === 0) {
    return (
      <div className="empty-state">
        <p>No collections yet.</p>
        <p>Create one to kick off the catalog.</p>
      </div>
    );
  }

  return (
    <ul className="collection-list">
      {collections.map((collection) => (
        <li
          className={`collection-card${collection.id === selectedCollectionId ? " selected" : ""}`}
          key={collection.id}
        >
          <button className="collection-select" onClick={() => onSelect(collection.id)} type="button">
            <h3>{collection.name}</h3>
            <p>
              Created{" "}
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short"
              }).format(new Date(collection.createdUtc))}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MetricCard({
  label,
  value
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <article className="metric-card">
      <p className="eyebrow subtle">{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

function AttributeDefinitionList({
  attributeDefinitions,
  selectedCollectionName
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  selectedCollectionName: string | null;
}>) {
  if (!selectedCollectionName) {
    return (
      <div className="empty-state">
        <p>No collection selected.</p>
        <p>Pick a collection to view and create its custom fields.</p>
      </div>
    );
  }

  if (attributeDefinitions.length === 0) {
    return (
      <div className="empty-state">
        <p>No attribute definitions yet for {selectedCollectionName}.</p>
        <p>Add one to start shaping item metadata.</p>
      </div>
    );
  }

  return (
    <ul className="attribute-list">
      {attributeDefinitions.map((attributeDefinition) => (
        <li className="attribute-card" key={attributeDefinition.id}>
          <div className="attribute-card-header">
            <h3>{attributeDefinition.name}</h3>
            <span className="attribute-pill">{attributeDefinition.dataType}</span>
          </div>
          <p className="attribute-meta">
            Key: <code>{attributeDefinition.key}</code>
          </p>
          <p className="attribute-meta">
            Required: {attributeDefinition.isRequired ? "Yes" : "No"} | Filterable:{" "}
            {attributeDefinition.isFilterable ? "Yes" : "No"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function OrganizationSummary({
  locations,
  tags
}: Readonly<{
  locations: Location[];
  tags: Tag[];
}>) {
  return (
    <div className="organization-grid">
      <div className="empty-state compact">
        <p>{tags.length} tag{tags.length === 1 ? "" : "s"} ready.</p>
        <p>{tags.length > 0 ? tags.map((tag) => tag.name).join(", ") : "Create your first reusable tag."}</p>
      </div>
      <div className="empty-state compact">
        <p>{locations.length} location{locations.length === 1 ? "" : "s"} ready.</p>
        <p>
          {locations.length > 0
            ? locations.map((location) => location.name).join(", ")
            : "Add a storage location for item organization."}
        </p>
      </div>
    </div>
  );
}

function TagSelector({
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
      <div className="tag-picker">
        {tags.map((tag) => (
          <label className="tag-option" key={tag.id}>
            <input
              checked={selectedTagIds.includes(tag.id)}
              disabled={disabled}
              onChange={() => onToggle(tag.id)}
              type="checkbox"
            />
            <span>{tag.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function DynamicAttributeFields({
  attributeDefinitions,
  disabled,
  values,
  onChange
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  disabled: boolean;
  values: Record<string, string>;
  onChange: (attributeDefinitionId: string, value: string) => void;
}>) {
  if (attributeDefinitions.length === 0) {
    return (
      <div className="empty-state compact">
        <p>No custom attributes yet.</p>
        <p>Add one in settings and it will appear here for item entry.</p>
      </div>
    );
  }

  return (
    <div className="dynamic-field-grid">
      {attributeDefinitions.map((attributeDefinition) => (
        <label className="field" key={attributeDefinition.id}>
          <span>
            {attributeDefinition.name}
            {attributeDefinition.isRequired ? " *" : ""}
          </span>
          {renderAttributeInput(attributeDefinition, values, disabled, onChange)}
        </label>
      ))}
    </div>
  );
}

function ItemFiltersPanel({
  attributeDefinitions,
  attributeFilters,
  disabled,
  locationId,
  locations,
  savedViewName,
  savedViews,
  searchText,
  selectedTagIds,
  sortBy,
  sortDirection,
  tags,
  onApplySavedView,
  onAttributeFilterChange,
  onClear,
  onDeleteSavedView,
  onLocationChange,
  onSavedViewNameChange,
  onSaveView,
  onSearchTextChange,
  onSortByChange,
  onSortDirectionChange,
  onToggleTag
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  attributeFilters: Record<string, string>;
  disabled: boolean;
  locationId: string;
  locations: Location[];
  savedViewName: string;
  savedViews: SavedItemView[];
  searchText: string;
  selectedTagIds: string[];
  sortBy: ItemFilters["sortBy"];
  sortDirection: ItemFilters["sortDirection"];
  tags: Tag[];
  onApplySavedView: (view: SavedItemView) => void;
  onAttributeFilterChange: (attributeKey: string, value: string) => void;
  onClear: () => void;
  onDeleteSavedView: (viewId: string) => void;
  onLocationChange: (locationId: string) => void;
  onSavedViewNameChange: (name: string) => void;
  onSaveView: () => void;
  onSearchTextChange: (searchText: string) => void;
  onSortByChange: (sortBy: ItemFilters["sortBy"]) => void;
  onSortDirectionChange: (sortDirection: ItemFilters["sortDirection"]) => void;
  onToggleTag: (tagId: string) => void;
}>) {
  const hasActiveFilters =
    searchText.trim().length > 0 ||
    locationId.length > 0 ||
    selectedTagIds.length > 0 ||
    Object.values(attributeFilters).some((value) => value.trim().length > 0) ||
    sortBy !== "updatedUtc" ||
    sortDirection !== "desc";

  return (
    <section className="filter-panel">
      <div className="panel-header">
        <h3>Item Filters</h3>
        <p>Search across item details, locations, tags, and saved attribute values.</p>
      </div>

      <div className="filter-grid">
        <label className="field">
          <span>Search</span>
          <input
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            disabled={disabled}
            placeholder="Search titles, notes, tags, or custom values"
          />
        </label>

        <label className="field">
          <span>Location</span>
          <select
            value={locationId}
            onChange={(event) => onLocationChange(event.target.value)}
            disabled={disabled}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sort By</span>
          <select
            value={sortBy}
            onChange={(event) =>
              onSortByChange(event.target.value as ItemFilters["sortBy"])
            }
            disabled={disabled}
          >
            <option value="updatedUtc">Recently updated</option>
            <option value="createdUtc">Recently created</option>
            <option value="name">Name</option>
            <option value="quantity">Quantity</option>
          </select>
        </label>

        <label className="field">
          <span>Direction</span>
          <select
            value={sortDirection}
            onChange={(event) =>
              onSortDirectionChange(
                event.target.value as ItemFilters["sortDirection"]
              )
            }
            disabled={disabled}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
      </div>

      {attributeDefinitions.length > 0 ? (
        <div className="dynamic-field-grid">
          {attributeDefinitions.map((attributeDefinition) => (
            <label className="field" key={attributeDefinition.id}>
              <span>{attributeDefinition.name}</span>
              {renderAttributeInput(
                attributeDefinition,
                attributeFilters,
                disabled,
                onAttributeFilterChange,
                attributeDefinition.key
              )}
            </label>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <p>No custom attribute filters yet.</p>
          <p>Mark attributes as filterable and they will appear here.</p>
        </div>
      )}

      {tags.length === 0 ? (
        <div className="empty-state compact">
          <p>No tags available for filtering yet.</p>
          <p>Create a tag in settings and it will appear here.</p>
        </div>
      ) : (
        <div className="field">
          <span>Tags</span>
          <div className="tag-picker">
            {tags.map((tag) => (
              <label className="tag-option" key={tag.id}>
                <input
                  checked={selectedTagIds.includes(tag.id)}
                  disabled={disabled}
                  onChange={() => onToggleTag(tag.id)}
                  type="checkbox"
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="filter-actions">
        <p className="message">
          {hasActiveFilters ? "Showing the narrowed item list." : "No filters applied yet."}
        </p>
        <button
          className="secondary-button"
          disabled={disabled || !hasActiveFilters}
          onClick={onClear}
          type="button"
        >
          Clear Filters
        </button>
      </div>

      <div className="saved-view-panel">
        <div className="panel-header">
          <h3>Saved Views</h3>
          <p>Keep favorite filter and sort combinations ready for later.</p>
        </div>

        <div className="saved-view-create">
          <label className="field">
            <span>View Name</span>
            <input
              value={savedViewName}
              onChange={(event) => onSavedViewNameChange(event.target.value)}
              disabled={disabled}
              placeholder="Wishlist on shelf"
              maxLength={60}
            />
          </label>

          <button
            className="secondary-button"
            disabled={disabled || savedViewName.trim().length === 0}
            onClick={onSaveView}
            type="button"
          >
            Save View
          </button>
        </div>

        {savedViews.length === 0 ? (
          <div className="empty-state compact">
            <p>No saved views yet.</p>
            <p>Save a filter set once and reuse it whenever this collection comes back up.</p>
          </div>
        ) : (
          <ul className="saved-view-list">
            {savedViews.map((view) => (
              <li className="saved-view-card" key={view.id}>
                <div>
                  <h3>{view.name}</h3>
                  <p>{describeSavedView(view.filters)}</p>
                </div>
                <div className="saved-view-actions">
                  <button className="secondary-button" onClick={() => onApplySavedView(view)} type="button">
                    Apply
                  </button>
                  <button className="secondary-button" onClick={() => onDeleteSavedView(view.id)} type="button">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function renderAttributeInput(
  attributeDefinition: AttributeDefinition,
  values: Record<string, string>,
  disabled: boolean,
  onChange: (attributeDefinitionId: string, value: string) => void,
  valueKey?: string
) {
  const resolvedValueKey = valueKey ?? attributeDefinition.id;
  const value = values[resolvedValueKey] ?? "";

  switch (attributeDefinition.dataType) {
    case "Boolean":
      return (
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
        >
          <option value="">Select one</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    case "Date":
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
          type="date"
        />
      );
    case "Number":
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
          type="number"
          step={1}
        />
      );
    case "Decimal":
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
          type="number"
          step="0.01"
        />
      );
    default:
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
          placeholder={`Enter ${attributeDefinition.name.toLowerCase()}`}
          type="text"
        />
      );
  }
}

function ItemList({
  items,
  selectedCollectionName,
  selectedItemId,
  onSelect
}: Readonly<{
  items: ItemSummary[];
  selectedCollectionName: string | null;
  selectedItemId: string;
  onSelect: (itemId: string) => void;
}>) {
  if (!selectedCollectionName) {
    return (
      <div className="empty-state compact">
        <p>No collection selected.</p>
        <p>Pick a collection to see its item list.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state compact">
        <p>No items yet for {selectedCollectionName}.</p>
        <p>Create the first entry to validate the end-to-end slice.</p>
      </div>
    );
  }

  return (
    <ul className="item-list">
      {items.map((item) => (
        <li
          className={`item-card${item.id === selectedItemId ? " selected" : ""}`}
          key={item.id}
        >
          <button className="item-select" onClick={() => onSelect(item.id)} type="button">
            <div className="item-card-header">
              <h3>{item.name}</h3>
              <span className="attribute-pill">Qty {item.quantity}</span>
            </div>
            <p>{item.description ?? "No description yet."}</p>
            <p>
              {item.locationName ? `Location: ${item.locationName}` : "No location assigned"}
            </p>
            <p>{item.tags.length > 0 ? `Tags: ${item.tags.join(", ")}` : "No tags assigned"}</p>
            <p>
              {item.attributeValueCount} custom value
              {item.attributeValueCount === 1 ? "" : "s"}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ItemDetailCard({
  item,
  isEditing,
  onEdit,
  selectedCollectionName
}: Readonly<{
  item: ItemDetail | null;
  isEditing: boolean;
  onEdit: () => void;
  selectedCollectionName: string | null;
}>) {
  if (!selectedCollectionName) {
    return null;
  }

  if (!item) {
    return (
      <div className="empty-state compact">
        <p>No item selected.</p>
        <p>Choose an item to review its saved detail view.</p>
      </div>
    );
  }

  return (
    <section className="item-detail-card">
      <div className="item-card-header">
        <div>
          <p className="eyebrow subtle">Item Detail</p>
          <h3>{item.name}</h3>
        </div>
        <div className="detail-actions">
          <span className="attribute-pill">Qty {item.quantity}</span>
          <button className="secondary-button" onClick={onEdit} type="button">
            {isEditing ? "Editing" : "Edit Item"}
          </button>
        </div>
      </div>

      <p className="item-detail-copy">
        {item.description ?? "No description has been saved for this item yet."}
      </p>

      <div className="detail-meta-grid">
        <p>{item.locationName ? `Location: ${item.locationName}` : "Location: None"}</p>
        <p>{item.tags.length > 0 ? `Tags: ${item.tags.map((tag) => tag.name).join(", ")}` : "Tags: None"}</p>
        <p>
          Created{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(item.createdUtc))}
        </p>
        <p>
          Updated{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(item.updatedUtc))}
        </p>
      </div>

      {item.attributeValues.length === 0 ? (
        <div className="empty-state compact">
          <p>No custom values were saved.</p>
          <p>This item only uses the shared core fields so far.</p>
        </div>
      ) : (
        <ul className="detail-value-list">
          {item.attributeValues.map((attributeValue) => (
            <li className="detail-value-card" key={attributeValue.attributeDefinitionId}>
              <div className="attribute-card-header">
                <h3>{attributeValue.attributeName}</h3>
                <span className="attribute-pill">{attributeValue.dataType}</span>
              </div>
              <p className="attribute-meta">
                Key: <code>{attributeValue.attributeKey}</code>
              </p>
              <p className="item-value">{attributeValue.value}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function getSavedViewsStorageKey(collectionId: string) {
  return `curateds:item-views:${collectionId}`;
}

function readSavedViews(collectionId: string): SavedItemView[] {
  const savedViewsJson = window.localStorage.getItem(
    getSavedViewsStorageKey(collectionId)
  );

  if (!savedViewsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(savedViewsJson) as SavedItemView[] | null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function describeSavedView(filters: ItemFilters) {
  const segments: string[] = [];

  if (filters.searchText?.trim()) {
    segments.push(`Search: ${filters.searchText.trim()}`);
  }

  if (filters.locationId) {
    segments.push("Location scoped");
  }

  if ((filters.tagIds?.length ?? 0) > 0) {
    segments.push(`${filters.tagIds!.length} tag filter${filters.tagIds!.length === 1 ? "" : "s"}`);
  }

  const attributeFilterCount = Object.values(filters.attributeFilters ?? {}).filter(
    (value) => value.trim().length > 0
  ).length;

  if (attributeFilterCount > 0) {
    segments.push(`${attributeFilterCount} attribute filter${attributeFilterCount === 1 ? "" : "s"}`);
  }

  segments.push(
    `Sort: ${describeSort(filters.sortBy ?? "updatedUtc", filters.sortDirection ?? "desc")}`
  );

  return segments.join(" | ");
}

function describeSort(
  sortBy: NonNullable<ItemFilters["sortBy"]>,
  sortDirection: NonNullable<ItemFilters["sortDirection"]>
) {
  const sortLabel =
    sortBy === "createdUtc"
      ? "created date"
      : sortBy === "name"
        ? "name"
        : sortBy === "quantity"
          ? "quantity"
          : "updated date";

  return `${sortLabel} ${sortDirection === "asc" ? "ascending" : "descending"}`;
}

function normalizeTagIds(tagIds: readonly string[]) {
  return [...new Set(tagIds.map((tagId) => tagId.trim()).filter((tagId) => tagId.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

function readSidebarCollapsedState() {
  const storedValue = window.localStorage.getItem(sidebarStateStorageKey);

  if (!storedValue) {
    return false;
  }

  try {
    return JSON.parse(storedValue) === true;
  } catch {
    return false;
  }
}
