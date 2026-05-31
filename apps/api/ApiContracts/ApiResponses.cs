using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace CurateDS.Api.ApiContracts;

internal static class ApiResponses
{
    private const string ValidationType = "urn:curateds:problem:validation";
    private const string ConflictType = "urn:curateds:problem:conflict";
    private const string NotFoundType = "urn:curateds:problem:not-found";

    public static IResult Validation(ValidationException exception)
    {
        var errors = exception.Errors
            .GroupBy(error => error.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.ErrorMessage).ToArray());

        // If any failure carries an explicit ErrorCode, surface the first one as the
        // machine-readable problem code. Falls back to the generic validation_error.
        var code = exception.Errors
            .Select(error => error.ErrorCode)
            .FirstOrDefault(c => !string.IsNullOrWhiteSpace(c)) ?? "validation_error";

        return Validation(errors, code);
    }

    public static IResult Conflict(string fieldName, string message, string code = "conflict")
    {
        return Validation(
            new Dictionary<string, string[]>
            {
                [fieldName] = [message]
            },
            code,
            StatusCodes.Status409Conflict,
            ConflictType,
            "Conflict");
    }

    public static IResult NotFound(string detail, string code = "resource_not_found")
    {
        var problem = new ProblemDetails
        {
            Type = NotFoundType,
            Title = "Resource not found",
            Status = StatusCodes.Status404NotFound,
            Detail = detail
        };

        problem.Extensions["code"] = code;

        return Results.Json(
            problem,
            contentType: "application/problem+json",
            statusCode: problem.Status);
    }

    private static IResult Validation(
        IDictionary<string, string[]> errors,
        string code,
        int statusCode = StatusCodes.Status400BadRequest,
        string type = ValidationType,
        string title = "Validation failed")
    {
        var problem = new HttpValidationProblemDetails(errors)
        {
            Type = type,
            Title = title,
            Status = statusCode
        };

        problem.Extensions["code"] = code;

        return Results.Json(
            problem,
            contentType: "application/problem+json",
            statusCode: problem.Status);
    }
}
