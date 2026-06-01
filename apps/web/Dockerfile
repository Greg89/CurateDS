FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY tests/Web.UnitTests/package.json tests/Web.UnitTests/package.json
COPY tests/EndToEndTests/package.json tests/EndToEndTests/package.json

RUN npm ci

COPY apps/web ./apps/web

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_AUTH0_DOMAIN=""
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN

ARG VITE_AUTH0_CLIENT_ID=""
ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID

ARG VITE_AUTH0_AUDIENCE=""
ENV VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE

RUN npm run build --workspace @curateds/web

FROM nginx:1.31-alpine AS final
# Cache-busting ARG: forces the apk upgrade layer to re-run on every build so
# we always pick up the latest Alpine security patches (e.g. libxml2 fixes)
# rather than reusing a stale layer from the GHA Docker build cache.
ARG APK_UPGRADE_CACHEBUST=1
RUN echo "cachebust=${APK_UPGRADE_CACHEBUST}" \
    && apk update \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:8080/ || exit 1
