# Gods.io

Gods.io is a web-first multiplayer block-world prototype built with Three.js, TypeScript, and a small authoritative WebSocket server.

## MVP features

- Third-person avatar controller with WASD movement and jumping.
- Simple block-based world generated from shared game code.
- Mouse-driven block placement and removal.
- Avatar spawning and remote player synchronization over WebSockets.
- Basic realm chat with recent message history.
- Shared schemas, constants, and world helpers for client/server parity.

## Project structure

```text
src/client/   Three.js rendering, controls, UI, local player state, and WebSocket client
src/server/   Authoritative multiplayer state, world edits, chat, and snapshot broadcasting
src/shared/   Constants, message types, validation, and world generation helpers
assets/       Placeholder folders for textures, avatars, and sounds
tests/        Unit tests for shared simulation utilities
```

## Local development

This scaffold intentionally uses Node.js built-ins plus a browser import map for Three.js, so there are no package dependencies to install.

Build once before serving static output:

```bash
npm run build
```

Start the multiplayer server in one terminal:

```bash
npm run server
```

Start the web client in another terminal:

```bash
npm run dev
```

Open <http://localhost:5173>. Open multiple browser tabs to test multiplayer synchronization locally.

## Gameplay controls

- `W`, `A`, `S`, `D`: move the avatar.
- `Space`: jump.
- `Mouse click`: place the selected block on the targeted face.
- `Shift + mouse click`: remove the targeted block above the base layer.
- `1`-`4`: switch between grass, dirt, stone, and glow blocks.
- Chat panel: send short messages to connected players.

## Scripts

- `npm run dev` starts a tiny local static server with TypeScript watch mode.
- `npm run build` type-checks and copies static client assets into `dist/`.
- `npm run server` starts the WebSocket server on `ws://localhost:8080`.
- `npm test` runs the Node.js test suite for shared world helpers.

## Configuration

- Set `PORT=9000 npm run server` to change the WebSocket server port.
- Set `VITE_WS_URL=ws://localhost:9000 npm run dev` to point the client at a different server URL.
