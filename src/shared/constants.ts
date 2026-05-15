export const WORLD_SIZE = 24;
export const HALF_WORLD_SIZE = WORLD_SIZE / 2;
export const BLOCK_SIZE = 1;
export const TICK_RATE = 20;
export const PLAYER_SPEED = 5.5;
export const JUMP_VELOCITY = 7.5;
export const GRAVITY = 22;
export const MAX_CHAT_LENGTH = 180;
export const DEFAULT_SERVER_URL = 'ws://localhost:8080';

export const BLOCK_TYPES = ['grass', 'dirt', 'stone', 'glow'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
