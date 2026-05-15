import type { BlockType } from './constants.js';

export type Vec3 = { x: number; y: number; z: number };

export type Block = Vec3 & { type: BlockType };

export type PlayerSnapshot = {
  id: string;
  name: string;
  position: Vec3;
  rotationY: number;
  color: string;
};

export type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  createdAt: number;
};

export type ClientMessage =
  | { type: 'join'; name: string; color: string }
  | { type: 'input'; position: Vec3; rotationY: number }
  | { type: 'placeBlock'; block: Block }
  | { type: 'removeBlock'; position: Vec3 }
  | { type: 'chat'; text: string };

export type ServerMessage =
  | { type: 'welcome'; playerId: string; world: Block[]; players: PlayerSnapshot[]; chat: ChatMessage[] }
  | { type: 'snapshot'; players: PlayerSnapshot[]; world: Block[] }
  | { type: 'playerJoined'; player: PlayerSnapshot }
  | { type: 'playerLeft'; playerId: string }
  | { type: 'blockPlaced'; block: Block }
  | { type: 'blockRemoved'; position: Vec3 }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'error'; message: string };
