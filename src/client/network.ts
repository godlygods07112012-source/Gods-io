import { DEFAULT_SERVER_URL } from '../shared/constants.js';
import type { ClientMessage, ServerMessage } from '../shared/types.js';

type Listener = (message: ServerMessage) => void;

export class GameSocket {
  private socket?: WebSocket;
  private readonly listeners = new Set<Listener>();
  private readonly pending: ClientMessage[] = [];
  status = 'offline';

  connect(url = import.meta.env?.VITE_WS_URL ?? DEFAULT_SERVER_URL): void {
    this.socket = new WebSocket(url);
    this.status = 'connecting';
    this.socket.addEventListener('open', () => {
      this.status = 'online';
      while (this.pending.length > 0) {
        this.send(this.pending.shift()!);
      }
    });
    this.socket.addEventListener('close', () => {
      this.status = 'offline';
      window.setTimeout(() => this.connect(url), 1500);
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.listeners.forEach((listener) => listener(message));
    });
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pending.push(message);
      return;
    }
    this.socket.send(JSON.stringify(message));
  }
}
