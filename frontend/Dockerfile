FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_BASE is intentionally left unset: nginx (below) reverse-proxies
# /api/* to the backend container on the same origin, so the frontend just
# calls relative paths and there's no cross-origin/CORS setup to maintain.
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
