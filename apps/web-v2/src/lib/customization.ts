import { z } from "zod";
import type { components } from "./generated/api";
import type { Collection } from "./collections";

const label = z
  .string()
  .refine(
    (value) => !/[\u0000-\u001f\u007f-\u009f]/.test(value),
    "Use a single line without control characters.",
  )
  .trim()
  .min(1, "Enter a label.")
  .max(40);
export const vocabularyInputSchema = z.object({
  itemLabel: label,
  itemsLabel: label,
}) satisfies z.ZodType<
  components["schemas"]["UpdateCollectionVocabularyRequest"]
>;
export function vocabulary(collection: Collection) {
  const one = collection.itemLabel || "item";
  const many = collection.itemsLabel || "items";
  return {
    one,
    many,
    One: one[0].toUpperCase() + one.slice(1),
    Many: many[0].toUpperCase() + many.slice(1),
    add: one === "item" ? "Add an item" : `Add ${one}`,
  };
}
export const fieldInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters for the field name.")
    .max(60),
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  itemTypeId: z.uuid().nullable(),
}) satisfies z.ZodType<
  components["schemas"]["UpdateAttributeDefinitionRequest"]
>;
export const createFieldInputSchema = fieldInputSchema.extend({
  dataType: z.enum([
    "Text",
    "Number",
    "Decimal",
    "Boolean",
    "Date",
    "SingleSelect",
  ]),
}) satisfies z.ZodType<
  components["schemas"]["CreateAttributeDefinitionRequest"]
>;
export const fieldTypes = {
  Text: "Text",
  Number: "Whole number",
  Decimal: "Decimal number",
  Boolean: "Yes or no",
  Date: "Date",
  SingleSelect: "Text choice",
};
