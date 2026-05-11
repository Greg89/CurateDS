import { FormEvent, useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCollection,
  listCollections
} from "../api";
import { CatalogSection } from "./types";
import { readSidebarCollapsedState, sidebarStateStorageKey } from "./utils";
import { CollectionList } from "./components/CollectionList";
import { OverviewPage } from "./pages/OverviewPage";
import { ItemsPage } from "./pages/ItemsPage";
import { ReportsPage } from "./pages/ReportsPage";
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
                      : section === "reports"
                        ? "Reports"
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
                    : section === "reports"
                      ? "Breakdowns and activity across this collection."
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
              <NavLink className={({ isActive }) => `tab-link${isActive ? " active" : ""}`} to={`/collections/${selectedCollection.id}/reports`}>
                Reports
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
              selectedCollection={selectedCollection}
            />
          ) : section === "items" ? (
            <ItemsPage
              selectedCollection={selectedCollection}
            />
          ) : section === "reports" ? (
            <ReportsPage selectedCollection={selectedCollection} />
          ) : (
            <SettingsPage selectedCollection={selectedCollection} />
          )}
        </section>
      </section>
    </main>
  );
}
