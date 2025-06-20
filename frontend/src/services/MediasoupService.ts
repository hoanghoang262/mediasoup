import { Peer, WebSocketTransport, type ProtooResponse } from 'protoo-client';
import * as mediasoupClient from 'mediasoup-client';
import { Device } from 'mediasoup-client';
import { toast } from 'sonner';

import { wsConfig, turnConfig } from '../config/env.config';
import type { 
  MediasoupTransportResponse, 
  MediasoupProduceResponse
} from '@/types/mediasoup';

/**
 * Information about a remote media stream
 */
export interface MediaStreamInfo {
  /**
   * Unique ID for the stream
   */
  id: string;
  
  /**
   * MediaStream object
   */
  stream: MediaStream;
  
  /**
   * Track object
   */
  track: MediaStreamTrack;
  
  /**
   * Whether this is a screen sharing stream
   */
  isScreenShare: boolean;

  /**
   * The peer ID who owns this stream
   */
  peerId: string;
}

export interface ConnectionState {
  connected: boolean;
  peerId: string;
  roomId: string;
  localStream?: MediaStream;
  remoteStreams: Map<string, MediaStreamInfo>;
  consumers: Map<string, mediasoupClient.types.Consumer>;
  producers: Map<string, mediasoupClient.types.Producer>;
  device?: Device;
  sendTransport?: mediasoupClient.types.Transport;
  recvTransport?: mediasoupClient.types.Transport;
  peer?: Peer;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'failed' | 'reconnecting';
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  remotePeers: Set<string>; // Track remote peers in the room
  screenSharingStream?: MediaStream;
}

// Add interfaces for transport event handlers
interface TransportConnectParams {
  dtlsParameters: mediasoupClient.types.DtlsParameters;
}

interface TransportProduceParams {
  kind: mediasoupClient.types.MediaKind;
  rtpParameters: mediasoupClient.types.RtpParameters;
  appData: Record<string, unknown>;
}

// Define event callback types
type EventCallback = (...args: unknown[]) => void;

class MediasoupService {
  private _state: ConnectionState = {
    connected: false,
    peerId: '',
    roomId: '',
    remoteStreams: new Map(),
    consumers: new Map(),
    producers: new Map(),
    connectionStatus: 'disconnected',
    reconnectAttempt: 0,
    maxReconnectAttempts: 5,
    remotePeers: new Set() // Initialize empty set of remote peers
  };
  
  private _eventListeners: Map<string, Set<EventCallback>> = new Map();
  private _reconnectAttempts = 0;
  private _maxReconnectAttempts = 5;
  private _reconnectTimeout: NodeJS.Timeout | null = null;
  private _heartbeatInterval: NodeJS.Timeout | null = null;
  private _heartbeatTimeout: NodeJS.Timeout | null = null;
  private _lastHeartbeatTime = 0;

  // Create a queue for notifications that arrive before initialization is complete
  private _queuedNotifications: ProtooResponse[] = [];

  constructor() {
    // Setup events
    const events = [
      'error',
      'connecting',
      'connected',
      'disconnected',
      'connectionProgress',
      'reconnecting',
      'reconnected',
      'reconnectFailed',
      'localStream',
      'remoteStreamAdded',
      'remoteStreamRemoved',
      'connectionStatus',
      'mediaAccessStatus',
      'participantJoined',
      'participantLeft',
      'screenSharingStarted',
      'screenSharingStopped',
      'remoteScreenShareStarted',
      'remoteScreenShareStopped',
      'connectionIssue'
    ];
    events.forEach(event => this._eventListeners.set(event, new Set()));
  }

  /**
   * Create ICE servers configuration with STUN and optional TURN servers
   */
  private _createIceServers(): RTCIceServer[] {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' }
    ];

    // Check if TURN is enabled first
    if (!turnConfig.enabled) {
      console.log('📡 TURN server disabled, using STUN-only configuration');
      return iceServers;
    }

    // Add TURN server if enabled and configured
    if (turnConfig.url && turnConfig.username && turnConfig.password) {
      console.log('🔄 TURN server enabled, adding configuration:', turnConfig.url);
      iceServers.push({
        urls: turnConfig.url,
        username: turnConfig.username,
        credential: turnConfig.password
      });
      console.log('✅ ICE servers configured: STUN + TURN');
    } else {
      console.warn('⚠️ TURN server enabled but configuration incomplete, using STUN-only');
      console.warn('   Missing:', {
        url: !turnConfig.url ? 'VITE_TURN_SERVER_URL' : null,
        username: !turnConfig.username ? 'VITE_TURN_SERVER_USERNAME' : null,
        password: !turnConfig.password ? 'VITE_TURN_SERVER_PASSWORD' : null
      });
    }

