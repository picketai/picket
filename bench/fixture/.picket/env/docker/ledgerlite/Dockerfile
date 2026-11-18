FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --loglevel=error
COPY tsconfig.json ./
COPY src ./src
COPY data ./data
COPY .picket/env/docker/ledgerlite/config.json ./data/config.json
RUN npx tsc -p tsconfig.json
EXPOSE 8080
CMD ["node", "dist/src/main.js"]
