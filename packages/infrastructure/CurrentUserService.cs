using System.Security.Claims;
using CurateDS.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace CurateDS.Infrastructure;

/// <summary>
/// Resolves the current user identity from the Auth0 JWT sub claim on the active HTTP request.
/// Falls back to "system" when no user context is present (e.g., background jobs, migrations).
/// </summary>
public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string GetCurrentUser()
    {
        return _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? "system";
    }
}