    return iceServers;
  }

  public get state(): ConnectionState {
    return this._state;
  }

  /**
   * Get current TURN configuration status
   */
  public getTurnStatus(): {
    enabled: boolean;
    configured: boolean;
    willUseTurn: boolean;
    serverUrl?: string;
  } {
    const enabled = turnConfig.enabled;
    const configured = Boolean(turnConfig.url && turnConfig.username && turnConfig.password);
    
    return {
      enabled,
      configured,
      willUseTurn: enabled && configured,
      serverUrl: enabled ? turnConfig.url : undefined
    };
  }

  public addEventListener(event: string, callback: EventCallback): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  public removeEventListener(event: string, callback: EventCallback): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private _emitEvent(event: string, ...args: unknown[]): void {
    // Only log important connection events
    if (event === 'connected') {
      console.log('🟢 Connected to room');
    } else if (event === 'disconnected') {
      console.log('🔴 Disconnected from room');
    } else if (event === 'reconnecting') {
      console.log('🟡 Reconnecting...');
    } else if (event === 'reconnected') {
      console.log('🟢 Reconnected successfully');
    }

    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  public async connect(roomId: string, peerId: string): Promise<void> {
    try {
      // If we're already connected with the same roomId and peerId, don't reconnect
      if (this._state.connected && this._state.roomId === roomId && this._state.peerId === peerId) {
        console.log('🟢 Already connected to room');
        return;
      }

      console.log('🔄 Connecting to room:', roomId);
      this._updateConnectionStatus('connecting');
      
      // Reset reconnection attempts on fresh connect
      this._reconnectAttempts = 0;
      this._state.reconnectAttempt = 0;
      
      // Clear any existing reconnection timeout
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }

      // Clear any existing heartbeat
      this._clearHeartbeat();

      this._state.roomId = roomId;
      this._state.peerId = peerId;

      // Create WebSocket connection with backend-compatible URL format
      const wsUrl = wsConfig.url;
      const protooUrl = `${wsUrl}?roomId=${roomId}&peerId=${peerId}`;
      
      // Close any existing peer
      if (this._state.peer) {
        this._state.peer.close();
      }
      
      // Create a new transport with a timeout
      const transport = new WebSocketTransport(protooUrl);
      
      // Add connection timeout (10 seconds)
      const connectionTimeout = setTimeout(() => {
        if (!this._state.connected && transport) {
          console.error('WebSocket connection timeout after 10 seconds');
          // We can't directly close the transport, but we can attempt to close any peer using it
          if (this._state.peer) {
            this._state.peer.close();
          }
          
          // Try to reconnect automatically
          if (!this._state.connected) {
            this._updateConnectionStatus('disconnected');
            this._tryReconnect();
          }
        }
      }, 10000);
      
      this._state.peer = new Peer(transport);

      // Set up Peer event listeners
      this._state.peer.on('open', () => {
        // Clear connection timeout
        clearTimeout(connectionTimeout);
        
        this._state.connected = true;
        this._updateConnectionStatus('connected');
        this._emitEvent('connected');
        
        // Reset reconnection attempts on successful connection
        this._reconnectAttempts = 0;
        this._state.reconnectAttempt = 0;
        
        // Initiate room join sequence
        this._joinRoom();
        
        // Start heartbeat to detect dead connections
        this._startHeartbeat();
      });

      this._state.peer.on('close', () => {
        // Only update state if we were previously connected
        if (this._state.connected) {
          this._state.connected = false;
          this._updateConnectionStatus('disconnected');
          this._emitEvent('disconnected');
          
          // Try to reconnect if not intentionally disconnected
          this._tryReconnect();
        }
      });

      this._state.peer.on('error', (err) => {
        console.error('Protoo connection error:', err);
        this._emitEvent('error', err);
        
        // Only try to reconnect if we were previously connected
        if (this._state.connected) {
          this._state.connected = false;
          this._updateConnectionStatus('disconnected');
          this._emitEvent('disconnected');
          this._tryReconnect();
        }
      });

      // Set up notification handler
      this._state.peer.on('notification', (notification) => {
        // Handle server pings (no response needed)
        if ((notification as ProtooResponse).method === 'ping') {
          // Update heartbeat time when we receive a ping
          this._lastHeartbeatTime = Date.now();
          return;
        }
        
        this._handleNotification(notification as ProtooResponse);
        
        // Update heartbeat time when we receive any notification
        this._lastHeartbeatTime = Date.now();
      });
    } catch (error) {
      console.error('Connection error:', error);
      this._emitEvent('error', error);
      
      // Only update state if we were previously connected
      if (this._state.connected) {
        this._state.connected = false;
        this._updateConnectionStatus('failed');
        this._emitEvent('disconnected');
        
        // Try to reconnect on connection error
        this._tryReconnect();
      } else {
        // If we were never connected, just set the state to failed
        this._updateConnectionStatus('failed');
      }
      
      throw error;
    }
  }
  
  private _updateConnectionStatus(status: ConnectionState['connectionStatus']): void {
    this._state.connectionStatus = status;
    this._emitEvent('connectionStatus', status);
  }
  
  private _startHeartbeat(): void {
    // Clear any existing heartbeat
    this._clearHeartbeat();
    
    // Set initial heartbeat time
    this._lastHeartbeatTime = Date.now();
    
    // Check connection health every 5 seconds
    this._heartbeatInterval = setInterval(() => {
      if (!this._state.connected || !this._state.peer) {
        console.log('Not connected, skipping heartbeat check');
        return;
      }

      const now = Date.now();
      const timeSinceLastHeartbeat = now - this._lastHeartbeatTime;
      
      // If we haven't received anything in 10 seconds, consider the connection potentially dead
      if (timeSinceLastHeartbeat > 10000) {
        console.warn(`No activity for ${timeSinceLastHeartbeat}ms, checking connection...`);
        
        // Send a ping to check if the connection is still alive
        if (this._state.peer && this._state.connected) {
          // Set a timeout for the ping response
          const pingTimeout = setTimeout(() => {
            console.error('Ping timeout, connection is dead');
            if (this._state.connected) {
              this._state.connected = false;
              this._updateConnectionStatus('disconnected');
              this._emitEvent('disconnected');
              this._tryReconnect();
            }
          }, 5000); // 5 second timeout for ping response

          this._state.peer.request('ping', {})
            .then(() => {
              // Clear the timeout when we get a response
              clearTimeout(pingTimeout);
              console.log('Ping successful, connection is alive');
              this._lastHeartbeatTime = Date.now();
            })
            .catch((error) => {
              // Clear the timeout when we get an error
              clearTimeout(pingTimeout);
              console.error('Ping failed, connection may be dead:', error);
              // Connection is likely dead, try to reconnect
              if (this._state.connected) {
                this._state.connected = false;
                this._updateConnectionStatus('disconnected');
                this._emitEvent('disconnected');
                this._tryReconnect();
              }
            });
        }
      }
    }, 5000);
  }
  
  private _clearHeartbeat(): void {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
    
    if (this._heartbeatTimeout) {
      clearTimeout(this._heartbeatTimeout);
      this._heartbeatTimeout = null;
    }
  }
  
  private _tryReconnect(): void {
    // Don't try to reconnect if we're intentionally disconnecting
    if (!this._state.roomId || !this._state.peerId) {
      console.log('No roomId or peerId, skipping reconnection');
      return;
    }
    
    // Don't try to reconnect if we're already connected
    if (this._state.connected) {
      console.log('Already connected, skipping reconnection attempt');
      return;
    }
    
    // Don't try to reconnect if we're already trying to reconnect
    if (this._state.connectionStatus === 'reconnecting' && this._reconnectTimeout) {
      console.log('Already attempting to reconnect, skipping duplicate attempt');
      return;
    }
    
    // Check if we've reached max reconnection attempts
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.log(`Max reconnection attempts (${this._maxReconnectAttempts}) reached`);
      this._updateConnectionStatus('failed');
      this._emitEvent('reconnectFailed');
      
      // Show toast notification for reconnection failure
      toast.error('Connection lost', {
        description: 'Failed to reconnect after multiple attempts. Please reload the page.',
        duration: 0, // Persistent until dismissed
      });
      
      return;
    }
    
    // Increment reconnection attempts
    this._reconnectAttempts++;
    this._state.reconnectAttempt = this._reconnectAttempts;
    
    // Exponential backoff for reconnection
    const delay = Math.min(1000 * Math.pow(1.5, this._reconnectAttempts - 1), 10000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`);
    this._updateConnectionStatus('reconnecting');
    this._emitEvent('reconnecting', this._reconnectAttempts, this._maxReconnectAttempts);
    
    // Show toast notification for reconnection attempt
    toast.warning('Connection lost', {
      description: `Attempting to reconnect (${this._reconnectAttempts}/${this._maxReconnectAttempts})...`,
      duration: 3000,
    });
    
    // Clear any existing timeout
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }
    
    this._reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`);
      
      // Ensure we're not already connected before attempting reconnection
      if (this._state.connected) {
        console.log('Already connected, skipping reconnection attempt');
        return;
      }
      
      this.connect(this._state.roomId, this._state.peerId)
        .then(() => {
          console.log('Reconnection successful');
          this._emitEvent('reconnected');
          
          // Show toast notification for successful reconnection
          toast.success('Connection restored', {
            description: 'Successfully reconnected to the room',
            duration: 3000,
          });
        })
        .catch(error => {
          console.error('Reconnection failed:', error);
          
          // If we failed to reconnect but haven't reached max attempts,
          // try reconnecting again (after a delay)
          if (this._reconnectAttempts < this._maxReconnectAttempts) {
            // Call _tryReconnect again after a delay
            setTimeout(() => {
              this._tryReconnect();
            }, 1000);
          }
        });
    }, delay);
  }

  public async disconnect(): Promise<void> {
    try {
      // Clear any reconnection timeout
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }
      
      // Clear any heartbeat
      this._clearHeartbeat();

      // Close all transports
      if (this._state.sendTransport) {
        this._state.sendTransport.close();
      }

      if (this._state.recvTransport) {
        this._state.recvTransport.close();
      }

      // Close peer connection
      if (this._state.peer) {
        this._state.peer.close();
      }

      // Stop all local tracks
      if (this._state.localStream) {
        this._state.localStream.getTracks().forEach(track => track.stop());
      }

      // Reset state
      this._state = {
        connected: false,
        peerId: '',
        roomId: '',
        remoteStreams: new Map(),
        consumers: new Map(),
        producers: new Map(),
        connectionStatus: 'disconnected',
        reconnectAttempt: 0,
        maxReconnectAttempts: this._maxReconnectAttempts,
        remotePeers: new Set(),
        screenSharingStream: undefined
      };

      this._emitEvent('disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      this._emitEvent('error', error);
    }
  }

  /**
   * Get connection statistics
   */
  public async getConnectionStats(): Promise<{
    latency: number;
    bandwidth: { upload: number; download: number };
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  }> {
    try {
      const stats: {
        latency: number;
        bandwidth: { upload: number; download: number };
        quality: 'excellent' | 'good' | 'fair' | 'poor';
      } = {
        latency: 0,
        bandwidth: { upload: 0, download: 0 },
        quality: 'poor'
      };

      // Get stats from send transport
      if (this._state.sendTransport) {
        const sendStats = await this._state.sendTransport.getStats();
        
        // Calculate latency from RTT if available
        for (const [, stat] of sendStats) {
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            const candidatePairStat = stat as RTCIceCandidatePairStats;
            stats.latency = Math.round((candidatePairStat.currentRoundTripTime || 0) * 1000);
          }
          
          // Get outbound bandwidth
          if (stat.type === 'outbound-rtp') {
            const outboundStat = stat as RTCOutboundRtpStreamStats;
            if (outboundStat.bytesSent && outboundStat.timestamp) {
              // Calculate bandwidth in kbps
              stats.bandwidth.upload = Math.round((outboundStat.bytesSent * 8) / 1000);
            }
          }
        }
      }

      // Get stats from receive transport
      if (this._state.recvTransport) {
        const recvStats = await this._state.recvTransport.getStats();
        
        for (const [, stat] of recvStats) {
          // Get inbound bandwidth
          if (stat.type === 'inbound-rtp') {
            const inboundStat = stat as RTCInboundRtpStreamStats;
            if (inboundStat.bytesReceived && inboundStat.timestamp) {
              // Calculate bandwidth in kbps
              stats.bandwidth.download = Math.round((inboundStat.bytesReceived * 8) / 1000);
            }
          }
        }
      }

      // Determine quality based on latency and connection status
      if (this._state.connectionStatus === 'connected') {
        if (stats.latency < 50 && this._state.reconnectAttempt === 0) {
          stats.quality = 'excellent';
        } else if (stats.latency < 100 && this._state.reconnectAttempt <= 2) {
          stats.quality = 'good';
        } else if (stats.latency < 200 && this._state.reconnectAttempt <= 5) {
          stats.quality = 'fair';
        } else {
          stats.quality = 'poor';
        }
      }

      // Fallback values if we couldn't get real stats
      if (stats.latency === 0) {
        stats.latency = this._state.connectionStatus === 'connected' ? 45 : 999;
      }
      if (stats.bandwidth.upload === 0) {
        stats.bandwidth.upload = this._state.connectionStatus === 'connected' ? 800 : 0;
      }
      if (stats.bandwidth.download === 0) {
        stats.bandwidth.download = this._state.connectionStatus === 'connected' ? 1200 : 0;
      }

      return stats;
    } catch (error) {
      console.error('Error getting connection stats:', error);
      
      // Return fallback stats
      return {
        latency: this._state.connectionStatus === 'connected' ? 45 : 999,
        bandwidth: { 
          upload: this._state.connectionStatus === 'connected' ? 800 : 0, 
          download: this._state.connectionStatus === 'connected' ? 1200 : 0 
        },
        quality: this._state.connectionStatus === 'connected' ? 'good' : 'poor'
      };
    }
  }

  public async getLocalStream(): Promise<MediaStream> {
    try {
      if (this._state.localStream) {
        return this._state.localStream;
      }

      console.log('🎬 Requesting media permissions separately...');
      
      // Request audio and video permissions separately
      let audioTrack: MediaStreamTrack | null = null;
      let videoTrack: MediaStreamTrack | null = null;
      let hasAudio = false;
      let hasVideo = false;
      let audioError: string | null = null;
      let videoError: string | null = null;

      // Try to get audio first
      try {
        console.log('🎤 Requesting audio permission...');
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioTrack = audioStream.getAudioTracks()[0];
        hasAudio = true;
        console.log('✅ Audio permission granted');
      } catch (error) {
        console.log('❌ Audio permission denied:', error);
        audioError = error instanceof Error ? error.message : 'Audio access denied';
        hasAudio = false;
      }

      // Try to get video separately
      try {
        console.log('📹 Requesting video permission...');
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        videoTrack = videoStream.getVideoTracks()[0];
        hasVideo = true;
        console.log('✅ Video permission granted');
      } catch (error) {
        console.log('❌ Video permission denied:', error);
        videoError = error instanceof Error ? error.message : 'Video access denied';
        hasVideo = false;
      }

      // Check if we got at least one media type
      if (!hasAudio && !hasVideo) {
        const errorMessage = `Both media access denied. Audio: ${audioError}, Video: ${videoError}`;
        console.error('🔴 No media access granted:', errorMessage);
        throw new Error(errorMessage);
      }

      // Create combined stream with available tracks
      const tracks: MediaStreamTrack[] = [];
      if (audioTrack) tracks.push(audioTrack);
      if (videoTrack) tracks.push(videoTrack);
      
      const combinedStream = new MediaStream(tracks);
      this._state.localStream = combinedStream;

      // Emit events based on what we got
      this._emitEvent('localStream', combinedStream);
      this._emitEvent('mediaAccessStatus', { 
        hasAudio, 
        hasVideo, 
        audioError: audioError || undefined,
        videoError: videoError || undefined
      });

      // Show user-friendly notifications
      if (!hasAudio && hasVideo) {
        toast.warning('Chỉ có Video', {
          description: 'Microphone không khả dụng. Bạn đang ở chế độ chỉ có hình ảnh.',
          duration: 5000,
        });
      } else if (hasAudio && !hasVideo) {
        toast.warning('Chỉ có Audio', {
          description: 'Camera không khả dụng. Bạn đang ở chế độ chỉ có âm thanh.',
          duration: 5000,
        });
      } else if (hasAudio && hasVideo) {
        console.log('🎉 Both audio and video available');
      }

      console.log('📡 Local stream created:', {
        streamId: combinedStream.id,
        hasAudio,
        hasVideo,
        audioTracks: combinedStream.getAudioTracks().length,
        videoTracks: combinedStream.getVideoTracks().length
      });

      return combinedStream;
    } catch (error) {
      console.error('❌ Get local stream error:', error);
      this._emitEvent('error', error);
      throw error;
    }
  }

  private async _joinRoom(): Promise<void> {
    if (!this._state.peer) {
      throw new Error('Peer not connected');
    }

    try {
      // Get router RTP capabilities
      const response = await this._state.peer.request('getRouterRtpCapabilities');
      const { rtpCapabilities } = response as { rtpCapabilities: mediasoupClient.types.RtpCapabilities };

      // Create and load device
      this._state.device = new Device();
      await this._state.device.load({
        routerRtpCapabilities: rtpCapabilities,
      });

      // Send join request
      const joinResponse = await this._state.peer.request('join', {
        displayName: this._state.peerId,
        device: {
          name: 'Browser',
          version: navigator.userAgent,
        },
        rtpCapabilities: this._state.device.rtpCapabilities,
        sctpCapabilities: this._state.device.sctpCapabilities,
      });

      // Handle existing peers
      if (joinResponse && typeof joinResponse === 'object' && 'peers' in joinResponse) {
        const peers = joinResponse.peers as Array<{id: string; displayName: string}>;
        peers.forEach(peer => {
          this._state.remotePeers.add(peer.id);
          this._emitEvent('participantJoined', peer.id, { name: peer.displayName });
        });
      }

      // Create transports
      await this._createRecvTransport();
      await this._createSendTransport();

      // Get and publish local stream
      const stream = await this.getLocalStream();
      this._state.localStream = stream;
      this._emitEvent('localStream', stream);
      await this._publishStream(stream);

      // Update connection status
      this._state.connected = true;
      this._updateConnectionStatus('connected');
      console.log('✅ Room joined successfully');

      // Process queued notifications
      this._processQueuedNotifications();
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      this._emitEvent('error', error);
      this._updateConnectionStatus('failed');
      throw error;
    }
  }

  private async _createSendTransport(): Promise<void> {
    try {
      if (!this._state.peer || !this._state.device) {
        throw new Error('Peer or Device not initialized');
      }

      // Request server to create a WebRTC transport
      const transportResponse = await this._state.peer.request('createWebRtcTransport', {
        producing: true,
        consuming: false,
      });
      
      const { id, iceParameters, iceCandidates, dtlsParameters } = 
        transportResponse as unknown as MediasoupTransportResponse;

      // Create ICE servers configuration with STUN and optional TURN
      const iceServers = this._createIceServers();



      // Create the local send transport
      this._state.sendTransport = this._state.device.createSendTransport({
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        iceServers
      });

      // Set up transport event handlers
      this._state.sendTransport.on(
        'connect', 
        async ({ dtlsParameters }: TransportConnectParams, callback: () => void, errback: (error: Error) => void) => {
          let retryCount = 0;
          const maxRetries = 3;
          
          const tryConnect = async (): Promise<void> => {
            try {
              if (!this._state.peer || !this._state.sendTransport) {
                throw new Error('Peer connection or Transport lost during connection');
              }
              
              await this._state.peer.request('connectWebRtcTransport', {
                transportId: this._state.sendTransport.id,
                dtlsParameters,
              });
              

              callback();
            } catch (error) {
              console.error(`Send transport connect attempt ${retryCount + 1}/${maxRetries} failed:`, error);
              
              if (retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`Retrying send transport connect (attempt ${retryCount + 1}/${maxRetries})...`);
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
                await tryConnect();
              } else {
                console.error('All send transport connect attempts failed');
                errback(error as Error);
              }
            }
          };
          
          await tryConnect();
        }
      );

      // Add connection state change handler for debugging and recovery
      this._state.sendTransport.on('connectionstatechange', (state) => {
        console.log(`Send transport connection state changed to ${state}`);
        if (state === 'failed') {
          console.warn('Send transport connection failed - ICE connectivity issue');
          // Attempt recovery by restarting ICE
          try {
            if (this._state.sendTransport && this._state.connected && this._state.peer) {
              console.log('Attempting to recover send transport after failure');
              
              // Try to restart ICE if supported, or create a new transport as fallback
              try {
                // Force a timeout to ensure we don't get stuck
                const timeoutPromise = new Promise<void>((_, reject) => {
                  setTimeout(() => reject(new Error('ICE restart timeout')), 5000);
                });
                
                // Try to create a new transport after delay
                Promise.race([
                  timeoutPromise, 
                  (async () => {
                    // Wait a moment before recreating
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this._createSendTransport();
                    
                    // Republish local stream if available
                    if (this._state.localStream && this._state.sendTransport) {
                      await this._publishStream(this._state.localStream);
                    }
                  })()
                ]).catch(e => {
                  console.error('Failed to recover send transport:', e);
                  // Notify UI about the connection issues
                  this._emitEvent('connectionIssue', {
                    type: 'sendTransport',
                    message: 'Media connection failed. Try using a different network or enable mobile data.'
                  });
                });
              } catch (innerError) {
                console.error('Error during send transport recovery process:', innerError);
              }
            }
          } catch (error) {
            console.error('Error attempting send transport recovery:', error);
          }
        }
      });

      // Set up produce handler
      this._state.sendTransport.on(
        'produce', 
        async (
          { kind, rtpParameters, appData }: TransportProduceParams, 
          callback: (data: { id: string }) => void, 
          errback: (error: Error) => void
        ) => {
          try {
            if (!this._state.peer || !this._state.sendTransport) {
              throw new Error('Peer connection or Transport not established');
            }
            const response = await this._state.peer.request('produce', {
              transportId: this._state.sendTransport.id,
              kind,
              rtpParameters,
              appData,
            });
            
            const { id } = response as unknown as MediasoupProduceResponse;
            callback({ id });
          } catch (error) {
            errback(error as Error);
          }
        }
      );
    } catch (error) {
      console.error('Create send transport error:', error);
      this._emitEvent('error', error);
      throw error;
    }
  }

  private async _createRecvTransport(): Promise<void> {
    try {
      if (!this._state.peer || !this._state.device) {
        throw new Error('Peer or Device not initialized');
      }


      
      // Request server to create a WebRTC transport
      console.log('📥 Requesting receive transport from server...');
      const transportResponse = await this._state.peer.request('createWebRtcTransport', {
        producing: false,
        consuming: true,
      });
      console.log('✅ Receive transport response received:', transportResponse);
      
      const { id, iceParameters, iceCandidates, dtlsParameters } = 
        transportResponse as unknown as MediasoupTransportResponse;

      // Create ICE servers configuration with STUN and optional TURN
      const iceServers = this._createIceServers();

      console.log('Creating receive transport with ICE servers:', iceServers);

      // Create the local receive transport
      this._state.recvTransport = this._state.device.createRecvTransport({
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        iceServers
      });

      // Set up transport event handlers
      this._state.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        console.log('Receive transport connect event triggered');
        let retryCount = 0;
        const maxRetries = 3;
        
        const tryConnect = async (): Promise<void> => {
          try {
            if (!this._state.peer) {
              throw new Error('Peer connection lost during transport connect');
            }
            
            // Notify the server to establish the transport connection
            await this._state.peer.request('connectWebRtcTransport', {
              transportId: this._state.recvTransport!.id,
              dtlsParameters,
            });
            
            console.log('Receive transport connected successfully');
            callback();
          } catch (error) {
            console.error(`Receive transport connect attempt ${retryCount + 1}/${maxRetries} failed:`, error);
            
            if (retryCount < maxRetries - 1) {
              retryCount++;
              console.log(`Retrying receive transport connect (attempt ${retryCount + 1}/${maxRetries})...`);
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
              await tryConnect();
            } else {
              console.error('All receive transport connect attempts failed');
              errback(error as Error);
              this._emitEvent('error', error);
            }
          }
        };
        
        await tryConnect();
      });

      // Add connection state change handler for debugging and recovery
      this._state.recvTransport.on('connectionstatechange', (state) => {
        console.log(`Receive transport connection state changed to ${state}`);
        if (state === 'failed') {
          console.warn('Receive transport connection failed - ICE connectivity issue');
          // Attempt recovery by creating a new receive transport
          try {
            if (this._state.connected && this._state.peer && this._state.device) {
              console.log('Attempting to recreate receive transport after failure');
              
              // Try to create a new receive transport with a timeout
              const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error('Receive transport recreation timeout')), 5000);
              });
              
              // Try to create a new transport after delay
              Promise.race([
                timeoutPromise, 
                (async () => {
                  // Wait a moment before recreating
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  await this._createRecvTransport();
                })()
              ]).catch(e => {
                console.error('Failed to recreate receive transport:', e);
                // Notify UI about the connection issues
                this._emitEvent('connectionIssue', {
                  type: 'receiveTransport',
                  message: 'Media connection failed. Try using a different network or enable mobile data.'
                });
              });
            }
          } catch (error) {
            console.error('Error attempting to recover receive transport:', error);
          }
        }
      });

      console.log('Receive transport created successfully:', this._state.recvTransport.id);
      
      // Notify about transport creation
      this._emitEvent('connectionProgress', { step: 'recvTransportCreated' });
    } catch (error) {
      console.error('Create receive transport error:', error);
      this._emitEvent('error', error);
      throw error;
    }
  }

  private async _publishStream(stream: MediaStream): Promise<void> {
    try {
      if (!this._state.sendTransport) {
        throw new Error('Send transport not created');
      }

      console.log('📤 Publishing stream:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });

      // Check if we already have producers for these tracks to avoid duplicates
      const existingProducers = Array.from(this._state.producers.values());
      
      // Publish audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        // Check if we already have a producer for this audio track
        const existingAudioProducer = existingProducers.find(p => 
          p.track?.id === audioTrack.id && p.kind === 'audio'
        );
        
        if (existingAudioProducer) {
          console.log('🔄 Audio track already published, skipping:', audioTrack.id);
        } else {
          console.log('🎤 Publishing audio track:', { id: audioTrack.id, enabled: audioTrack.enabled });
          const audioProducer = await this._state.sendTransport.produce({
            track: audioTrack,
            codecOptions: {
              opusStereo: true,
              opusDtx: true,
            },
          });
          this._state.producers.set(audioProducer.id, audioProducer);
          console.log('✅ Audio producer created:', audioProducer.id);
        }
      }

      // Publish video track  
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Check if we already have a producer for this video track
        const existingVideoProducer = existingProducers.find(p => 
          p.track?.id === videoTrack.id && p.kind === 'video'
        );
        
        if (existingVideoProducer) {
          console.log('🔄 Video track already published, skipping:', videoTrack.id);
        } else {
          console.log('📹 Publishing video track:', { 
            id: videoTrack.id, 
            enabled: videoTrack.enabled,
            readyState: videoTrack.readyState 
          });
          const videoProducer = await this._state.sendTransport.produce({
            track: videoTrack,
            codecOptions: {
              videoGoogleStartBitrate: 1000,
            },
          });
          this._state.producers.set(videoProducer.id, videoProducer);
          console.log('✅ Video producer created:', videoProducer.id);
        }
      } else {
        console.warn('⚠️ No video track found in stream');
      }

      console.log('📡 Stream publishing completed. Producers:', this._state.producers.size);
    } catch (error) {
      console.error('❌ Publish stream error:', error);
      this._emitEvent('error', error);
    }
  }

  private _handleNotification(notification: ProtooResponse): void {
    try {
      if (!notification.method || typeof notification.method !== 'string') {
        console.warn('Received notification without method:', notification);
        return;
      }

      const method = notification.method;
      const data = notification.data as Record<string, unknown> || {};
      
      // For newConsumer notifications, queue them if device isn't initialized yet
      if (method === 'newConsumer' && (!this._state.device || !this._state.recvTransport)) {
        console.log('Received newConsumer notification before device/transport initialization, queueing it');
        
        // Queue the notification to process after device is initialized
        this._queuedNotifications.push(notification);
        return;
      }
      
      this._processNotification(method, data);
    } catch (error) {
      console.error('Error processing notification:', error);
      this._emitEvent('error', error);
    }
  }

  // Process any queued notifications after initialization
  private _processQueuedNotifications(): void {
    if (this._queuedNotifications.length > 0) {
      console.log(`Processing ${this._queuedNotifications.length} queued notifications`);
      
      // Process all queued notifications
      for (const notification of this._queuedNotifications) {
        try {
          if (notification.method && typeof notification.method === 'string') {
            const method = notification.method;
            const data = notification.data as Record<string, unknown> || {};
            this._processNotification(method, data);
          }
        } catch (error) {
          console.error('Error processing queued notification:', error);
          this._emitEvent('error', error);
        }
      }
      
      // Clear the queue
      this._queuedNotifications = [];
    }
  }

  // Actual notification processing logic
  private async _processNotification(method: string, data: Record<string, unknown>): Promise<void> {
    switch (method) {
      case 'newConsumer': {
        // Check if device is initialized
        if (!this._state.device) {
          console.error('Device not initialized when processing newConsumer');
          return;
        }

        // Check if receive transport is initialized, if not, try to create it
        if (!this._state.recvTransport && this._state.connected && this._state.device) {
          try {
            console.log('Receive transport not initialized, creating it now...');
            await this._createRecvTransport();
          } catch (error) {
            console.error('Failed to create receive transport on newConsumer notification:', error);
            this._emitEvent('error', error);
            return;
          }
        }

        // Double-check that we have the receive transport now
        if (!this._state.recvTransport || !this._state.peer) {
          console.error('Still missing receive transport or peer after attempted creation');
          this._emitEvent('error', new Error('Failed to initialize receive transport'));
          return;
        }

        const producerId = data.producerId as string;
        const kind = data.kind as mediasoupClient.types.MediaKind;
        const appData = data.appData as Record<string, unknown>;
        const remotePeerId = data.peerId as string;

        console.log('Processing newConsumer notification:', { 
          producerId, 
          kind, 
          appData,
          remotePeerId,
          appDataType: typeof appData,
          appDataKeys: appData ? Object.keys(appData) : [],
          mediaType: appData ? (appData as Record<string, unknown>).mediaType : undefined
        });

        // Ensure the remote peer is in our list of participants
        if (remotePeerId && remotePeerId !== this._state.peerId) {
          if (!this._state.remotePeers.has(remotePeerId)) {
            console.log(`Adding missing remote peer from consumer: ${remotePeerId}`);
            this._state.remotePeers.add(remotePeerId);
            this._emitEvent('participantJoined', remotePeerId);
          }
        }

        // Request to consume the producer with retry mechanism
        let retryCount = 0;
        const maxRetries = 3;
        
        const tryCreateConsumer = async (): Promise<void> => {
          try {
            if (!this._state.recvTransport || !this._state.peer || !this._state.device) {
              throw new Error('Receive transport, Peer, or Device not available');
            }
            
            // Request the server to create a consumer for this producer
            console.log(`Requesting to consume producer ${producerId} from peer ${remotePeerId}`);
            const response = await this._state.peer.request('consume', {
              transportId: this._state.recvTransport.id,
              producerId,
              rtpCapabilities: this._state.device.rtpCapabilities,
            });

            const consumerId = String(response.id);
            const consumerRtpParameters = response.rtpParameters as mediasoupClient.types.RtpParameters;

            console.log('Consumer creation response received:', {
              consumerId,
              producerId,
              kind: response.kind
            });

            // Create the consumer on the client side
            const consumer = await this._state.recvTransport.consume({
              id: consumerId,
              producerId,
              kind,
              rtpParameters: consumerRtpParameters,
              appData,
            });

            console.log('Consumer created successfully:', {
              id: consumer.id,
              kind: consumer.kind,
              trackId: consumer.track.id
            });

            // Store consumer
            this._state.consumers.set(consumerId, consumer);

            // Create a new stream with the consumer's track
            const stream = new MediaStream([consumer.track]);
            
            // Store the remote stream info
            const streamInfo: MediaStreamInfo = {
              id: producerId,
              track: consumer.track,
              stream,
              isScreenShare: appData.mediaType === 'screen',
              peerId: remotePeerId,
            };
            this._state.remoteStreams.set(producerId, streamInfo);
            
            console.log('🔍 Debug remote stream creation:', {
              producerId,
              appData,
              mediaType: appData.mediaType,
              isScreenShareCheck: appData.mediaType === 'screen',
              isScreenShareResult: streamInfo.isScreenShare,
              trackKind: streamInfo.track.kind,
              trackId: streamInfo.track.id,
              peerId: remotePeerId
            });
            
            console.log('Remote stream added:', {
              id: producerId,
              isScreenShare: streamInfo.isScreenShare,
              trackKind: streamInfo.track.kind,
              trackId: streamInfo.track.id
            });
            
            // Emit event with the new stream
            console.log('🎬 Emitting remoteStreamAdded event:', {
              id: producerId,
              peerId: remotePeerId,
              kind: streamInfo.track.kind,
              hasVideo: streamInfo.track.kind === 'video',
              trackEnabled: streamInfo.track.enabled,
              streamId: streamInfo.stream.id
            });
            this._emitEvent('remoteStreamAdded', streamInfo);

            // Resume the consumer to start receiving media
            try {
              await this._state.peer.request('resumeConsumer', { consumerId });
              console.log('Consumer resumed:', consumerId);
            } catch (resumeError) {
              console.error('Failed to resume consumer:', resumeError);
              // Don't throw here, we already created the consumer successfully
            }
          } catch (error) {
            console.error(`Consumer creation attempt ${retryCount + 1}/${maxRetries} failed:`, error);
            
            if (retryCount < maxRetries - 1) {
              retryCount++;
              console.log(`Retrying consumer creation (attempt ${retryCount + 1}/${maxRetries})...`);
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
              await tryCreateConsumer();
            } else {
              console.error('All consumer creation attempts failed');
              throw error;
            }
          }
        };
        
        try {
          await tryCreateConsumer();
        } catch (error) {
          console.error('Failed to create or resume consumer after retries:', error);
          this._emitEvent('error', error);
        }
        
        break;
      }
      
      case 'participantJoined': {
        const remotePeerId = data.peerId as string;
        console.log('Participant joined:', remotePeerId);
        
        // Add peer to our tracked remote peers
        if (remotePeerId && remotePeerId !== this._state.peerId) {
          // Only add if not already in our set
          if (!this._state.remotePeers.has(remotePeerId)) {
            console.log(`Adding new remote peer: ${remotePeerId}`);
            this._state.remotePeers.add(remotePeerId);
            
            // Create a WebRTC transport for this peer if needed
            if (this._state.connected && !this._state.recvTransport && this._state.device) {
              try {
                console.log('Creating receive transport for new participant');
                await this._createRecvTransport();
              } catch (error) {
                console.error('Failed to create receive transport for new participant:', error);
                this._emitEvent('error', error);
              }
            }
            
            // Emit participant joined event
            console.log(`Emitting participantJoined event for: ${remotePeerId}`);
            this._emitEvent('participantJoined', remotePeerId);
          } else {
            console.log(`Remote peer ${remotePeerId} already in participants list`);
          }
        }
        break;
      }

      case 'consumerClosed': {
        const consumerId = data.consumerId as string;
        const consumer = this._state.consumers.get(consumerId);
        
        if (consumer) {
          consumer.close();
          this._state.consumers.delete(consumerId);
          
          // Find and remove the corresponding stream
          for (const [producerId, streamInfo] of this._state.remoteStreams.entries()) {
            if (streamInfo.track.id === consumer.track.id) {
              this._state.remoteStreams.delete(producerId);
              this._emitEvent('remoteStreamRemoved', producerId);
              break;
            }
          }
        }
        break;
      }

      case 'participantLeft': {
        const remotePeerId = data.peerId as string;
        console.log('Participant left:', remotePeerId);
        
        // Remove peer from our tracked remote peers
        if (remotePeerId) {
          this._state.remotePeers.delete(remotePeerId);
          
          // Emit participant left event
          this._emitEvent('participantLeft', remotePeerId);
          
          // Note: The server should also send consumerClosed notifications
          // for any consumers associated with this peer, which will be handled above
        }
        break;
      }

      case 'screenSharingStarted': {
        console.log('Screen sharing started notification received:', data);
        const remotePeerId = data.peerId as string;
        const producerId = data.producerId as string;
        
        if (remotePeerId && producerId) {
          console.log(`Remote peer ${remotePeerId} started screen sharing with producer ${producerId}`);
          // Emit event so UI can react accordingly
          this._emitEvent('remoteScreenShareStarted', { peerId: remotePeerId, producerId });
        }
        break;
      }

      case 'screenSharingStopped': {
        console.log('Screen sharing stopped notification received:', data);
        const remotePeerId = data.peerId as string;
        const producerId = data.producerId as string;
        
        if (remotePeerId && producerId) {
          console.log(`Remote peer ${remotePeerId} stopped screen sharing with producer ${producerId}`);
          
          // Find and remove the screen sharing stream from remoteStreams
          for (const [streamId, streamInfo] of this._state.remoteStreams.entries()) {
            if (streamInfo.peerId === remotePeerId && streamInfo.isScreenShare) {
              console.log(`Removing screen share stream for peer ${remotePeerId}`);
              this._state.remoteStreams.delete(streamId);
              this._emitEvent('remoteStreamRemoved', streamId);
              break;
            }
          }
          
          // Emit event so UI can react accordingly
          this._emitEvent('remoteScreenShareStopped', { peerId: remotePeerId, producerId });
        }
        break;
      }

      default:
        console.log(`Unknown notification method: ${method}`);
    }
  }

  /**
   * Start screen sharing
   * @returns The screen sharing stream
   */
  public async startScreenSharing(): Promise<MediaStream> {
    try {
      // Request screen sharing permissions
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      // Store reference to screen sharing stream
      this._state.screenSharingStream = screenStream;
      
      // Set up event listener for when user stops sharing via browser UI
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenSharing();
      });

      // Publish the screen sharing stream DIRECTLY (don't use _publishStream for screen shares)
      if (this._state.connected && this._state.sendTransport) {
        const videoTrack = screenStream.getVideoTracks()[0];
        
        if (videoTrack) {
          console.log('Publishing screen sharing track:', {
            trackId: videoTrack.id,
            trackLabel: videoTrack.label,
            trackEnabled: videoTrack.enabled
          });
          
          const screenProducer = await this._state.sendTransport.produce({
            track: videoTrack,
            codecOptions: {
              videoGoogleStartBitrate: 1000,
            },
            appData: { 
              mediaType: 'screen',
            }
          });
          
          // Store the screen producer
          this._state.producers.set('screen', screenProducer);
          console.log('Screen producer created with ID:', screenProducer.id);
          
          // Emit screen sharing started event
          this._emitEvent('screenSharingStarted', screenStream);
        }
      }
      
      return screenStream;
    } catch (error: unknown) {
      console.error('Start screen sharing error:', error);
      
      // User might have canceled the screen sharing dialog
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('User canceled screen sharing');
      } else {
        this._emitEvent('error', error);
      }
      
      throw error;
    }
  }
  
  /**
   * Stop screen sharing
   */
  public stopScreenSharing(): void {
    try {
      // Close the screen producer if it exists
      const screenProducer = this._state.producers.get('screen');
      if (screenProducer) {
        // Send request to server to close the producer
        if (this._state.peer) {
          this._state.peer.request('closeProducer', {
            producerId: screenProducer.id
          }).catch(error => {
            console.error('Error closing screen sharing producer on server:', error);
          });
        }
        
        // Close the producer locally
        screenProducer.close();
        this._state.producers.delete('screen');
      }
      
      // Stop all tracks in the screen sharing stream
      if (this._state.screenSharingStream) {
        this._state.screenSharingStream.getTracks().forEach(track => track.stop());
        this._state.screenSharingStream = undefined;
      }
      
      // Emit screen sharing stopped event
      this._emitEvent('screenSharingStopped');
    } catch (error) {
      console.error('Stop screen sharing error:', error);
      this._emitEvent('error', error);
    }
  }
}

export const mediasoupService = new MediasoupService(); 