import { FormEvent, ReactElement, useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCollection,
  listCollections,
  type Collection,
} from "../api";
import { CatalogSection } from "./types";
import { readSidebarCollapsedState, sidebarStateStorageKey } from "./utils";
import { CollectionList } from "./components/CollectionList";
import { OverviewPage } from "./pages/OverviewPage";
import { ItemsPage } from "./pages/ItemsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

function getSectionTitle(section: CatalogSection): string {
  switch (section) {
    case "overview":
      return "Collection Overview";
    case "items":
      return "Items Workspace";
    case "reports":
      return "Reports";
    case "settings":
      return "Collection Settings";
  }
}

function getSectionDescription(section: CatalogSection): string {
  switch (section) {
    case "overview":
      return "See the collection at a glance before drilling into items or settings.";
    case "items":
      return "Create, filter, sort, and refine catalog entries in one focused workspace.";
    case "reports":
      return "Breakdowns and activity across this collection.";
    case "settings":
      return "Manage custom fields, reusable tags, and locations for this collection.";
  }
}

function renderSectionPage(section: CatalogSection, selectedCollection: Collection): ReactElement {
  switch (section) {
    case "overview":
      return <OverviewPage selectedCollection={selectedCollection} />;
    case "items":
      return <ItemsPage selectedCollection={selectedCollection} />;
    case "reports":
      return <ReportsPage selectedCollection={selectedCollection} />;
    case "settings":
      return <SettingsPage selectedCollection={selectedCollection} />;
  }
}

function CatalogSidebar({
  collectionName,
  collections,
  collectionsErrorMessage,
  isCreatingCollection,
  isLoadingCollections,
  isSidebarCollapsed,
  selectedCollectionId,
  createCollectionErrorMessage,
  onCollectionNameChange,
  onCollectionSubmit,
  onSelectCollection,
  onCollapse,
  onExpand,
  onCloseMobile,
}: Readonly<{
  collectionName: string;
  collections: Collection[];
  collectionsErrorMessage?: string;
  isCreatingCollection: boolean;
  isLoadingCollections: boolean;
  isSidebarCollapsed: boolean;
  selectedCollectionId: string;
  createCollectionErrorMessage?: string;
  onCollectionNameChange: (name: string) => void;
  onCollectionSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectCollection: (collectionId: string) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onCloseMobile: () => void;
}>) {
  return (
    <aside className={`sidebar panel${isSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      {isSidebarCollapsed ? (
        <div className="sidebar-collapsed-rail">
          <button
            aria-expanded={false}
            aria-label="Expand collection sidebar"
            className="secondary-button sidebar-toggle-icon sidebar-desktop-toggle"
            onClick={onExpand}
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
                onClick={onCollapse}
                type="button"
              >
                <span aria-hidden="true">&#8249;</span>
              </button>
              <button
                aria-label="Close collection sidebar"
                className="secondary-button sidebar-toggle sidebar-close-button"
                onClick={onCloseMobile}
                type="button"
              >
                Close
              </button>
            </div>
          </div>

          <div className="sidebar-body">
            <form className="collection-form" onSubmit={onCollectionSubmit}>
              <label className="field">
                <span>New Collection</span>
                <input
                  value={collectionName}
                  onChange={(event) => onCollectionNameChange(event.target.value)}
                  placeholder="Board Games"
                  maxLength={100}
                />
              </label>

              <button
                className="primary-button"
                disabled={isCreatingCollection}
                type="submit"
              >
                {isCreatingCollection ? "Creating..." : "Create Collection"}
              </button>

              {createCollectionErrorMessage ? (
                <p className="message error">{createCollectionErrorMessage}</p>
              ) : null}
            </form>

            {isLoadingCollections ? <p className="message">Loading collections...</p> : null}
            {collectionsErrorMessage ? (
              <p className="message error">{collectionsErrorMessage}</p>
            ) : null}

            <CollectionList
              collections={collections}
              selectedCollectionId={selectedCollectionId}
              onSelect={onSelectCollection}
            />
          </div>
        </>
      )}
    </aside>
  );
}

function CatalogHeader({
  section,
  selectedCollection,
  isSidebarMobileOpen,
  onOpenMobileSidebar,
}: Readonly<{
  section: CatalogSection;
  selectedCollection: Collection | null;
  isSidebarMobileOpen: boolean;
  onOpenMobileSidebar: () => void;
}>) {
  return (
    <header className="panel top-bar">
      <div className="top-bar-main">
        <div className="top-bar-title-row">
          <button
            aria-expanded={isSidebarMobileOpen}
            aria-label="Open collection sidebar"
            className="secondary-button mobile-sidebar-toggle"
            onClick={onOpenMobileSidebar}
            type="button"
          >
            Collections
          </button>

          <div>
            <p className="eyebrow subtle">
              {selectedCollection ? selectedCollection.name : "No collection selected"}
            </p>
            <h2>{getSectionTitle(section)}</h2>
          </div>
        </div>

        <p className="panel-copy top-bar-copy">
          {selectedCollection
            ? getSectionDescription(section)
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
          <NavLink className={({ isActive }) => `tab-link${isActive ? " active" : ""}`} to={`/collections/${selectedCollection.id}/reports`}>
            Reports
          </NavLink>
          <NavLink className={({ isActive }) => `tab-link${isActive ? " active" : ""}`} to={`/collections/${selectedCollection.id}/settings`}>
            Settings
          </NavLink>
        </nav>
      ) : null}
    </header>
  );
}

function CatalogContent({
  section,
  selectedCollection,
}: Readonly<{
  section: CatalogSection;
  selectedCollection: Collection | null;
}>) {
  if (!selectedCollection) {
    return (
      <section className="panel">
        <div className="empty-state">
          <p>No collection selected.</p>
          <p>Create a collection from the sidebar to start shaping the catalog.</p>
        </div>
      </section>
    );
  }

  return renderSectionPage(section, selectedCollection);
}

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsedState);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    queryFn: listCollections
  });

  const selectedCollection =
    collectionsQuery.data?.find((collection) => collection.id === selectedCollectionId) ?? null;

  const createCollectionMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: async (collection) => {
      setCollectionName("");
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigateToCollection(collection.id, "overview");
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

      <CatalogSidebar
        collectionName={collectionName}
        collections={collectionsQuery.data ?? []}
        collectionsErrorMessage={collectionsQuery.isError ? collectionsQuery.error.message : undefined}
        createCollectionErrorMessage={createCollectionMutation.error?.message}
        isCreatingCollection={createCollectionMutation.isPending}
        isLoadingCollections={collectionsQuery.isLoading}
        isSidebarCollapsed={isSidebarCollapsed}
        selectedCollectionId={selectedCollectionId}
        onCollectionNameChange={setCollectionName}
        onCollectionSubmit={handleCollectionSubmit}
        onSelectCollection={(collectionId) => {
          setIsSidebarMobileOpen(false);
          navigateToCollection(collectionId);
        }}
        onCollapse={() => setIsSidebarCollapsed(true)}
        onExpand={() => setIsSidebarCollapsed(false)}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
      />

      <section className="workspace-shell">
        <CatalogHeader
          section={section}
          selectedCollection={selectedCollection}
          isSidebarMobileOpen={isSidebarMobileOpen}
          onOpenMobileSidebar={() => setIsSidebarMobileOpen(true)}
        />

        <section className="content-shell">
          <CatalogContent section={section} selectedCollection={selectedCollection} />
        </section>
      </section>
    </main>
  );
}
