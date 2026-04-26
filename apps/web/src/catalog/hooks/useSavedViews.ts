import { useEffect, useState } from "react";
import { ItemFilters } from "../../api";
import { SavedItemView } from "../types";
import { getSavedViewsStorageKey, readSavedViews } from "../utils";

export function useSavedViews(selectedCollectionId: string) {
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViews, setSavedViews] = useState<SavedItemView[]>([]);
  const [savedViewsCollectionId, setSavedViewsCollectionId] = useState("");

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

  function saveCurrentView(filters: ItemFilters) {
    const normalizedName = savedViewName.trim();

    if (!selectedCollectionId || normalizedName.length === 0) {
      return;
    }

    const nextView: SavedItemView = {
      id: crypto.randomUUID(),
      name: normalizedName,
      filters
    };

    setSavedViews((currentViews) => [...currentViews, nextView]);
    setSavedViewName("");
  }

  function deleteSavedView(viewId: string) {
    setSavedViews((currentViews) =>
      currentViews.filter((view) => view.id !== viewId)
    );
  }

  return {
    savedViewName,
    setSavedViewName,
    savedViews,
    saveCurrentView,
    deleteSavedView
  };
}
