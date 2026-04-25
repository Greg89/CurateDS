# API Contracts

CurateDS uses explicit resource DTOs for successful responses and Problem Details for errors.

## Success Responses

Successful responses should return resource-specific DTOs rather than a universal envelope.

Examples:

- `CollectionResponse`
- `AttributeDefinitionResponse`
- `TagResponse`
- `LocationResponse`
- `ItemSummaryResponse`
- `ItemDetailResponse`

This keeps successful responses simple for the web client and avoids wrapping every payload in a redundant `data` container.

## Error Responses

Errors should use RFC 7807 Problem Details shapes.

Current contract rules:

- validation failures: `ValidationProblemDetails`
- conflict failures: `ValidationProblemDetails` with `409 Conflict`
- missing resources: `ProblemDetails` with `404 Not Found`
- unexpected server failures: framework-generated `ProblemDetails`

Current standardized fields:

- `type`: stable app-specific problem identifier
- `title`: short human-readable summary
- `status`: HTTP status code
- `detail`: human-readable detail when applicable
- `code`: compact app-specific error code in `extensions`

The goal is that clients can always expect structured error payloads instead of empty `404` responses or ad hoc error objects.

Current problem types and codes:

- validation: `type = "urn:curateds:problem:validation"`, `code = "validation_error"`
- conflict: `type = "urn:curateds:problem:conflict"`, default `code = "conflict"`
- not found: `type = "urn:curateds:problem:not-found"`, default `code = "resource_not_found"`

## Recommended Status Codes

- `200 OK`: successful read/update
- `201 Created`: successful create
- `400 Bad Request`: request validation failure
- `404 Not Found`: referenced resource does not exist
- `409 Conflict`: uniqueness or conflicting state
- `500 Internal Server Error`: unexpected failure

## Future Pagination Contract

When collection item listing is refactored for scalable querying, paged endpoints should return a dedicated paged DTO instead of an all-purpose envelope.

Suggested shape:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 25,
  "totalCount": 0
}
```

## Decision Summary

- do standardize error contracts strongly
- do not add a universal success envelope right now
- add shared response helpers where it reduces duplication
- introduce dedicated paged DTOs when list endpoints become paginated
