import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ItemFilters, createSavedView, deleteSavedView, listSavedViews } from "../../api";
import { SavedItemView } from "../types";
import { tryParseSavedViewFilters } from "../utils";

export function useSavedViews(selectedCollectionId: string) {
  const [savedViewName, setSavedViewName] = useState("");
  const queryClient = useQueryClient();

  const savedViewsQuery = useQuery({
    queryKey: ["saved-views", selectedCollectionId],
    queryFn: () => listSavedViews(selectedCollectionId),
    enabled: !!selectedCollectionId,
    select: (data): SavedItemView[] =>
      data.flatMap((v) => {
        const filters = tryParseSavedViewFilters(v.filtersJson);
        return filters
          ? [{
              id: v.id,
              name: v.name,
              filters
            }]
          : [];
      })
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

