using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace CurateDS.Api.Configuration;

internal static class AuthenticationConfiguration
{
    public static IServiceCollection AddCurateDsAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var auth0Domain = configuration["Auth0:Domain"] ?? string.Empty;
        var auth0Audience = configuration["Auth0:Audience"] ?? string.Empty;

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = $"https://{auth0Domain}/";
                options.Audience = auth0Audience;
            });

        services.AddAuthorization();

        return services;
    }
}
