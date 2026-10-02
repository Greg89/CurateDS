FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web-v2/package.json apps/web-v2/package.json
COPY tests/Web.UnitTests/package.json tests/Web.UnitTests/package.json
COPY tests/EndToEndTests/package.json tests/EndToEndTests/package.json
RUN npm ci --ignore-scripts
COPY apps/web-v2 apps/web-v2
RUN npm run build:web-v2

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build --chown=node:node /app/apps/web-v2/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web-v2/.next/static ./apps/web-v2/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web-v2/server.js"]

