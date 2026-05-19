import { describe, expect, it } from "vitest";
import { readValidationMessage } from "@app/api/http";

function makeResponse(body: unknown, status = 400): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

describe("readValidationMessage", () => {
  it("returns null when the response body is not valid JSON", async () => {
    const response = new Response("not json", { status: 400 });
    const result = await readValidationMessage(response);
    expect(result).toBeNull();
  });

  it("returns null when the body has no errors or detail", async () => {
    const response = makeResponse({ title: "Something went wrong" });
    const result = await readValidationMessage(response);
    expect(result).toBeNull();
  });

  it("returns the first error message from a validation response", async () => {
    const response = makeResponse({
      errors: {
        Name: ["Name is required.", "Name must not exceed 120 characters."],
        Quantity: ["Quantity must be greater than zero."],
      },
    });
    const result = await readValidationMessage(response);
    expect(result).toBe("Name is required.");
  });

  it("returns the first error message from a single-field validation response", async () => {
    const response = makeResponse({
      errors: { AttributeValues: ["A value for 'Condition' is required."] },
    });
    const result = await readValidationMessage(response);
    expect(result).toBe("A value for 'Condition' is required.");
  });

  it("returns the first error message from a 409 conflict response", async () => {
    const response = makeResponse(
      {
        type: "urn:curateds:problem:conflict",
        title: "Conflict",
        status: 409,
        errors: { TagName: ["Tag name 'Vintage' already exists."] },
        code: "conflict",
      },
      409
    );
    const result = await readValidationMessage(response);
    expect(result).toBe("Tag name 'Vintage' already exists.");
  });

  it("returns the detail from a 404 not-found response", async () => {
    const response = makeResponse(
      {
        type: "urn:curateds:problem:not-found",
        title: "Resource not found",
        status: 404,
        detail: "Collection was not found.",
        code: "resource_not_found",
      },
      404
    );
    const result = await readValidationMessage(response);
    expect(result).toBe("Collection was not found.");
  });

  it("returns detail over errors when both are absent — detail only", async () => {
    const response = makeResponse(
      { detail: "Item was not found." },
      404
    );
    const result = await readValidationMessage(response);
    expect(result).toBe("Item was not found.");
  });

  it("prefers errors over detail when both fields are present", async () => {
    const response = makeResponse({
      errors: { Name: ["Name is required."] },
      detail: "Validation failed.",
    });
    const result = await readValidationMessage(response);
    expect(result).toBe("Name is required.");
  });
});
