declare module 'protoo-client' {
  export class WebSocketTransport {
    constructor(url: string);
  }

  export interface ProtooResponse {
    response?: boolean;
    id?: number;
    ok?: boolean;
    data?: Record<string, unknown>;
    error?: {
      code?: number;
      message?: string;
    };
    
    // WebRTC and mediasoup specific fields
    method?: string;
    rtpCapabilities?: unknown;
    id?: string;
    iceParameters?: unknown;
    iceCandidates?: unknown;
    dtlsParameters?: unknown;
    [key: string]: unknown;
  }

  export type ProtooCallback = (...args: unknown[]) => void;

  export class Peer {
    constructor(transport: WebSocketTransport);
    id: string;
    on(event: string, callback: ProtooCallback): void;
    close(): void;
    request(method: string, data?: Record<string, unknown>): Promise<ProtooResponse>;
  }
} 