import { BLOCK_TYPES, MAX_CHAT_LENGTH } from './constants.js';
import type { Block, ClientMessage, Vec3 } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isVec3(value: unknown): value is Vec3 {
  return isRecord(value) && ['x', 'y', 'z'].every((axis) => typeof value[axis] === 'number' && Number.isFinite(value[axis]));
}

function isBlock(value: unknown): value is Block {
  return isVec3(value) && typeof (value as { type?: unknown }).type === 'string' && BLOCK_TYPES.includes((value as Block).type);
}

export function parseClientMessage(raw: string): ClientMessage | undefined {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(data) || typeof data.type !== 'string') return undefined;

  if (data.type === 'join' && typeof data.name === 'string' && typeof data.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.color)) {
    const name = data.name.trim().slice(0, 24);
    return name ? { type: 'join', name, color: data.color } : undefined;
  }
  if (data.type === 'input' && isVec3(data.position) && typeof data.rotationY === 'number' && Number.isFinite(data.rotationY)) {
    return { type: 'input', position: data.position, rotationY: data.rotationY };
  }
  if (data.type === 'placeBlock' && isBlock(data.block)) {
    return { type: 'placeBlock', block: data.block };
  }
  if (data.type === 'removeBlock' && isVec3(data.position)) {
    return { type: 'removeBlock', position: data.position };
  }
  if (data.type === 'chat' && typeof data.text === 'string') {
    const text = data.text.trim().slice(0, MAX_CHAT_LENGTH);
    return text ? { type: 'chat', text } : undefined;
  }
  return undefined;
}
