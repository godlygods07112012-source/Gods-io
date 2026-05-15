import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

export type SocketClient = {
  id: string;
  readyState: 'open' | 'closed';
  send(data: string): void;
  close(): void;
  onMessage(listener: (data: string) => void): void;
  onClose(listener: () => void): void;
};

type ConnectionListener = (client: SocketClient) => void;

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class TinyWebSocketServer {
  private readonly server = createServer();
  private connectionListener?: ConnectionListener;
  private nextId = 1;

  constructor(private readonly port: number) {
    this.server.on('upgrade', (request, socket) => this.upgrade(request, socket));
  }

  onConnection(listener: ConnectionListener): void {
    this.connectionListener = listener;
  }

  listen(callback?: () => void): void {
    this.server.listen(this.port, callback);
  }

  private upgrade(request: IncomingMessage, socket: Duplex): void {
    const key = request.headers['sec-websocket-key'];
    if (typeof key !== 'string') {
      socket.destroy();
      return;
    }
    const accept = createHash('sha1').update(key + GUID).digest('base64');
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      '',
    ].join('\r\n'));
    this.connectionListener?.(new TinyWebSocketClient(`socket_${this.nextId++}`, socket));
  }
}

class TinyWebSocketClient implements SocketClient {
  readyState: 'open' | 'closed' = 'open';
  private buffer = Buffer.alloc(0);
  private readonly messageListeners = new Set<(data: string) => void>();
  private readonly closeListeners = new Set<() => void>();

  constructor(readonly id: string, private readonly socket: Duplex) {
    socket.on('data', (chunk: Buffer) => this.read(chunk));
    socket.on('close', () => this.markClosed());
    socket.on('error', () => this.markClosed());
  }

  send(data: string): void {
    if (this.readyState !== 'open') return;
    const payload = Buffer.from(data);
    const headerLength = payload.length < 126 ? 2 : payload.length < 65536 ? 4 : 10;
    const frame = Buffer.alloc(headerLength + payload.length);
    frame[0] = 0x81;
    if (payload.length < 126) {
      frame[1] = payload.length;
    } else if (payload.length < 65536) {
      frame[1] = 126;
      frame.writeUInt16BE(payload.length, 2);
    } else {
      frame[1] = 127;
      frame.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    payload.copy(frame, headerLength);
    this.socket.write(frame);
  }

  close(): void {
    this.socket.end();
    this.markClosed();
  }

  onMessage(listener: (data: string) => void): void {
    this.messageListeners.add(listener);
  }

  onClose(listener: () => void): void {
    this.closeListeners.add(listener);
  }

  private read(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      const masked = (second & 0x80) === 0x80;
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        length = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const maskLength = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLength + length) return;
      const mask = masked ? this.buffer.subarray(offset, offset + 4) : undefined;
      offset += maskLength;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
      if (opcode === 0x8) {
        this.close();
        return;
      }
      if (opcode !== 0x1) continue;
      if (mask) {
        for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
      }
      this.messageListeners.forEach((listener) => listener(payload.toString('utf8')));
    }
  }

  private markClosed(): void {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    this.closeListeners.forEach((listener) => listener());
  }
}
