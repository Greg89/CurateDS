using System.Reflection;

namespace CurateDS.Api.Configuration;

internal static class AssemblyVersion
{
    public static string Resolve()
    {
        var assembly = Assembly.GetEntryAssembly();
        return assembly?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
            ?? assembly?.GetName().Version?.ToString()
            ?? "unknown";
    }
}
