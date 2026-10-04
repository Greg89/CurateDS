FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["CurateDS.sln", "./"]
COPY ["Directory.Build.props", "./"]
COPY ["global.json", "./"]
COPY ["packages/domain/CurateDS.Domain.csproj", "packages/domain/"]
COPY ["packages/application/CurateDS.Application.csproj", "packages/application/"]
COPY ["packages/infrastructure/CurateDS.Infrastructure.csproj", "packages/infrastructure/"]
COPY ["apps/api/CurateDS.Api.csproj", "apps/api/"]

RUN dotnet restore "apps/api/CurateDS.Api.csproj"

COPY packages ./packages
COPY apps/api ./apps/api

RUN dotnet publish "apps/api/CurateDS.Api.csproj" -c Release -o /app/publish --use-current-runtime --no-self-contained /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

RUN chown -R $APP_UID /app
USER $APP_UID

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl --fail --silent --output /dev/null --max-time 4 http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["dotnet", "CurateDS.Api.dll"]
