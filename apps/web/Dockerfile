FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY tests/Web.UnitTests/package.json tests/Web.UnitTests/package.json
COPY tests/EndToEndTests/package.json tests/EndToEndTests/package.json

RUN npm ci

COPY apps/web ./apps/web

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build --workspace @curateds/web

FROM nginx:1.27-alpine AS final
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
