/**
 * Types for connection states
 */

export interface ConnectionState {
  /**
   * Current connection status
   */
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'failed';
}

/**
 * Types for ICE connection
 */
export interface IceConnectionState {
  /**
   * ICE connection state of a WebRTC transport
   */
  state: 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed';
} 