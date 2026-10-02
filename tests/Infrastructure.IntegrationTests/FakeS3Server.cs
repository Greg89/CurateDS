using System.Collections.Concurrent;
using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CurateDS.Infrastructure.IntegrationTests;

internal sealed class FakeS3Server : IAsyncDisposable
{
    private readonly WebApplication _app;
    private readonly ConcurrentQueue<Exception> _handlerFailures = new();
    public ConcurrentQueue<RequestSnapshot> Requests { get; } = new();
    public string BaseUrl { get; private set; } = "";

    private FakeS3Server(WebApplication app) => _app = app;

    public static async Task<FakeS3Server> StartAsync(Func<HttpContext, RequestSnapshot, Task> handler)
    {
        var builder = WebApplication.CreateSlimBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Testing",
            Args = []
        });
        builder.Logging.ClearProviders();
        // Bind port zero directly: no probe/release race or Windows HTTP.sys registration.
        builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, 0));
        var server = new FakeS3Server(builder.Build());
        server._app.Run(async context =>
        {
            try
            {
                var snapshot = await RequestSnapshot.CaptureAsync(context.Request);
                server.Requests.Enqueue(snapshot);
                await handler(context, snapshot);
            }
            catch (Exception exception)
            {
                server._handlerFailures.Enqueue(exception);
                throw;
            }
        });
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await server._app.StartAsync(timeout.Token);
            server.BaseUrl = server._app.Services.GetRequiredService<IServer>()
                .Features.Get<IServerAddressesFeature>()!.Addresses.Single().TrimEnd('/');
            return server;
        }
        catch
        {
            await server._app.DisposeAsync();
            throw;
        }
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await _app.StopAsync(timeout.Token);
        }
        finally
        {
            await _app.DisposeAsync();
        }
        if (!_handlerFailures.IsEmpty)
        {
            throw new AggregateException("Fake S3 request handler failed.", _handlerFailures);
        }
    }

    internal sealed record RequestSnapshot(string HttpMethod, string AbsolutePath,
        long? ContentLength, Dictionary<string, string> Headers, byte[] Body)
    {
        public static async Task<RequestSnapshot> CaptureAsync(HttpRequest request)
        {
            using var body = new MemoryStream();
            await request.Body.CopyToAsync(body, request.HttpContext.RequestAborted);
            return new RequestSnapshot(request.Method, request.Path.Value ?? "", request.ContentLength,
                request.Headers.ToDictionary(header => header.Key, header => header.Value.ToString(),
                    StringComparer.OrdinalIgnoreCase), body.ToArray());
        }
    }
}
