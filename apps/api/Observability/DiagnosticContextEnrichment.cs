using System.Security.Claims;
using Serilog;

namespace CurateDS.Api.Observability;

internal static class DiagnosticContextEnrichment
{
    /// <summary>
    /// Route parameter names → log property names. Whenever a request matches a
    /// route that has one of these segments, the request log will carry the value.
    /// </summary>
    private static readonly IReadOnlyList<(string RouteName, string LogProperty)> RouteKeys =
    [
        ("collectionId", "CollectionId"),
        ("itemId", "ItemId"),
        ("mediaAssetId", "MediaAssetId"),
        ("attributeDefinitionId", "AttributeDefinitionId"),
        ("locationId", "LocationId"),
        ("tagId", "TagId")
    ];

    public static void Enrich(IDiagnosticContext diagnosticContext, HttpContext httpContext)
    {
        var userId = httpContext.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            diagnosticContext.Set("UserId", userId);
        }

        if (httpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var correlationId)
            && correlationId is string correlationIdValue)
        {
            diagnosticContext.Set("CorrelationId", correlationIdValue);
        }

        diagnosticContext.Set("ClientIp", httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());

        var endpoint = httpContext.GetEndpoint();
        if (endpoint is Microsoft.AspNetCore.Routing.RouteEndpoint routeEndpoint)
        {
            var feature = $"{httpContext.Request.Method} /{routeEndpoint.RoutePattern.RawText?.TrimStart('/')}";
            diagnosticContext.Set("Feature", feature);
        }

        var routeValues = httpContext.Request.RouteValues;
        foreach (var routeKey in RouteKeys)
        {
            if (routeValues.TryGetValue(routeKey.RouteName, out var raw)
                && raw is not null
                && !string.IsNullOrWhiteSpace(raw.ToString()))
            {
                diagnosticContext.Set(routeKey.LogProperty, raw.ToString()!);
            }
        }
    }
}
