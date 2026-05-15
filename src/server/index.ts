import { MAX_CHAT_LENGTH, TICK_RATE } from '../shared/constants.js';
import { parseClientMessage } from '../shared/messages.js';
import type { Block, ChatMessage, PlayerSnapshot, ServerMessage, Vec3 } from '../shared/types.js';
import { blockKey, clampBlockPosition, generateFlatWorld, removeBlock, setBlock } from '../shared/world.js';
import { TinyWebSocketServer, type SocketClient } from './socket.js';

const port = Number(process.env.PORT ?? 8080);
const world = new Map<string, Block>(generateFlatWorld().map((block) => [blockKey(block), block]));
const players = new Map<SocketClient, PlayerSnapshot>();
const recentChat: ChatMessage[] = [];

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function send(socket: SocketClient, message: ServerMessage): void {
  if (socket.readyState === 'open') socket.send(JSON.stringify(message));
}

function broadcast(message: ServerMessage): void {
  for (const client of players.keys()) send(client, message);
}

function spawnPoint(): Vec3 {
  const offset = players.size % 8;
  return { x: -3 + offset, y: 2, z: -3 + Math.floor(players.size / 8) };
}

const server = new TinyWebSocketServer(port);

server.onConnection((socket) => {
  socket.onMessage((raw) => {
    const message = parseClientMessage(raw);
    if (!message) {
      send(socket, { type: 'error', message: 'Malformed client message.' });
      return;
    }

    if (message.type === 'join') {
      const existing = players.get(socket);
      if (existing) {
        existing.name = message.name;
        existing.color = message.color;
        return;
      }
      const player: PlayerSnapshot = {
        id: id('player'),
        name: message.name,
        color: message.color,
        position: spawnPoint(),
        rotationY: 0,
      };
      players.set(socket, player);
      send(socket, { type: 'welcome', playerId: player.id, world: [...world.values()], players: [...players.values()], chat: recentChat });
      broadcast({ type: 'playerJoined', player });
      return;
    }

    const player = players.get(socket);
    if (!player) {
      send(socket, { type: 'error', message: 'Join before sending gameplay messages.' });
      return;
    }

    if (message.type === 'input') {
      player.position = message.position;
      player.rotationY = message.rotationY;
      return;
    }
    if (message.type === 'placeBlock') {
      const block = { ...clampBlockPosition(message.block), type: message.block.type };
      setBlock(world, block);
      broadcast({ type: 'blockPlaced', block });
      return;
    }
    if (message.type === 'removeBlock') {
      const position = clampBlockPosition(message.position);
      if (position.y > 0 && removeBlock(world, position)) broadcast({ type: 'blockRemoved', position });
      return;
    }
    if (message.type === 'chat') {
      const chatMessage: ChatMessage = {
        id: id('chat'),
        playerId: player.id,
        playerName: player.name,
        text: message.text.slice(0, MAX_CHAT_LENGTH),
        createdAt: Date.now(),
      };
      recentChat.push(chatMessage);
      recentChat.splice(0, Math.max(0, recentChat.length - 50));
      broadcast({ type: 'chat', message: chatMessage });
    }
  });

  socket.onClose(() => {
    const player = players.get(socket);
    players.delete(socket);
    if (player) broadcast({ type: 'playerLeft', playerId: player.id });
  });
});

setInterval(() => {
  broadcast({ type: 'snapshot', players: [...players.values()], world: [...world.values()] });
}, 1000 / TICK_RATE);

server.listen(() => console.log(`Gods.io server listening on ws://localhost:${port}`));
