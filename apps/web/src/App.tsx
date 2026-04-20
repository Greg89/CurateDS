import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AttributeDataType,
  AttributeDefinition,
  Collection,
  createAttributeDefinition,
  createCollection,
  createItem,
  getItemDetail,
  ItemDetail,
  ItemSummary,
  listAttributeDefinitions,
  listCollections,
  listItems
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
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemAttributeValues, setItemAttributeValues] = useState<
    Record<string, string>
  >({});
  const [selectedItemId, setSelectedItemId] = useState("");

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

  const itemsQuery = useQuery({
    queryKey: ["items", selectedCollectionId],
    queryFn: () => listItems(selectedCollectionId),
    enabled: selectedCollectionId.length > 0
  });

  const itemDetailQuery = useQuery({
    queryKey: ["item-detail", selectedCollectionId, selectedItemId],
    queryFn: () => getItemDetail(selectedCollectionId, selectedItemId),
    enabled: selectedCollectionId.length > 0 && selectedItemId.length > 0
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

  const createItemMutation = useMutation({
    mutationFn: createItem,
    onSuccess: async (item) => {
      setItemName("");
      setItemDescription("");
      setItemQuantity("1");
      setItemAttributeValues({});
      setSelectedItemId(item.id);
      await queryClient.invalidateQueries({ queryKey: ["items", selectedCollectionId] });
      await queryClient.invalidateQueries({
        queryKey: ["item-detail", selectedCollectionId, item.id]
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

  function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCollectionId) {
      return;
    }

    const attributeValues = (attributeDefinitionsQuery.data ?? [])
      .map((attributeDefinition) => ({
        attributeDefinitionId: attributeDefinition.id,
        value: itemAttributeValues[attributeDefinition.id] ?? ""
      }))
      .filter((attributeValue) => attributeValue.value.trim().length > 0);

    createItemMutation.mutate({
      collectionId: selectedCollectionId,
      name: itemName,
      description: itemDescription,
      quantity: Number(itemQuantity),
      attributeValues
    });
  }

  function handleAttributeValueChange(attributeDefinitionId: string, value: string) {
    setItemAttributeValues((currentValues) => ({
      ...currentValues,
      [attributeDefinitionId]: value
    }));
  }

  const selectedCollection = collectionsQuery.data?.find(
    (collection) => collection.id == selectedCollectionId
  );

  useEffect(() => {
    if (!itemsQuery.data) {
      return;
    }

    if (itemsQuery.data.length === 0) {
      if (selectedItemId) {
        setSelectedItemId("");
      }

      return;
    }

    const hasSelectedItem = itemsQuery.data.some((item) => item.id === selectedItemId);

    if (!hasSelectedItem) {
      setSelectedItemId(itemsQuery.data[0].id);
    }
  }, [itemsQuery.data, selectedItemId]);

  return (
    <main className="page-shell">
      <section className="intro-card">
        <p className="eyebrow">CurateDS</p>
        <h1>Shape the collection, then catalog the things inside it.</h1>
        <p className="copy">
          This slice carries a real item workflow from browser to database:
          define custom fields for a collection, create an item with typed
          values, and review the saved detail view.
        </p>
        <p className="meta">API base URL: {appConfig.apiBaseUrl}</p>
      </section>

      <section className="workspace-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Collections</h2>
            <p>Create a collection, then select it to manage fields and items.</p>
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

        <section className="panel panel-wide">
          <div className="panel-header">
            <h2>Items</h2>
            <p>
              {selectedCollection
                ? `Create real catalog entries for ${selectedCollection.name}.`
                : "Choose a collection before creating items."}
            </p>
          </div>

          <div className="item-workspace">
            <form className="collection-form" onSubmit={handleItemSubmit}>
              <label className="field">
                <span>Name</span>
                <input
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  disabled={!selectedCollection}
                  placeholder="Kind of Blue"
                  maxLength={120}
                />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  className="field-textarea"
                  value={itemDescription}
                  onChange={(event) => setItemDescription(event.target.value)}
                  disabled={!selectedCollection}
                  placeholder="Original mono pressing with clean sleeve."
                  maxLength={2000}
                  rows={3}
                />
              </label>

              <label className="field">
                <span>Quantity</span>
                <input
                  value={itemQuantity}
                  onChange={(event) => setItemQuantity(event.target.value)}
                  disabled={!selectedCollection}
                  inputMode="numeric"
                  min={1}
                  max={9999}
                  type="number"
                />
              </label>

              <DynamicAttributeFields
                attributeDefinitions={attributeDefinitionsQuery.data ?? []}
                disabled={!selectedCollection}
                values={itemAttributeValues}
                onChange={handleAttributeValueChange}
              />

              <button
                className="primary-button"
                disabled={!selectedCollection || createItemMutation.isPending}
                type="submit"
              >
                {createItemMutation.isPending ? "Saving Item..." : "Create Item"}
              </button>

              {createItemMutation.error ? (
                <p className="message error">{createItemMutation.error.message}</p>
              ) : null}
            </form>

            <div className="item-results">
              {itemsQuery.isLoading ? <p className="message">Loading items...</p> : null}
              {itemsQuery.isError ? (
                <p className="message error">{itemsQuery.error.message}</p>
              ) : null}

              <ItemList
                items={itemsQuery.data ?? []}
                selectedCollectionName={selectedCollection?.name ?? null}
                selectedItemId={selectedItemId}
                onSelect={setSelectedItemId}
              />

              {itemDetailQuery.isLoading ? (
                <p className="message">Loading item detail...</p>
              ) : null}
              {itemDetailQuery.isError ? (
                <p className="message error">{itemDetailQuery.error.message}</p>
              ) : null}

              <ItemDetailCard
                item={itemDetailQuery.data ?? null}
                selectedCollectionName={selectedCollection?.name ?? null}
              />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function CollectionList({
  collections,
  selectedCollectionId,
  onSelect
}: Readonly<{
  collections: Collection[];
  selectedCollectionId: string;
  onSelect: (collectionId: string) => void;
}>) {
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
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  selectedCollectionName: string | null;
}>) {
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

function DynamicAttributeFields({
  attributeDefinitions,
  disabled,
  values,
  onChange
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  disabled: boolean;
  values: Record<string, string>;
  onChange: (attributeDefinitionId: string, value: string) => void;
}>) {
  if (attributeDefinitions.length === 0) {
    return (
      <div className="empty-state compact">
        <p>No custom attributes yet.</p>
        <p>Add one above and it will appear here for item entry.</p>
      </div>
    );
  }

  return (
    <div className="dynamic-field-grid">
      {attributeDefinitions.map((attributeDefinition) => (
        <label className="field" key={attributeDefinition.id}>
          <span>
            {attributeDefinition.name}
            {attributeDefinition.isRequired ? " *" : ""}
          </span>
          {renderAttributeInput(attributeDefinition, values, disabled, onChange)}
        </label>
      ))}
    </div>
  );
}

function renderAttributeInput(
  attributeDefinition: AttributeDefinition,
  values: Record<string, string>,
  disabled: boolean,
  onChange: (attributeDefinitionId: string, value: string) => void
) {
  const value = values[attributeDefinition.id] ?? "";

  switch (attributeDefinition.dataType) {
    case "Boolean":
      return (
        <select
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(attributeDefinition.id, event.target.value)
          }
        >
          <option value="">Select one</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    case "Date":
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(attributeDefinition.id, event.target.value)
          }
          type="date"
        />
      );
    case "Number":
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(attributeDefinition.id, event.target.value)
          }
          type="number"
          step={1}
        />
      );
    case "Decimal":
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(attributeDefinition.id, event.target.value)
          }
          type="number"
          step="0.01"
        />
      );
    default:
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(attributeDefinition.id, event.target.value)
          }
          placeholder={`Enter ${attributeDefinition.name.toLowerCase()}`}
          type="text"
        />
      );
  }
}

