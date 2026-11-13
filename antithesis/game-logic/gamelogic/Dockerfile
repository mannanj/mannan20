# Build context: the repository root (so the game's real modules in src/components/game are in scope).
FROM node:22-trixie-slim AS build
WORKDIR /src
RUN npm install -g esbuild@0.28.2
COPY src/components/game/ src/components/game/
COPY antithesis/game-logic/gamelogic/ antithesis/game-logic/gamelogic/
# Antithesis instruments JavaScript (CommonJS by default); the source map maps coverage back to the .ts files.
RUN esbuild antithesis/game-logic/gamelogic/server.ts --bundle --platform=node --format=cjs \
      --target=node22 --sourcemap --outfile=/out/server.js

FROM node:22-trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl jq && rm -rf /var/lib/apt/lists/*
WORKDIR /app/gamelogic
COPY --from=build /out/ ./
RUN echo '{"name":"gamelogic","version":"0.0.0","private":true}' > package.json \
 && mkdir -p node_modules /opt/antithesis \
 && ln -s /app/gamelogic /opt/antithesis/catalog
EXPOSE 8080
CMD ["node", "server.js"]
