import { FormEvent, useState } from "react";
import { AttributeDataType, AttributeDefinition, ItemType } from "../../api";
import { AttributeDefinitionList } from "./AttributeDefinitionList";

const attributeDataTypes: AttributeDataType[] = [
  "Text",
  "Number",
  "Decimal",
  "Boolean",
  "Date",
  "SingleSelect"
];

export function AttributeDefinitionsSection({
  attributeDefinitions,
  collectionName,
  createError,
  isCreatePending,
  isDeletePending,
  itemTypes,
  onCreate,
  onDelete
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  collectionName: string;
  createError: Error | null;
  isCreatePending: boolean;
  isDeletePending: boolean;
  itemTypes: ItemType[];
  onCreate: (input: {
    name: string;
    dataType: AttributeDataType;
    isRequired: boolean;
    isFilterable: boolean;
    itemTypeId: string | null;
    onSuccess: () => void;
  }) => void;
  onDelete: (attributeDefinitionId: string) => void;
}>) {
  const [attributeName, setAttributeName] = useState("");
  const [attributeDataType, setAttributeDataType] = useState<AttributeDataType>("Text");
  const [attributeIsRequired, setAttributeIsRequired] = useState(false);
  const [attributeIsFilterable, setAttributeIsFilterable] = useState(true);
  const [attributeItemTypeId, setAttributeItemTypeId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({
      name: attributeName,
      dataType: attributeDataType,
      isRequired: attributeIsRequired,
      isFilterable: attributeIsFilterable,
      itemTypeId: attributeItemTypeId || null,
      onSuccess: () => {
        setAttributeName("");
        setAttributeDataType("Text");
        setAttributeIsRequired(false);
        setAttributeIsFilterable(true);
        setAttributeItemTypeId("");
      }
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Attribute Definitions</h3>
        <p>Define reusable item fields for {collectionName}.</p>
      </div>

      <form className="collection-form" onSubmit={handleSubmit}>
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
            onChange={(event) => setAttributeDataType(event.target.value as AttributeDataType)}
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

        <button className="primary-button" disabled={isCreatePending} type="submit">
          {isCreatePending ? "Saving..." : "Add Attribute"}
        </button>

        {createError ? <p className="message error">{createError.message}</p> : null}
      </form>

      <AttributeDefinitionList
        attributeDefinitions={attributeDefinitions}
        selectedCollectionName={collectionName}
        isDeletePending={isDeletePending}
        onDelete={onDelete}
      />
    </section>
  );
}
