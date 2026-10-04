# Run from any directory with Docker and the repository's .NET SDK available.
param([string]$Runtime = '')
$ErrorActionPreference = 'Stop'
$containerName = 'curateds-transaction-tests-' + [Guid]::NewGuid().ToString('N')
$testPassword = [Guid]::NewGuid().ToString('N')
$previousConnection = $env:CURATEDS_TEST_POSTGRES
$projectPath = Join-Path $PSScriptRoot 'CurateDS.Infrastructure.IntegrationTests.csproj'
$started = $false
try {
    # Match compose.yaml, bind only to loopback, and let Docker allocate an unused port.
    docker run --detach --rm --name $containerName --publish '127.0.0.1::5432' `
        --env "POSTGRES_PASSWORD=$testPassword" postgres:17-alpine
    if ($LASTEXITCODE -ne 0) { throw 'Could not start the PostgreSQL test container.' }
    $started = $true

    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        docker exec $containerName pg_isready -h 127.0.0.1 -U postgres *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'PostgreSQL did not become ready within 60 seconds.' }

    $binding = docker port $containerName 5432/tcp
    if ($LASTEXITCODE -ne 0 -or $binding -notmatch '^127\.0\.0\.1:(\d+)$') {
        throw 'Could not resolve the PostgreSQL test port.'
    }
    $env:CURATEDS_TEST_POSTGRES = "Host=127.0.0.1;Port=$($Matches[1]);Username=postgres;Password=$testPassword;Database=postgres"
    Write-Host 'Running infrastructure tests with PostgreSQL 17 and repository migrations.'
    $testArguments = @('test', $projectPath, '--no-restore', '--verbosity', 'minimal')
    if ($Runtime) { $testArguments += @('--runtime', $Runtime) }
    dotnet @testArguments
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL infrastructure tests failed.' }
} finally {
    $env:CURATEDS_TEST_POSTGRES = $previousConnection
    if ($started) {
        docker stop $containerName | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Warning "Could not stop test container $containerName" }
    }
}
