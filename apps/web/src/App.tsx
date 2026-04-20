import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AttributeDataType,
  AttributeDefinition,
  Collection,
  createAttributeDefinition,
  createCollection,
  listAttributeDefinitions,
  listCollections
} from "./api";
import { appConfig } from "./config";

const attributeDataTypes: AttributeDataType[] = [
  "Text",
  "Number",
  "Decimal",
  "Boolean",
  "Date",
  "SingleSelect"
];

export function App() {
  const queryClient = useQueryClient();
  const [collectionName, setCollectionName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [attributeName, setAttributeName] = useState("");
  const [attributeDataType, setAttributeDataType] =
    useState<AttributeDataType>("Text");
  const [attributeIsRequired, setAttributeIsRequired] = useState(false);
  const [attributeIsFilterable, setAttributeIsFilterable] = useState(true);

  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    queryFn: listCollections
  });

  useEffect(() => {
    if (!selectedCollectionId && collectionsQuery.data?.length) {
      setSelectedCollectionId(collectionsQuery.data[0].id);
    }
  }, [collectionsQuery.data, selectedCollectionId]);

  const attributeDefinitionsQuery = useQuery({
    queryKey: ["attribute-definitions", selectedCollectionId],
    queryFn: () => listAttributeDefinitions(selectedCollectionId),
    enabled: selectedCollectionId.length > 0
  });

  const createCollectionMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: async (collection) => {
      setCollectionName("");
      setSelectedCollectionId(collection.id);
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
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

  const selectedCollection = collectionsQuery.data?.find(
    (collection) => collection.id == selectedCollectionId
  );

  return (
    <main className="page-shell">
      <section className="intro-card">
        <p className="eyebrow">CurateDS</p>
        <h1>Collections first, then hobby-specific metadata.</h1>
        <p className="copy">
          This slice lets you define structured attribute definitions for each
          collection so the catalog stays hobby-agnostic without losing
          relational integrity.
        </p>
        <p className="meta">API base URL: {appConfig.apiBaseUrl}</p>
      </section>

      <section className="workspace-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Collections</h2>
            <p>Create a collection, then select it to manage its custom fields.</p>
          </div>

          <form className="collection-form" onSubmit={handleCollectionSubmit}>
            <label className="field">
              <span>Name</span>
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
              {createCollectionMutation.isPending
                ? "Creating..."
                : "Create Collection"}
            </button>

            {createCollectionMutation.error ? (
              <p className="message error">
                {createCollectionMutation.error.message}
              </p>
            ) : null}
          </form>

          {collectionsQuery.isLoading ? <p className="message">Loading...</p> : null}
          {collectionsQuery.isError ? (
            <p className="message error">{collectionsQuery.error.message}</p>
          ) : null}

          <CollectionList
            collections={collectionsQuery.data ?? []}
            selectedCollectionId={selectedCollectionId}
            onSelect={setSelectedCollectionId}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Attribute Definitions</h2>
            <p>
              {selectedCollection
                ? `Define reusable item fields for ${selectedCollection.name}.`
                : "Choose a collection to define its custom fields."}
            </p>
          </div>

          <form className="collection-form" onSubmit={handleAttributeSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                value={attributeName}
                onChange={(event) => setAttributeName(event.target.value)}
                disabled={!selectedCollection}
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
                disabled={!selectedCollection}
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
                disabled={!selectedCollection}
                onChange={(event) => setAttributeIsRequired(event.target.checked)}
                type="checkbox"
              />
              <span>Required for future items</span>
            </label>

            <label className="checkbox-row">
              <input
                checked={attributeIsFilterable}
                disabled={!selectedCollection}
                onChange={(event) => setAttributeIsFilterable(event.target.checked)}
                type="checkbox"
              />
              <span>Filterable in list views</span>
            </label>

            <button
              className="primary-button"
              disabled={!selectedCollection || createAttributeDefinitionMutation.isPending}
              type="submit"
            >
              {createAttributeDefinitionMutation.isPending
                ? "Saving..."
                : "Add Attribute"}
            </button>

            {createAttributeDefinitionMutation.error ? (
              <p className="message error">
                {createAttributeDefinitionMutation.error.message}
              </p>
            ) : null}
          </form>

          {attributeDefinitionsQuery.isLoading ? (
            <p className="message">Loading attributes...</p>
          ) : null}
          {attributeDefinitionsQuery.isError ? (
            <p className="message error">
              {attributeDefinitionsQuery.error.message}
            </p>
          ) : null}

          <AttributeDefinitionList
            attributeDefinitions={attributeDefinitionsQuery.data ?? []}
            selectedCollectionName={selectedCollection?.name ?? null}
          />
        </section>
      </section>
    </main>
  );
}

function CollectionList({
  collections,
  selectedCollectionId,
  onSelect
}: {
  collections: Collection[];
  selectedCollectionId: string;
  onSelect: (collectionId: string) => void;
}) {
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

function AttributeDefinitionList({
  attributeDefinitions,
  selectedCollectionName
}: {
  attributeDefinitions: AttributeDefinition[];
  selectedCollectionName: string | null;
}) {
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
