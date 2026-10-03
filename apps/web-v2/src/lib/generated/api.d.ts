export interface paths {
    "/collections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CollectionResponse"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateCollectionRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CollectionResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/{collectionId}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CollectionSummaryResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/{collectionId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    SearchText?: string;
                    LocationId?: string;
                    TagIds?: string[];
                    AttributeFilters?: string[];
                    SortBy?: string;
                    SortDirection?: string;
                    Page?: number | string;
                    PageSize?: number | string;
                    MinQuantity?: number | string;
                    MaxQuantity?: number | string;
                    CreatedAfter?: string;
                    CreatedBefore?: string;
                    HasNoLocation?: boolean;
                    HasNoTags?: boolean;
                    ItemTypeId?: string;
                    TagMatchMode?: string;
                };
                header?: never;
                path: {
                    collectionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PagedItemsResponse"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateItemRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ItemDetailResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/{collectionId}/items/{itemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ItemDetailResponse"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateItemRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ItemDetailResponse"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/{collectionId}/attribute-definitions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AttributeDefinitionResponse"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/{collectionId}/item-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ItemTypeResponse"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagResponse"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/locations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LocationResponse"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/{collectionId}/items/{itemId}/media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MediaAssetDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/{collectionId}/items/{itemId}/media/{mediaAssetId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                    itemId: string;
                    mediaAssetId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/{collectionId}/items/{itemId}/media/{mediaAssetId}/primary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    collectionId: string;
                    itemId: string;
                    mediaAssetId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        CollectionResponse: {
            /** Format: uuid */
            id: string;
            name: string;
            /** Format: date-time */
            createdUtc: string;
            category?: null | string;
            description?: null | string;
            coverImageUrl?: null | string;
            color?: null | string;
        };
        CreateCollectionRequest: {
            name: string;
            category?: null | string;
            description?: null | string;
            coverImageUrl?: null | string;
            color?: null | string;
        };
        CollectionSummaryResponse: {
            /** Format: uuid */
            collectionId: string;
            /** Format: int32 */
            totalItems: number | string;
            /** Format: int32 */
            totalAttributeDefinitions: number | string;
            /** Format: int32 */
            tagsUsed: number | string;
            /** Format: int32 */
            locationsUsed: number | string;
            /** Format: int32 */
            itemsWithNoLocation: number | string;
            /** Format: int32 */
            itemsWithNoTags: number | string;
            /** Format: int32 */
            totalMediaAssets: number | string;
        };
        PagedItemsResponse: {
            items: components["schemas"]["ItemSummaryResponse"][];
            /** Format: int32 */
            totalCount: number | string;
            /** Format: int32 */
            page: number | string;
            /** Format: int32 */
            pageSize: number | string;
            /** Format: int32 */
            totalPages: number | string;
        };
        ItemSummaryResponse: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            collectionId: string;
            name: string;
            description: null | string;
            /** Format: int32 */
            quantity: number | string;
            /** Format: uuid */
            locationId: null | string;
            locationName: null | string;
            tags: string[];
            /** Format: int32 */
            attributeValueCount: number | string;
            /** Format: date-time */
            createdUtc: string;
            /** Format: date-time */
            updatedUtc: null | string;
            primaryImageUrl: null | string;
        };
        CreateItemRequest: {
            name: string;
            description: null | string;
            /** Format: int32 */
            quantity: number | string;
            /** Format: uuid */
            locationId: null | string;
            /** Format: uuid */
            itemTypeId: null | string;
            tagIds: string[];
            attributeValues: components["schemas"]["CreateItemAttributeValueRequest"][];
        };
        CreateItemAttributeValueRequest: {
            /** Format: uuid */
            attributeDefinitionId: string;
            value: string;
        };
        ItemDetailResponse: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            collectionId: string;
            name: string;
            description: null | string;
            /** Format: int32 */
            quantity: number | string;
            /** Format: uuid */
            locationId: null | string;
            locationName: null | string;
            /** Format: uuid */
            itemTypeId: null | string;
            tags: components["schemas"]["TagResponse"][];
            /** Format: date-time */
            createdUtc: string;
            /** Format: date-time */
            updatedUtc: null | string;
            attributeValues: components["schemas"]["ItemAttributeValueResponse"][];
            mediaAssets: components["schemas"]["MediaAssetResponse"][];
        };
        TagResponse: {
            /** Format: uuid */
            id: string;
            name: string;
            key: string;
            /** Format: date-time */
            createdUtc: string;
        };
        ItemAttributeValueResponse: {
            /** Format: uuid */
            attributeDefinitionId: string;
            attributeName: string;
            attributeKey: string;
            dataType: components["schemas"]["AttributeDataType"];
            value: string;
        };
        /** @enum {unknown} */
        AttributeDataType: "Text" | "Number" | "Decimal" | "Boolean" | "Date" | "SingleSelect";
        MediaAssetResponse: {
            /** Format: uuid */
            id: string;
            url: string;
            contentType: string;
            fileName: string;
            /** Format: int64 */
            sizeBytes: number | string;
            isPrimary: boolean;
            /** Format: date-time */
            uploadedUtc: string;
        };
        UpdateItemRequest: {
            name: string;
            description: null | string;
            /** Format: int32 */
            quantity: number | string;
            /** Format: uuid */
            locationId: null | string;
            /** Format: uuid */
            itemTypeId: null | string;
            tagIds: string[];
            attributeValues: components["schemas"]["CreateItemAttributeValueRequest"][];
        };
        AttributeDefinitionResponse: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            collectionId: string;
            name: string;
            key: string;
            dataType: components["schemas"]["AttributeDataType"];
            isRequired: boolean;
            isFilterable: boolean;
            /** Format: int32 */
            sortOrder: number | string;
            /** Format: uuid */
            itemTypeId: null | string;
            /** Format: date-time */
            createdUtc: string;
        };
        ItemTypeResponse: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            collectionId: string;
            name: string;
            /** Format: int32 */
            sortOrder: number | string;
            /** Format: date-time */
            createdUtc: string;
        };
        LocationResponse: {
            /** Format: uuid */
            id: string;
            name: string;
            description: null | string;
            /** Format: date-time */
            createdUtc: string;
        };
        /** Format: binary */
        IFormFile: string;
        MediaAssetDto: {
            /** Format: uuid */
            id: string;
            url: string;
            contentType: string;
            fileName: string;
            /** Format: int64 */
            sizeBytes: number | string;
            isPrimary: boolean;
            /** Format: date-time */
            uploadedUtc: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
