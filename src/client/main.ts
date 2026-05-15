import './style.css';
import * as THREE from 'three';
import { BLOCK_SIZE, BLOCK_TYPES, GRAVITY, JUMP_VELOCITY, PLAYER_SPEED } from '../shared/constants.js';
import type { Block, ChatMessage, PlayerSnapshot, Vec3 } from '../shared/types.js';
import { blockKey, clampBlockPosition } from '../shared/world.js';
import { GameSocket } from './network.js';

type RemoteAvatar = { mesh: THREE.Mesh; label: HTMLDivElement };

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app');

app.innerHTML = `
  <div class="hud">
    <section class="panel status">
      <h1>Gods.io</h1>
      <p id="connection">Connecting multiplayer...</p>
      <p>WASD move · Space jump · Click place · Shift+Click remove</p>
      <p>Selected block: <strong id="blockType">grass</strong> (press 1-4)</p>
    </section>
    <div class="crosshair"></div>
    <section class="panel chat">
      <div id="messages" class="messages"></div>
      <form id="chatForm"><input id="chatInput" maxlength="180" placeholder="Send a realm message..." /><button>Send</button></form>
    </section>
  </div>`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 18, 60);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.prepend(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xdbeafe, 0x334155, 1.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(8, 16, 8);
sun.castShadow = true;
scene.add(sun);

const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
const blockMaterials: Record<string, THREE.MeshStandardMaterial> = {
  grass: new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.85 }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.95 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.6 }),
};
const blocks = new Map<string, THREE.Mesh>();
const remoteAvatars = new Map<string, RemoteAvatar>();

const player = {
  id: '',
  name: `Deity-${Math.floor(Math.random() * 900 + 100)}`,
  color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
  position: new THREE.Vector3(0, 3, 4),
  velocity: new THREE.Vector3(),
  rotationY: 0,
  grounded: false,
};

const localMesh = createAvatar(player.color);
scene.add(localMesh);

let selectedBlock = 0;
const keys = new Set<string>();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const socket = new GameSocket();

const connection = document.querySelector<HTMLParagraphElement>('#connection')!;
const blockType = document.querySelector<HTMLElement>('#blockType')!;
const messages = document.querySelector<HTMLDivElement>('#messages')!;
const chatForm = document.querySelector<HTMLFormElement>('#chatForm')!;
const chatInput = document.querySelector<HTMLInputElement>('#chatInput')!;

function createAvatar(color: string): THREE.Mesh {
  const geometry = new THREE.CapsuleGeometry(0.35, 0.8, 6, 12);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function upsertBlock(block: Block): void {
  const key = blockKey(block);
  blocks.get(key)?.removeFromParent();
  const mesh = new THREE.Mesh(blockGeometry, blockMaterials[block.type]);
  mesh.position.set(block.x, block.y, block.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  blocks.set(key, mesh);
  scene.add(mesh);
}

function deleteBlock(position: Vec3): void {
  const key = blockKey(position);
  blocks.get(key)?.removeFromParent();
  blocks.delete(key);
}

function syncWorld(world: Block[]): void {
  blocks.forEach((mesh) => mesh.removeFromParent());
  blocks.clear();
  world.forEach(upsertBlock);
}

function syncPlayers(players: PlayerSnapshot[]): void {
  const seen = new Set<string>();
  for (const snapshot of players) {
    if (snapshot.id === player.id) continue;
    seen.add(snapshot.id);
    let avatar = remoteAvatars.get(snapshot.id);
    if (!avatar) {
      avatar = { mesh: createAvatar(snapshot.color), label: document.createElement('div') };
      scene.add(avatar.mesh);
      remoteAvatars.set(snapshot.id, avatar);
    }
    avatar.mesh.position.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
    avatar.mesh.rotation.y = snapshot.rotationY;
  }
  for (const [id, avatar] of remoteAvatars) {
    if (!seen.has(id)) {
      avatar.mesh.removeFromParent();
      remoteAvatars.delete(id);
    }
  }
}

function addChat(message: ChatMessage): void {
  const row = document.createElement('div');
  row.className = 'message';
  row.innerHTML = `<strong></strong>: <span></span>`;
  row.querySelector('strong')!.textContent = message.playerName;
  row.querySelector('span')!.textContent = message.text;
  messages.append(row);
  while (messages.children.length > 50) messages.firstElementChild?.remove();
  messages.scrollTop = messages.scrollHeight;
}

function tryEditBlock(remove: boolean): void {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...blocks.values()], false);
  const hit = hits[0];
  if (!hit) return;
  const mesh = hit.object as THREE.Mesh;
  const base = mesh.position.clone();
  if (remove) {
    socket.send({ type: 'removeBlock', position: clampBlockPosition(base) });
    return;
  }
  const normal = hit.face?.normal.clone().transformDirection(mesh.matrixWorld) ?? new THREE.Vector3(0, 1, 0);
  const position = base.add(normal).round();
  socket.send({ type: 'placeBlock', block: { ...clampBlockPosition(position), type: BLOCK_TYPES[selectedBlock] } });
}

function updatePlayer(delta: number): void {
  const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const move = new THREE.Vector3(strafe, 0, -forward);
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(PLAYER_SPEED * delta);
    player.rotationY = Math.atan2(move.x, move.z);
  }
  player.position.add(move);
  player.velocity.y -= GRAVITY * delta;
  player.position.y += player.velocity.y * delta;
  if (player.position.y <= 1.45) {
    player.position.y = 1.45;
    player.velocity.y = 0;
    player.grounded = true;
  }
  localMesh.position.copy(player.position);
  localMesh.rotation.y = player.rotationY;
  const cameraOffset = new THREE.Vector3(0, 3.2, 6).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotationY);
  camera.position.copy(player.position).add(cameraOffset);
  camera.lookAt(player.position.x, player.position.y + 0.7, player.position.z);
}

socket.onMessage((message) => {
  if (message.type === 'welcome') {
    player.id = message.playerId;
    syncWorld(message.world);
    syncPlayers(message.players);
    message.chat.forEach(addChat);
  } else if (message.type === 'snapshot') {
    syncPlayers(message.players);
  } else if (message.type === 'blockPlaced') {
    upsertBlock(message.block);
  } else if (message.type === 'blockRemoved') {
    deleteBlock(message.position);
  } else if (message.type === 'chat') {
    addChat(message.message);
  } else if (message.type === 'playerLeft') {
    remoteAvatars.get(message.playerId)?.mesh.removeFromParent();
    remoteAvatars.delete(message.playerId);
  }
});

window.addEventListener('keydown', (event) => {
  if (document.activeElement === chatInput) return;
  keys.add(event.code);
  if (event.code === 'Space' && player.grounded) {
    player.velocity.y = JUMP_VELOCITY;
    player.grounded = false;
  }
  const number = Number(event.key);
  if (number >= 1 && number <= BLOCK_TYPES.length) {
    selectedBlock = number - 1;
    blockType.textContent = BLOCK_TYPES[selectedBlock];
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('pointerdown', (event) => tryEditBlock(event.shiftKey));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (text) socket.send({ type: 'chat', text });
  chatInput.value = '';
});

socket.connect();
socket.send({ type: 'join', name: player.name, color: player.color });

const clock = new THREE.Clock();
let lastNetwork = 0;
function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(delta);
  connection.textContent = `Multiplayer: ${socket.status} · ${remoteAvatars.size + 1} avatar(s)`;
  lastNetwork += delta;
  if (lastNetwork > 0.05) {
    socket.send({ type: 'input', position: player.position, rotationY: player.rotationY });
    lastNetwork = 0;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
