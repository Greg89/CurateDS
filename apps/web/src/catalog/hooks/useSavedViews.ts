import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ItemFilters, createSavedView, deleteSavedView, listSavedViews } from "../../api";
import { SavedItemView } from "../types";

export function useSavedViews(selectedCollectionId: string) {
  const [savedViewName, setSavedViewName] = useState("");
  const queryClient = useQueryClient();

  const savedViewsQuery = useQuery({
    queryKey: ["saved-views", selectedCollectionId],
    queryFn: () => listSavedViews(selectedCollectionId),
    enabled: !!selectedCollectionId,
    select: (data): SavedItemView[] =>
      data.map((v) => ({
        id: v.id,
        name: v.name,
        filters: JSON.parse(v.filtersJson) as ItemFilters
      }))
  });

  const createMutation = useMutation({
    mutationFn: ({ name, filtersJson }: { name: string; filtersJson: string }) =>
      createSavedView(selectedCollectionId, name, filtersJson),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-views", selectedCollectionId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (viewId: string) => deleteSavedView(selectedCollectionId, viewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-views", selectedCollectionId] });
    }
  });

  function saveCurrentView(filters: ItemFilters) {
    const normalizedName = savedViewName.trim();
    if (!selectedCollectionId || normalizedName.length === 0) return;

    createMutation.mutate({
      name: normalizedName,
      filtersJson: JSON.stringify(filters)
    });
    setSavedViewName("");
  }

  function deleteSavedViewById(viewId: string) {
    deleteMutation.mutate(viewId);
  }

  return {
    savedViewName,
    setSavedViewName,
    savedViews: savedViewsQuery.data ?? [],
    saveCurrentView,
    deleteSavedView: deleteSavedViewById
  };
}

