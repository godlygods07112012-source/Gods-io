declare module '*.css';

interface ImportMeta {
  env?: Record<string, string | undefined>;
}

declare const process: {
  env: Record<string, string | undefined>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  exit(code?: number): never;
};

declare module 'node:crypto' {
  export function createHash(algorithm: string): { update(data: string): { digest(encoding: 'base64'): string } };
}

declare module 'node:http' {
  import type { Duplex } from 'node:stream';
  export type IncomingMessage = { headers: Record<string, string | string[] | undefined> };
  export function createServer(listener?: (request: IncomingMessage, response: unknown) => void): {
    on(event: 'upgrade', listener: (request: IncomingMessage, socket: Duplex) => void): void;
    listen(port: number, callback?: () => void): void;
  };
}

declare module 'node:stream' {
  export type Duplex = {
    write(data: string | Buffer): void;
    destroy(): void;
    end(): void;
    on(event: 'data', listener: (chunk: Buffer) => void): void;
    on(event: 'close' | 'error', listener: () => void): void;
  };
}

declare module 'node:test' {
  export default function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert/strict' {
  const assert: {
    ok(value: unknown, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
  };
  export default assert;
}

declare class Buffer extends Uint8Array {
  static alloc(size: number): Buffer;
  static concat(chunks: Buffer[]): Buffer;
  static from(data: string | Uint8Array): Buffer;
  static from(data: ArrayBuffer | ArrayBufferView): Buffer;
  static byteLength(data: string): number;
  readUInt16BE(offset: number): number;
  readBigUInt64BE(offset: number): bigint;
  writeUInt16BE(value: number, offset: number): number;
  writeBigUInt64BE(value: bigint, offset: number): number;
  copy(target: Buffer, targetStart?: number): number;
  subarray(start?: number, end?: number): Buffer;
  toString(encoding?: string): string;
}
