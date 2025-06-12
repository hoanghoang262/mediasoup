// Interface for Protoo WebSocket server configuration
export interface ProtooConfigInterface {
  maxReceivedFrameSize: number; // Maximum frame size in bytes
  maxReceivedMessageSize: number; // Maximum message size in bytes
  fragmentOutgoingMessages: boolean; // Whether to fragment large messages
  fragmentationThreshold: number; // Size threshold for fragmentation
  pingInterval: number; // How often to ping clients (ms)
  pongTimeout: number; // How long to wait for pong response (ms)
}

// Protoo WebSocket server configuration
export const protooConfig: ProtooConfigInterface = {
  maxReceivedFrameSize: 960000, // 960 KBytes
  maxReceivedMessageSize: 960000, // 960 KBytes
  fragmentOutgoingMessages: true,
  fragmentationThreshold: 960000, // 960 KBytes
  pingInterval: 25000, // 25 seconds
  pongTimeout: 20000, // 20 seconds
};
