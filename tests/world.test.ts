import test from 'node:test';
import assert from 'node:assert/strict';
import { HALF_WORLD_SIZE, WORLD_SIZE } from '../src/shared/constants.js';
import { blockKey, clampBlockPosition, generateFlatWorld, removeBlock, setBlock } from '../src/shared/world.js';

test('generates a playable flat world with border blocks', () => {
  const world = generateFlatWorld();
  assert.ok(world.length > WORLD_SIZE * WORLD_SIZE);
  assert.ok(world.some((block) => block.type === 'glow'));
});

test('clamps edits to the authored world bounds', () => {
  assert.deepEqual(clampBlockPosition({ x: 999, y: -2, z: -999 }), {
    x: HALF_WORLD_SIZE - 1,
    y: 0,
    z: -HALF_WORLD_SIZE,
  });
});

test('sets and removes blocks by stable keys', () => {
  const map = new Map();
  const block = { x: 1, y: 2, z: 3, type: 'grass' as const };
  setBlock(map, block);
  assert.deepEqual(map.get(blockKey(block)), block);
  assert.equal(removeBlock(map, block), true);
  assert.equal(map.size, 0);
});
