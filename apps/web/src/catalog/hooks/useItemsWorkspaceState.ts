import { useEffect, useState } from "react";
import { ItemFilters, countActiveItemFilters } from "../../api";

export function useItemsWorkspaceState({
  itemFilters,
  itemSaveCount
}: Readonly<{
  itemFilters: Readonly<ItemFilters>;
  itemSaveCount: number;
}>) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const anyDrawerOpen = isDetailDrawerOpen || isFormDrawerOpen;
  const activeFilterCount = countActiveItemFilters(itemFilters);

  useEffect(() => {
    if (itemSaveCount > 0) {
      setIsFormDrawerOpen(false);
    }
  }, [itemSaveCount]);

  useEffect(() => {
    if (!anyDrawerOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDetailDrawerOpen(false);
        setIsFormDrawerOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [anyDrawerOpen]);

  function toggleFilters() {
    setIsFiltersOpen((currentValue) => !currentValue);
  }

  function openDetailDrawer() {
    setIsDetailDrawerOpen(true);
  }

  function closeDetailDrawer() {
    setIsDetailDrawerOpen(false);
  }

  function openFormDrawer() {
    setIsFormDrawerOpen(true);
  }

  function closeFormDrawer() {
    setIsFormDrawerOpen(false);
  }

  function closeDrawers() {
    setIsDetailDrawerOpen(false);
    setIsFormDrawerOpen(false);
  }

  function openDeleteItemConfirm() {
    setShowDeleteItemConfirm(true);
  }

  function closeDeleteItemConfirm() {
    setShowDeleteItemConfirm(false);
  }

  return {
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
  };
}
