using System.Text;
using Amazon.S3;
using CurateDS.Infrastructure.Storage;
using FluentAssertions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace CurateDS.Infrastructure.IntegrationTests;

/// <summary>
/// In-process tests that point the AWS SDK at a tiny Kestrel-backed fake
/// S3 endpoint. This lets us assert the wire-level behaviour of UploadAsync —
/// specifically the Railway/MinIO compatibility fixes (no chunked encoding,
/// fixed Content-Length, HTTP payload signing) — without needing a real MinIO.
/// </summary>
public sealed class MinioMediaStorageServiceTests
{
    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
    }

    private static MinioMediaStorageService CreateService(string endpoint, string environment = "Development")
    {
        var options = Options.Create(new MediaStorageOptions
        {
            Endpoint = endpoint,
            AccessKey = "test-access-key",
            SecretKey = "test-secret-key",
            BucketName = "test-bucket",
            EnablePublicReadPolicy = true
        });
        return new MinioMediaStorageService(options, new FakeHostEnvironment { EnvironmentName = environment });
    }

    [Fact]
    public async Task ReadAsync_ShouldReadPrivateObjectAndBoundItsLength()
    {
        await using var server = await FakeS3Server.StartAsync(async (ctx, _) =>
        {
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentLength = 4;
            await ctx.Response.Body.WriteAsync(new byte[] { 1, 2, 3, 4 });
        });
        var sut = CreateService(server.BaseUrl);
        (await sut.ReadAsync("private.png", 4, default)).Should().Equal(1, 2, 3, 4);
        Func<Task> tooLarge = () => sut.ReadAsync("private.png", 3, default);
        await tooLarge.Should().ThrowAsync<InvalidDataException>();
    }

    [Fact]
    public async Task ReadAsync_ShouldReturnNullOnlyForMissingObject()
    {
        await using var server = await FakeS3Server.StartAsync(async (ctx, _) =>
        {
            ctx.Response.StatusCode = 404;
            var xml = Encoding.UTF8.GetBytes("<Error><Code>NoSuchKey</Code><Message>Missing</Message></Error>");
            ctx.Response.ContentType = "application/xml";
            await ctx.Response.Body.WriteAsync(xml);
        });
        (await CreateService(server.BaseUrl).ReadAsync("missing.png", 4, default)).Should().BeNull();
    }

    // ---------- UploadAsync ----------

    [Fact]
    public async Task UploadAsync_ShouldReturnKeyWithEnvironmentCollectionItemAndExtension()
    {
        await using var server = await FakeS3Server.StartAsync((ctx, _) =>
        {
            ctx.Response.StatusCode = 200;
            ctx.Response.Headers["ETag"] = "\"deadbeef\"";

            return Task.CompletedTask;
        });

        var sut = CreateService(server.BaseUrl, environment: "Production");
        var collectionId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var content = new MemoryStream(Encoding.UTF8.GetBytes("hello"));

        var key = await sut.UploadAsync(collectionId, itemId, content, "image/jpeg", "jpg", CancellationToken.None);

        key.Should().StartWith($"Production/collections/{collectionId}/items/{itemId}/");
        key.Should().EndWith(".jpg");
    }

    [Fact]
    public async Task UploadAsync_ShouldTrimLeadingDotFromFileExtension()
    {
        await using var server = await FakeS3Server.StartAsync((ctx, _) =>
        {
            ctx.Response.StatusCode = 200;

            return Task.CompletedTask;
        });

        var sut = CreateService(server.BaseUrl);
        var content = new MemoryStream(new byte[] { 1, 2, 3 });

        var key = await sut.UploadAsync(Guid.NewGuid(), Guid.NewGuid(), content, "image/png", ".png", CancellationToken.None);

        key.Should().EndWith(".png");
        key.Should().NotContain("..png");
    }

    [Fact]
    public async Task UploadAsync_ShouldSendFixedContentLengthAndNonChunkedBody_OverHttpInternalEndpoint()
    {
        await using var server = await FakeS3Server.StartAsync((ctx, _) =>
        {
            ctx.Response.StatusCode = 200;

            return Task.CompletedTask;
        });

        var sut = CreateService(server.BaseUrl);
        var bytes = Encoding.UTF8.GetBytes("hello-world-payload");
        var content = new MemoryStream(bytes);

        await sut.UploadAsync(Guid.NewGuid(), Guid.NewGuid(), content, "image/jpeg", "jpg", CancellationToken.None);

        var put = server.Requests.Single(r => r.HttpMethod == "PUT");

        // The Railway-proxy fix: never send aws-chunked / Transfer-Encoding: chunked.
        // The SDK must send a single fixed Content-Length PUT.
        put.Headers.Should().NotContainKey("Transfer-Encoding");
        put.ContentLength.Should().Be(bytes.LongLength);

        // Body should be the raw bytes (not aws-chunked framing).
        put.Body.Should().Equal(bytes);

        // Over plain HTTP (the *.railway.internal hostname), payload signing must
        // remain on — the SDK refuses UNSIGNED-PAYLOAD without HTTPS, and we don't
        // need it because there's no edge proxy in the path.
        put.Headers.Should().ContainKey("x-amz-content-sha256");
        put.Headers["x-amz-content-sha256"].Should().NotBe("UNSIGNED-PAYLOAD");
    }

    [Fact]
    public async Task UploadAsync_ShouldReportTransportFailure_WhenHttpsEndpointIsUnavailable()
    {
        // Transport smoke check only: this does not prove the HTTPS signing header.
        // A trusted TLS fixture is still needed for a live UNSIGNED-PAYLOAD assertion.
        var sut = CreateService("https://127.0.0.1:1"); // unreachable port — request will fail at network layer
        var bytes = Encoding.UTF8.GetBytes("x");

        var act = async () => await sut.UploadAsync(
            Guid.NewGuid(), Guid.NewGuid(), new MemoryStream(bytes), "image/jpeg", "jpg", CancellationToken.None);

        var ex = await act.Should().ThrowAsync<Exception>();
        ex.Which.Should().NotBeOfType<Amazon.Runtime.AmazonClientException>(
            because: "an unavailable HTTPS endpoint should fail at the transport layer");
    }

    [Fact]
    public async Task UploadAsync_ShouldBufferNonSeekableStream_AndStillSendFixedContentLength()
    {
        await using var server = await FakeS3Server.StartAsync((ctx, _) =>
        {
            ctx.Response.StatusCode = 200;

            return Task.CompletedTask;
        });

        var sut = CreateService(server.BaseUrl);
        var bytes = Encoding.UTF8.GetBytes("non-seekable-payload-data");
        var content = new NonSeekableStream(bytes);

        await sut.UploadAsync(Guid.NewGuid(), Guid.NewGuid(), content, "image/png", "png", CancellationToken.None);

        var put = server.Requests.Single(r => r.HttpMethod == "PUT");
        put.ContentLength.Should().Be(bytes.LongLength);
        put.Headers.Should().NotContainKey("Transfer-Encoding");
        put.Body.Should().Equal(bytes);
    }

    [Fact]
    public async Task UploadAsync_ShouldPutToBucketAndKeyPath()
    {
        await using var server = await FakeS3Server.StartAsync((ctx, _) =>
        {
            ctx.Response.StatusCode = 200;

            return Task.CompletedTask;
        });

        var sut = CreateService(server.BaseUrl);
        var collectionId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var content = new MemoryStream(new byte[] { 0xAA, 0xBB });

        var key = await sut.UploadAsync(collectionId, itemId, content, "image/jpeg", "jpg", CancellationToken.None);

        var put = server.Requests.Single(r => r.HttpMethod == "PUT");
        put.AbsolutePath.Should().StartWith("/test-bucket/");
        put.AbsolutePath.Should().EndWith("/" + key.Split('/').Last());
        put.AbsolutePath.Should().Contain(collectionId.ToString());
        put.AbsolutePath.Should().Contain(itemId.ToString());
    }

    [Fact]
    public async Task UploadAsync_ShouldKeepConcurrentServerRequestsIsolated()
    {
        await using var first = await FakeS3Server.StartAsync((context, _) =>
        {
            context.Response.StatusCode = 200;
            return Task.CompletedTask;
        });
        await using var second = await FakeS3Server.StartAsync((context, _) =>
        {
            context.Response.StatusCode = 200;
            return Task.CompletedTask;
        });
        first.BaseUrl.Should().NotBe(second.BaseUrl);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        using var firstBody = new MemoryStream(Encoding.UTF8.GetBytes("first payload"));
        using var secondBody = new MemoryStream(Encoding.UTF8.GetBytes("second payload"));

        await Task.WhenAll(
            CreateService(first.BaseUrl).UploadAsync(Guid.NewGuid(), Guid.NewGuid(), firstBody,
                "image/jpeg", "jpg", timeout.Token),
            CreateService(second.BaseUrl).UploadAsync(Guid.NewGuid(), Guid.NewGuid(), secondBody,
                "image/jpeg", "jpg", timeout.Token));

        first.Requests.Should().ContainSingle().Which.Body.Should().Equal(Encoding.UTF8.GetBytes("first payload"));
        second.Requests.Should().ContainSingle().Which.Body.Should().Equal(Encoding.UTF8.GetBytes("second payload"));
    }

    // ---------- DeleteAsync ----------

    [Fact]
    public async Task DeleteAsync_ShouldSwallowNoSuchKey()
    {
        await using var server = await FakeS3Server.StartAsync(async (ctx, _) =>
        {
            ctx.Response.StatusCode = 404;
            var body = Encoding.UTF8.GetBytes(
                "<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>");
            ctx.Response.ContentType = "application/xml";
            ctx.Response.ContentLength = body.Length;
            await ctx.Response.Body.WriteAsync(body);
        });

        var sut = CreateService(server.BaseUrl);

        var act = async () => await sut.DeleteAsync("missing-key", CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeleteAsync_ShouldRethrowOtherS3Errors()
    {
        await using var server = await FakeS3Server.StartAsync(async (ctx, _) =>
        {
            ctx.Response.StatusCode = 403;
            var body = Encoding.UTF8.GetBytes(
                "<Error><Code>AccessDenied</Code><Message>Nope.</Message></Error>");
            ctx.Response.ContentType = "application/xml";
            ctx.Response.ContentLength = body.Length;
            await ctx.Response.Body.WriteAsync(body);
        });

        var sut = CreateService(server.BaseUrl);

        var act = async () => await sut.DeleteAsync("forbidden-key", CancellationToken.None);

        await act.Should().ThrowAsync<AmazonS3Exception>();
    }

    private sealed class NonSeekableStream : Stream
    {
        private readonly MemoryStream _inner;
        public NonSeekableStream(byte[] bytes) => _inner = new MemoryStream(bytes);

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count) => _inner.Read(buffer, offset, count);
        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken ct)
            => _inner.ReadAsync(buffer, offset, count, ct);
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default)
            => _inner.ReadAsync(buffer, ct);

        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing) _inner.Dispose();
            base.Dispose(disposing);
        }
    }
}
