import { AttributeDefinition } from "../../api";

export function AttributeDefinitionList({
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
