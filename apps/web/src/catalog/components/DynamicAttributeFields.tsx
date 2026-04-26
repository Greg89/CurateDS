import { AttributeDefinition } from "../../api";

export function renderAttributeInput(
  attributeDefinition: AttributeDefinition,
  values: Record<string, string>,
  disabled: boolean,
  onChange: (attributeDefinitionId: string, value: string) => void,
  valueKey?: string
) {
  const resolvedValueKey = valueKey ?? attributeDefinition.id;
  const value = values[resolvedValueKey] ?? "";

  switch (attributeDefinition.dataType) {
    case "Boolean":
      return (
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
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
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
          type="date"
        />
      );
    case "Number":
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
          type="number"
          step={1}
        />
      );
    case "Decimal":
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
          type="number"
          step="0.01"
        />
      );
    default:
      return (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(resolvedValueKey, event.target.value)}
          placeholder={`Enter ${attributeDefinition.name.toLowerCase()}`}
          type="text"
        />
      );
  }
}

export function DynamicAttributeFields({
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
        <p>Add one in settings and it will appear here for item entry.</p>
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
