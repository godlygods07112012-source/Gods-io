import { HALF_WORLD_SIZE, WORLD_SIZE, type BlockType } from './constants.js';
import type { Block, Vec3 } from './types.js';

const key = (position: Vec3) => `${position.x},${position.y},${position.z}`;

export function blockKey(position: Vec3): string {
  return key(position);
}

export function generateFlatWorld(): Block[] {
  const blocks: Block[] = [];
  for (let x = -HALF_WORLD_SIZE; x < HALF_WORLD_SIZE; x += 1) {
    for (let z = -HALF_WORLD_SIZE; z < HALF_WORLD_SIZE; z += 1) {
      const checker = (x + z) % 7 === 0;
      blocks.push({ x, y: 0, z, type: checker ? 'stone' : 'grass' });
      if (Math.abs(x) === HALF_WORLD_SIZE - 1 || Math.abs(z) === HALF_WORLD_SIZE - 1) {
        blocks.push({ x, y: 1, z, type: 'dirt' });
      }
    }
  }
  blocks.push({ x: 2, y: 1, z: 2, type: 'glow' });
  return blocks;
}

export function setBlock(world: Map<string, Block>, block: Block): void {
  world.set(key(block), block);
}

export function removeBlock(world: Map<string, Block>, position: Vec3): boolean {
  return world.delete(key(position));
}

export function clampBlockPosition(position: Vec3): Vec3 {
  return {
    x: Math.max(-HALF_WORLD_SIZE, Math.min(HALF_WORLD_SIZE - 1, Math.round(position.x))),
    y: Math.max(0, Math.min(12, Math.round(position.y))),
    z: Math.max(-HALF_WORLD_SIZE, Math.min(HALF_WORLD_SIZE - 1, Math.round(position.z))),
  };
}

export function isBlockType(value: string): value is BlockType {
  return ['grass', 'dirt', 'stone', 'glow'].includes(value);
}
