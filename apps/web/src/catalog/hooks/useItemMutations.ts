import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createItem,
  deleteItem,
  deleteItemMedia,
  ItemDetail,
  setPrimaryItemMedia,
  updateItem,
  uploadItemMedia
} from "../../api";

interface UseItemMutationsOptions {
  collectionId: string;
  populateItemForm: (item: ItemDetail) => void;
  setSelectedItemId: (id: string) => void;
  setEditingItemId: (id: string | null) => void;
  setItemSaveCount: React.Dispatch<React.SetStateAction<number>>;
  onCreateSuccess?: () => void;
}

export function useItemMutations({
  collectionId,
  populateItemForm,
  setSelectedItemId,
  setEditingItemId,
  setItemSaveCount,
  onCreateSuccess
}: UseItemMutationsOptions) {
  const queryClient = useQueryClient();

  const createItemMutation = useMutation({
    mutationFn: createItem,
    onSuccess: async (item) => {
      onCreateSuccess?.();
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

  return {
    createItemMutation,
    updateItemMutation,
    deleteItemMutation,
    uploadItemMediaMutation,
    deleteItemMediaMutation,
    setPrimaryItemMediaMutation
  };
}
