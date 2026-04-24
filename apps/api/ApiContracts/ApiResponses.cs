using FluentValidation;

namespace CurateDS.Api.ApiContracts;

internal static class ApiResponses
{
    public static IResult Validation(ValidationException exception)
    {
        return Results.ValidationProblem(exception.Errors
            .GroupBy(error => error.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.ErrorMessage).ToArray()));
    }

    public static IResult Conflict(string fieldName, string message)
    {
        return Results.ValidationProblem(
            new Dictionary<string, string[]>
            {
                [fieldName] = [message]
            },
            statusCode: StatusCodes.Status409Conflict);
    }

    public static IResult NotFound(string detail)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Resource not found",
            detail: detail);
    }
}
