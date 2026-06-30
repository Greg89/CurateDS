import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type ContractMapping = {
  readonly csharpFile: string;
  readonly csharpRecord: string;
  readonly schemaFile: string;
  readonly schemaName: string;
};

const repoRoot = resolve(import.meta.dirname, "../../..");

const responseContracts: readonly ContractMapping[] = [
  {
    csharpFile: "apps/api/Collections/CollectionContracts.cs",
    csharpRecord: "CollectionResponse",
    schemaFile: "packages/contracts/src/collections.ts",
    schemaName: "CollectionSchema"
  },
  {
    csharpFile: "apps/api/Collections/CollectionContracts.cs",
    csharpRecord: "CollectionSummaryResponse",
    schemaFile: "packages/contracts/src/collections.ts",
    schemaName: "CollectionSummarySchema"
  },
  {
    csharpFile: "apps/api/Collections/CollectionContracts.cs",
    csharpRecord: "CollectionReportsResponse",
    schemaFile: "packages/contracts/src/collections.ts",
    schemaName: "CollectionReportsSchema"
  },
  {
    csharpFile: "apps/api/Collections/CollectionContracts.cs",
    csharpRecord: "ItemsByLocationResponse",
    schemaFile: "packages/contracts/src/collections.ts",
    schemaName: "ItemsByLocationSchema"
  },
  {
    csharpFile: "apps/api/Collections/CollectionContracts.cs",
    csharpRecord: "ItemsByTagResponse",
    schemaFile: "packages/contracts/src/collections.ts",
    schemaName: "ItemsByTagSchema"
  },
  {
    csharpFile: "apps/api/Collections/CollectionContracts.cs",
    csharpRecord: "CollectionActivityEventResponse",
    schemaFile: "packages/contracts/src/collections.ts",
    schemaName: "CollectionActivityEventSchema"
  },
  {
    csharpFile: "apps/api/Collections/CollectionContracts.cs",
    csharpRecord: "PagedCollectionActivityResponse",
    schemaFile: "packages/contracts/src/collections.ts",
    schemaName: "PagedCollectionActivitySchema"
  },
  {
    csharpFile: "apps/api/Collections/CollectionContracts.cs",
    csharpRecord: "SavedViewResponse",
    schemaFile: "packages/contracts/src/saved-views.ts",
    schemaName: "SavedViewSchema"
  },
  {
    csharpFile: "apps/api/Collections/AttributeDefinitionContracts.cs",
    csharpRecord: "AttributeDefinitionResponse",
    schemaFile: "packages/contracts/src/attributes.ts",
    schemaName: "AttributeDefinitionSchema"
  },
  {
    csharpFile: "apps/api/Collections/OrganizationContracts.cs",
    csharpRecord: "TagResponse",
    schemaFile: "packages/contracts/src/tags.ts",
    schemaName: "TagSchema"
  },
  {
    csharpFile: "apps/api/Collections/OrganizationContracts.cs",
    csharpRecord: "LocationResponse",
    schemaFile: "packages/contracts/src/locations.ts",
    schemaName: "LocationSchema"
  },
  {
    csharpFile: "apps/api/Collections/ItemTypeContracts.cs",
    csharpRecord: "ItemTypeResponse",
    schemaFile: "packages/contracts/src/item-types.ts",
    schemaName: "ItemTypeSchema"
  },
  {
    csharpFile: "apps/api/Collections/ItemContracts.cs",
    csharpRecord: "ItemSummaryResponse",
    schemaFile: "packages/contracts/src/items.ts",
    schemaName: "ItemSummarySchema"
  },
  {
    csharpFile: "apps/api/Collections/ItemContracts.cs",
    csharpRecord: "ItemDetailResponse",
    schemaFile: "packages/contracts/src/items.ts",
    schemaName: "ItemDetailSchema"
  },
  {
    csharpFile: "apps/api/Collections/ItemContracts.cs",
    csharpRecord: "MediaAssetResponse",
    schemaFile: "packages/contracts/src/media.ts",
    schemaName: "MediaAssetSchema"
  },
  {
    csharpFile: "apps/api/Collections/ItemContracts.cs",
    csharpRecord: "ItemAttributeValueResponse",
    schemaFile: "packages/contracts/src/items.ts",
    schemaName: "ItemAttributeValueSchema"
  },
  {
    csharpFile: "apps/api/Collections/ItemContracts.cs",
    csharpRecord: "PagedItemsResponse",
    schemaFile: "packages/contracts/src/items.ts",
    schemaName: "PagedItemsSchema"
  },
  {
    csharpFile: "apps/api/Collections/ItemContracts.cs",
    csharpRecord: "ItemEventResponse",
    schemaFile: "packages/contracts/src/items.ts",
    schemaName: "ItemEventSchema"
  }
];

describe("backend response contract drift", () => {
  it.each(responseContracts)(
    "$csharpRecord fields match $schemaName",
    ({ csharpFile, csharpRecord, schemaFile, schemaName }) => {
      const backendFields = getCSharpRecordJsonFields(csharpFile, csharpRecord);
      const schemaFields = getZodObjectFields(schemaFile, schemaName);

      expect(schemaFields).toEqual(backendFields);
    }
  );
});

function getCSharpRecordJsonFields(relativePath: string, recordName: string) {
  const source = readWorkspaceFile(relativePath);
  const recordMatch = new RegExp(
    `public\\s+sealed\\s+record\\s+${recordName}\\s*\\(([\\s\\S]*?)\\);`
  ).exec(source);

  if (!recordMatch) {
    throw new Error(`Could not find C# record ${recordName} in ${relativePath}`);
  }

  return recordMatch[1]
    .split(",")
    .map((parameter) => parameter.replace(/\/\/.*$/gm, "").trim())
    .filter(Boolean)
    .map((parameter) => {
      const nameMatch = /([A-Z][A-Za-z0-9_]*)(?:\s*=\s*[^,]+)?$/.exec(parameter);
      if (!nameMatch) {
        throw new Error(`Could not parse C# record parameter: ${parameter}`);
      }

      return toCamelCase(nameMatch[1]);
    });
}

function getZodObjectFields(relativePath: string, schemaName: string) {
  const source = readWorkspaceFile(relativePath);
  const declaration = `export const ${schemaName} = z.object(`;
  const declarationStart = source.indexOf(declaration);

  if (declarationStart === -1) {
    throw new Error(`Could not find Zod schema ${schemaName} in ${relativePath}`);
  }

  const objectStart = source.indexOf("{", declarationStart);
  const objectEnd = findMatchingBrace(source, objectStart);
  const objectBody = source.slice(objectStart + 1, objectEnd);

  return [...objectBody.matchAll(/^\s{2}([a-z][A-Za-z0-9_]*):/gm)].map((match) => match[1]);
}

function findMatchingBrace(source: string, openBraceIndex: number) {
  let depth = 0;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const character = source[index];

    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return index;
  }

  throw new Error("Could not find matching brace for Zod object");
}

function readWorkspaceFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function toCamelCase(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
