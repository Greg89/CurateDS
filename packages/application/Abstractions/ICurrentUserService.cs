namespace CurateDS.Application.Abstractions;

/// <summary>
/// Provides the identity of the currently authenticated user for audit stamping.
/// Returns the Auth0 subject claim (sub) or a fallback sentinel when no user context is available.
/// </summary>
public interface ICurrentUserService
{
    string GetCurrentUser();
}
