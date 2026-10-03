# Development-only MinIO build from its final published security release.
# Source and license: https://github.com/minio/minio/tree/RELEASE.2025-10-15T17-29-55Z
FROM golang:1.24.8-alpine AS build
RUN CGO_ENABLED=0 go install github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z

FROM alpine:3.22
RUN apk add --no-cache ca-certificates && addgroup -g 10001 storage && adduser -D -u 10001 -G storage storage && mkdir /data && chown storage:storage /data
COPY --from=build /go/bin/minio /usr/local/bin/minio
COPY --from=build /go/pkg/mod/github.com/minio/minio@*/LICENSE /usr/share/licenses/minio/LICENSE
USER storage
EXPOSE 9000
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
