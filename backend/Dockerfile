FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --workspace backend --include-workspace-root=false
COPY backend ./backend
RUN npm run build -w backend

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --chown=node:node backend/entrypoint.sh ./backend/entrypoint.sh
USER node
EXPOSE 3000
CMD ["sh", "backend/entrypoint.sh"]
