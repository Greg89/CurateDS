using CurateDS.Api.Observability;
using Serilog;
using Serilog.Formatting.Compact;

namespace CurateDS.Api.Configuration;

internal static class SerilogConfiguration
{
    public static WebApplicationBuilder AddCurateDsSerilog(this WebApplicationBuilder builder, string serviceVersion)
    {
        builder.Host.UseSerilog((context, services, configuration) =>
        {
            configuration
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext()
                .Enrich.WithMachineName()
                .Enrich.WithEnvironmentName()
                .Enrich.WithThreadId()
                .Enrich.WithProperty("Service", "catalog-api")
                .Enrich.WithProperty("Version", serviceVersion)
                .WriteTo.Console(new RenderedCompactJsonFormatter());

            var seqUrl = context.Configuration["Serilog:SeqUrl"];
            var seqApiKey = context.Configuration["Serilog:SeqApiKey"];

            if (!string.IsNullOrWhiteSpace(seqUrl))
            {
                configuration.WriteTo.Seq(seqUrl, apiKey: seqApiKey);
            }
        });

        return builder;
    }

    public static void LogStartupBanner(this WebApplication app, string serviceVersion)
    {
        app.Logger.LogInformation(
            "CurateDS API starting. Environment={Environment} Version={Version} SeqConfigured={SeqConfigured}",
            app.Environment.EnvironmentName,
            serviceVersion,
            !string.IsNullOrWhiteSpace(app.Configuration["Serilog:SeqUrl"]));
    }
}
