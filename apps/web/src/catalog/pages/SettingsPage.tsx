import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AttributeDataType,
  Collection,
  ItemType,
  createAttributeDefinition,
  createItemType,
  createLocation,
  createTag,
  deleteAttributeDefinition,
  deleteCollection,
  deleteItemType,
  deleteLocation,
  deleteTag,
  downloadCollectionExport,
  listAttributeDefinitions,
  listItems,
  listItemTypes,
  listLocations,
  listTags
} from "../../api";
import { AttributeDefinitionList } from "../components/AttributeDefinitionList";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { OrganizationSummary } from "../components/OrganizationSummary";
import { useNavigate } from "react-router-dom";

const attributeDataTypes: AttributeDataType[] = [
  "Text",
  "Number",
  "Decimal",
  "Boolean",
  "Date",
  "SingleSelect"
];

export function SettingsPage({
  selectedCollection
}: Readonly<{
  selectedCollection: Collection;
}>) {
  const collectionId = selectedCollection.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [attributeName, setAttributeName] = useState("");
  const [attributeDataType, setAttributeDataType] = useState<AttributeDataType>("Text");
  const [attributeIsRequired, setAttributeIsRequired] = useState(false);
  const [attributeIsFilterable, setAttributeIsFilterable] = useState(true);
  const [attributeItemTypeId, setAttributeItemTypeId] = useState("");
  const [itemTypeName, setItemTypeName] = useState("");
  const [tagName, setTagName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Queries
  const attributeDefinitionsQuery = useQuery({
    queryKey: ["attribute-definitions", collectionId],
    queryFn: () => listAttributeDefinitions(collectionId)
  });

  const itemTypesQuery = useQuery({
    queryKey: ["item-types", collectionId],
    queryFn: () => listItemTypes(collectionId)
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: listTags
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations
  });

  const itemsQuery = useQuery({
    queryKey: ["items", collectionId],
    queryFn: () => listItems(collectionId)
  });

  const attributeDefinitions = attributeDefinitionsQuery.data ?? [];
  const itemTypes = itemTypesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const items = itemsQuery.data?.items ?? [];

  // Mutations
  const createAttributeDefinitionMutation = useMutation({
    mutationFn: createAttributeDefinition,
    onSuccess: async () => {
      setAttributeName("");
      setAttributeDataType("Text");
      setAttributeIsRequired(false);
      setAttributeIsFilterable(true);
      await queryClient.invalidateQueries({ queryKey: ["attribute-definitions", collectionId] });
    }
  });

  const deleteAttributeDefinitionMutation = useMutation({
    mutationFn: deleteAttributeDefinition,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attribute-definitions", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["items", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["item-detail", collectionId] }),
      ]);
    }
  });

  const createItemTypeMutation = useMutation({
    mutationFn: createItemType,
    onSuccess: async () => {
      setItemTypeName("");
      await queryClient.invalidateQueries({ queryKey: ["item-types", collectionId] });
    }
  });

  const deleteItemTypeMutation = useMutation({
    mutationFn: deleteItemType,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["item-types", collectionId] });
      await queryClient.invalidateQueries({ queryKey: ["attribute-definitions", collectionId] });
    }
  });

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: async () => {
      setTagName("");
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => {
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

  const deleteLocationMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate("/");
    }
  });

  function handleAttributeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createAttributeDefinitionMutation.mutate({
      collectionId,
      name: attributeName,
      dataType: attributeDataType,
      isRequired: attributeIsRequired,
      isFilterable: attributeIsFilterable,
      itemTypeId: attributeItemTypeId || null
    });
  }

  function handleItemTypeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createItemTypeMutation.mutate({ collectionId, name: itemTypeName });
  }

  function handleTagSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTagMutation.mutate(tagName);
  }

  function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createLocationMutation.mutate({ name: locationName, description: locationDescription });
  }

  return (
    <section className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <h3>Attribute Definitions</h3>
          <p>Define reusable item fields for {selectedCollection.name}.</p>
        </div>

        <form className="collection-form" onSubmit={handleAttributeSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              value={attributeName}
              onChange={(event) => setAttributeName(event.target.value)}
              placeholder="Release Year"
              maxLength={60}
            />
          </label>

          <label className="field">
            <span>Data Type</span>
            <select
              value={attributeDataType}
              onChange={(event) =>
                setAttributeDataType(event.target.value as AttributeDataType)
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
              onChange={(event) => setAttributeIsRequired(event.target.checked)}
              type="checkbox"
            />
            <span>Required for future items</span>
          </label>

          <label className="checkbox-row">
            <input
              checked={attributeIsFilterable}
              onChange={(event) => setAttributeIsFilterable(event.target.checked)}
              type="checkbox"
            />
            <span>Filterable in list views</span>
          </label>

          <label className="field">
            <span>Applies to</span>
            <select
              value={attributeItemTypeId}
              onChange={(event) => setAttributeItemTypeId(event.target.value)}
            >
              <option value="">All item types</option>
              {itemTypes.map((itemType) => (
                <option key={itemType.id} value={itemType.id}>
                  {itemType.name}
                </option>
              ))}
            </select>
          </label>

          <button className="primary-button" disabled={createAttributeDefinitionMutation.isPending} type="submit">
            {createAttributeDefinitionMutation.isPending ? "Saving..." : "Add Attribute"}
          </button>

          {createAttributeDefinitionMutation.error ? (
            <p className="message error">{createAttributeDefinitionMutation.error.message}</p>
          ) : null}
        </form>

        <AttributeDefinitionList
          attributeDefinitions={attributeDefinitions}
          selectedCollectionName={selectedCollection.name}
          isDeletePending={deleteAttributeDefinitionMutation.isPending}
          onDelete={(id) => deleteAttributeDefinitionMutation.mutate({ collectionId, attributeDefinitionId: id })}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Item Types</h3>
          <p>Define named types for items in {selectedCollection.name} (e.g. Machine, Part).</p>
        </div>

        <form className="collection-form" onSubmit={handleItemTypeSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              value={itemTypeName}
              onChange={(event) => setItemTypeName(event.target.value)}
              placeholder="Machine"
              maxLength={50}
            />
          </label>

          <button className="primary-button" disabled={createItemTypeMutation.isPending} type="submit">
            {createItemTypeMutation.isPending ? "Saving..." : "Add Item Type"}
          </button>

          {createItemTypeMutation.error ? (
            <p className="message error">{createItemTypeMutation.error.message}</p>
          ) : null}
        </form>

        {itemTypes.length > 0 ? (
          <ItemTypeList
            itemTypes={itemTypes}
            isDeletePending={deleteItemTypeMutation.isPending}
            onDelete={(id) => deleteItemTypeMutation.mutate({ collectionId, itemTypeId: id })}
          />
        ) : (
          <div className="empty-state">
            <p>No item types yet.</p>
            <p>Add a type to differentiate items within this collection.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Organization</h3>
          <p>Create reusable tags and storage locations for your items.</p>
        </div>

        <form className="collection-form" onSubmit={handleTagSubmit}>
          <label className="field">
            <span>Tag Name</span>
            <input
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="Wishlist"
              maxLength={50}
            />
          </label>

          <button className="primary-button" disabled={createTagMutation.isPending} type="submit">
            {createTagMutation.isPending ? "Saving..." : "Add Tag"}
          </button>

          {createTagMutation.error ? <p className="message error">{createTagMutation.error.message}</p> : null}
        </form>

        <form className="collection-form section-gap" onSubmit={handleLocationSubmit}>
          <label className="field">
            <span>Location Name</span>
            <input
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="Office Shelf"
              maxLength={80}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <input
              value={locationDescription}
              onChange={(event) => setLocationDescription(event.target.value)}
              placeholder="Upper left bookcase"
              maxLength={240}
            />
          </label>

          <button className="primary-button" disabled={createLocationMutation.isPending} type="submit">
            {createLocationMutation.isPending ? "Saving..." : "Add Location"}
          </button>

          {createLocationMutation.error ? <p className="message error">{createLocationMutation.error.message}</p> : null}
        </form>

        <OrganizationSummary
          items={items}
          locations={locations}
          tags={tags}
          isDeleteTagPending={deleteTagMutation.isPending}
          isDeleteLocationPending={deleteLocationMutation.isPending}
          onDeleteTag={(id) => deleteTagMutation.mutate(id)}
          onDeleteLocation={(id) => deleteLocationMutation.mutate(id)}
        />
      </section>

      <section className="panel panel-fit">
        <div className="panel-header">
          <h3>Export Data</h3>
          <p>Download all items and attribute definitions as CSV files in a ZIP archive.</p>
        </div>
        <button
          className="button"
          onClick={() => {
            void downloadCollectionExport(
              selectedCollection.id,
              `${selectedCollection.name}-export.zip`
            );
          }}
        >
          Export Collection
        </button>
      </section>

      <section className="panel panel-danger panel-fit">
        <div className="panel-header">
          <h3>Danger Zone</h3>
          <p>Permanently remove this collection and all its data.</p>
        </div>
        <button
          className="danger-button"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete Collection
        </button>
      </section>

      {showDeleteConfirm ? (
        <ConfirmDialog
          title={`Delete "${selectedCollection.name}"?`}
          message="This will permanently delete the collection, all its items, attribute definitions, and associated data. This action cannot be undone."
          isPending={deleteCollectionMutation.isPending}
          onConfirm={() => deleteCollectionMutation.mutate(selectedCollection.id)}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      ) : null}
    </section>
  );
}

function ItemTypeList({
  itemTypes,
  isDeletePending,
  onDelete
}: Readonly<{
  itemTypes: ItemType[];
  isDeletePending: boolean;
  onDelete: (id: string) => void;
}>) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmingType = itemTypes.find((it) => it.id === confirmDeleteId) ?? null;

  return (
    <>
      <ul className="attribute-list">
        {itemTypes.map((itemType) => (
          <li className="attribute-card" key={itemType.id}>
            <div className="attribute-card-header">
              <h3>{itemType.name}</h3>
            </div>
            <button
              className="danger-button"
              onClick={() => setConfirmDeleteId(itemType.id)}
              type="button"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {confirmingType ? (
        <ConfirmDialog
          title={`Delete "${confirmingType.name}"?`}
          message="Items assigned this type will become untyped. Attribute definitions scoped to this type will become global. This action cannot be undone."
          isPending={isDeletePending}
          onConfirm={() => {
            onDelete(confirmingType.id);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      ) : null}
    </>
  );
}
