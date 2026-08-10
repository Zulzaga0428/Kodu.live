FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace config first
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY pnpm-lock.yaml ./

# Install dependencies (no frozen lockfile for Railway compatibility)
COPY . .
RUN pnpm install --no-frozen-lockfile

# Build API server
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
