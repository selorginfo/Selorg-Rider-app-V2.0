import {io, type Socket} from 'socket.io-client';
import {environment} from '../../config/environment';
import {getToken} from '../api/client';

type Listener = (payload: unknown) => void;

function socketOrigin(): string {
  try {
    const base = environment.apiBaseUrl.replace(/\/api\/v1\/?$/i, '');
    return base || environment.apiBaseUrl;
  } catch {
    return environment.apiBaseUrl;
  }
}

/**
 * Rider order realtime — listens for handover / dispatch events on `/picker-socket.io`.
 */
class RiderSocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private connected = false;

  connect(token?: string | null, hubKey?: string | null): void {
    const authToken = token || getToken();
    if (!authToken || environment.useMockData) {
      return;
    }
    if (this.socket?.connected) {
      if (hubKey) {
        this.socket.emit('subscribe:hub', hubKey);
      }
      return;
    }
    this.disconnect();

    // Connects to the main Socket.IO server (default `/socket.io` path). The
    // backend authenticates via the JWT in `auth.token` and puts pickers into
    // a `rider:{userId}` room automatically.
    this.socket = io(socketOrigin(), {
      transports: ['websocket', 'polling'],
      auth: {token: authToken, hubKey: hubKey || undefined},
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      if (hubKey) {
        this.socket?.emit('subscribe:hub', hubKey);
      }
    });
    this.socket.on('disconnect', () => {
      this.connected = false;
    });

    const fan = (event: string) => (payload: unknown) => {
      this.listeners.get(event)?.forEach(cb => cb(payload));
    };
    [
      // Legacy hub-dispatch events (kept for backward compat).
      'order:ready_for_dispatch',
      'order.handed_over',
      'order.hhd_scanned',
      'order.picked',
      'order.rider_accepted',
      'order.out_for_delivery',
      'realtime:ready',
      // New unified realtime events emitted by services/realtime.service.ts.
      'order:assigned',
      'order:status',
    ].forEach(event => this.socket?.on(event, fan(event)));
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  on(event: string, cb: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }
}

export const riderSocketService = new RiderSocketService();
