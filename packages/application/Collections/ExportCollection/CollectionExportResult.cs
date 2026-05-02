namespace CurateDS.Application.Collections.ExportCollection;

public sealed record CollectionExportResult(byte[] ZipBytes, string FileName);