function ItemList({
  items,
  selectedCollectionName,
  selectedItemId,
  onSelect
}: Readonly<{
  items: ItemSummary[];
  selectedCollectionName: string | null;
  selectedItemId: string;
  onSelect: (itemId: string) => void;
}>) {
  if (!selectedCollectionName) {
    return (
      <div className="empty-state compact">
        <p>No collection selected.</p>
        <p>Pick a collection to see its item list.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state compact">
        <p>No items yet for {selectedCollectionName}.</p>
        <p>Create the first entry to validate the end-to-end slice.</p>
      </div>
    );
  }

  return (
    <ul className="item-list">
      {items.map((item) => (
        <li
          className={`item-card${item.id === selectedItemId ? " selected" : ""}`}
          key={item.id}
        >
          <button className="item-select" onClick={() => onSelect(item.id)} type="button">
            <div className="item-card-header">
              <h3>{item.name}</h3>
              <span className="attribute-pill">Qty {item.quantity}</span>
            </div>
            <p>{item.description ?? "No description yet."}</p>
            <p>
              {item.attributeValueCount} custom value
              {item.attributeValueCount === 1 ? "" : "s"}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ItemDetailCard({
  item,
  selectedCollectionName
}: Readonly<{
  item: ItemDetail | null;
  selectedCollectionName: string | null;
}>) {
  if (!selectedCollectionName) {
    return null;
  }

  if (!item) {
    return (
      <div className="empty-state compact">
        <p>No item selected.</p>
        <p>Choose an item to review its saved detail view.</p>
      </div>
    );
  }

  return (
    <section className="item-detail-card">
      <div className="item-card-header">
        <div>
          <p className="eyebrow subtle">Item Detail</p>
          <h3>{item.name}</h3>
        </div>
        <span className="attribute-pill">Qty {item.quantity}</span>
      </div>

      <p className="item-detail-copy">
        {item.description ?? "No description has been saved for this item yet."}
      </p>

      <div className="detail-meta-grid">
        <p>
          Created{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(item.createdUtc))}
        </p>
        <p>
          Updated{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(item.updatedUtc))}
        </p>
      </div>

      {item.attributeValues.length === 0 ? (
        <div className="empty-state compact">
          <p>No custom values were saved.</p>
          <p>This item only uses the shared core fields so far.</p>
        </div>
      ) : (
        <ul className="detail-value-list">
          {item.attributeValues.map((attributeValue) => (
            <li className="detail-value-card" key={attributeValue.attributeDefinitionId}>
              <div className="attribute-card-header">
                <h3>{attributeValue.attributeName}</h3>
                <span className="attribute-pill">{attributeValue.dataType}</span>
              </div>
              <p className="attribute-meta">
                Key: <code>{attributeValue.attributeKey}</code>
              </p>
              <p className="item-value">{attributeValue.value}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
