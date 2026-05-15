declare module 'three' {
  export class Color { constructor(value: number | string); }
  export class Fog { constructor(color: number, near: number, far: number); }
  export class Scene { background: Color | null; fog: Fog | null; add(...objects: Object3D[]): void; }
  export class PerspectiveCamera extends Object3D { aspect: number; constructor(fov: number, aspect: number, near: number, far: number); updateProjectionMatrix(): void; lookAt(x: number, y: number, z: number): void; }
  export class WebGLRenderer { domElement: HTMLCanvasElement; shadowMap: { enabled: boolean }; constructor(options?: { antialias?: boolean }); setSize(width: number, height: number): void; render(scene: Scene, camera: PerspectiveCamera): void; }
  export class Object3D { position: Vector3; rotation: { x: number; y: number; z: number }; matrixWorld: unknown; castShadow: boolean; receiveShadow: boolean; removeFromParent(): void; }
  export class Mesh extends Object3D { constructor(geometry?: unknown, material?: unknown); }
  export class HemisphereLight extends Object3D { constructor(skyColor: number, groundColor: number, intensity: number); }
  export class DirectionalLight extends Object3D { shadow: unknown; constructor(color: number, intensity: number); }
  export class BoxGeometry { constructor(width: number, height: number, depth: number); }
  export class CapsuleGeometry { constructor(radius: number, length: number, capSegments: number, radialSegments: number); }
  export class MeshStandardMaterial { constructor(options?: Record<string, unknown>); }
  export class Vector2 { constructor(x?: number, y?: number); x: number; y: number; }
  export class Vector3 { constructor(x?: number, y?: number, z?: number); x: number; y: number; z: number; set(x: number, y: number, z: number): this; add(v: Vector3): this; copy(v: Vector3): this; clone(): Vector3; normalize(): this; multiplyScalar(s: number): this; lengthSq(): number; applyAxisAngle(axis: Vector3, angle: number): this; round(): this; transformDirection(matrix: unknown): this; }
  export class Raycaster { setFromCamera(pointer: Vector2, camera: PerspectiveCamera): void; intersectObjects(objects: Object3D[], recursive?: boolean): Array<{ object: Object3D; face?: { normal: Vector3 } }>; }
  export class Clock { getDelta(): number; }
}
