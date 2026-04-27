import { useEffect, useState } from "react";
import { ItemDetail } from "../../api";

export function useItemForm(selectedCollectionId: string) {
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemLocationId, setItemLocationId] = useState("");
  const [itemTagIds, setItemTagIds] = useState<string[]>([]);
  const [itemAttributeValues, setItemAttributeValues] = useState<Record<string, string>>({});
  const [selectedItemId, setSelectedItemId] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemSaveCount, setItemSaveCount] = useState(0);

  useEffect(() => {
    resetItemForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollectionId]);

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

  function handleAttributeValueChange(attributeDefinitionId: string, value: string) {
    setItemAttributeValues((currentValues) => ({
      ...currentValues,
      [attributeDefinitionId]: value
    }));
  }

  return {
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
  };
}
