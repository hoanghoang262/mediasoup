import { Peer, WebSocketTransport, type ProtooResponse } from 'protoo-client';
import * as mediasoupClient from 'mediasoup-client';
import { Device } from 'mediasoup-client';
import { toast } from 'sonner';

import type { 
  MediasoupTransportResponse, 
  MediasoupRouterCapabilitiesResponse,
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

  public get state(): ConnectionState {
    return this._state;
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
    // Add debug logging for reconnection-related events
    if (['connected', 'disconnected', 'reconnecting', 'reconnected'].includes(event)) {
      console.log(`Emitting event: ${event}`);
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
        console.log('Already connected to the same room with the same peer ID');
        return;
      }

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

      // Create WebSocket connection
      // Add timestamp to avoid caching issues with the WebSocket connection
      const timestamp = Date.now();
      const protooUrl = `ws://${window.location.hostname}:3000/?roomId=${roomId}&peerId=${peerId}&t=${timestamp}`;
      
      console.log(`Connecting to ${protooUrl}`);
      
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
        
        console.log('Protoo connection opened');
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
        console.log('Protoo connection closed');
        
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

  public async getLocalStream(): Promise<MediaStream> {
    try {
      if (this._state.localStream) {
        return this._state.localStream;
      }

      // Try with video first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        this._state.localStream = stream;
        this._emitEvent('localStream', stream);
        this._emitEvent('mediaAccessStatus', { hasAudio: true, hasVideo: true });

        // If we're already connected, publish the stream
        if (this._state.connected && this._state.sendTransport) {
          await this._publishStream(stream);
        }

        return stream;
      } catch (videoError) {
        console.warn('Failed to get video stream, trying audio only:', videoError);
        
        // Fallback to audio only
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        this._state.localStream = audioOnlyStream;
        this._emitEvent('localStream', audioOnlyStream);
        
        // Emit a special event for camera access failure instead of showing a toast directly
        this._emitEvent('mediaAccessStatus', { hasAudio: true, hasVideo: false, error: 'camera' });

        // If we're already connected, publish the stream
        if (this._state.connected && this._state.sendTransport) {
          await this._publishStream(audioOnlyStream);
        }

        return audioOnlyStream;
      }
    } catch (error) {
      console.error('Get local stream error:', error);
      this._emitEvent('error', error);
      
      // Emit a special event for complete media access failure
      this._emitEvent('mediaAccessStatus', { hasAudio: false, hasVideo: false, error: 'all' });
      
      throw error;
    }
  }

  private async _joinRoom(): Promise<void> {
    try {
      if (!this._state.peer) {
        throw new Error('Peer connection not established');
      }

      // Get router RTP capabilities
      const response = await this._state.peer.request('getRouterRtpCapabilities');
      const { rtpCapabilities } = response as unknown as MediasoupRouterCapabilitiesResponse;

      // Create device (client endpoint for mediasoup)
      this._state.device = new Device();

      // Load device with router capabilities
      await this._state.device.load({
        routerRtpCapabilities: rtpCapabilities,
      });

      // No need to send 'join' request - the backend already adds participants when WebSocket connects
      console.log('Connected to room successfully');

      // IMPORTANT: Create the receive transport first to ensure it's ready when newConsumer notifications arrive
      await this._createRecvTransport();

      // Then create the send transport and publish local media
      await this._createSendTransport();

      // Now we're ready to get our media
      const stream = await this.getLocalStream();

      // Publish our stream to the room
      await this._publishStream(stream);

      // Update connection status
      this._state.connected = true;
      this._updateConnectionStatus('connected');

      // Process any notifications that were queued while we were initializing
      this._processQueuedNotifications();

      // Request a list of existing participants from the server
      try {
        const participantsResponse = await this._state.peer.request('getParticipants');
        const { participants } = participantsResponse as unknown as { participants: string[] };
        
        console.log('Received current participants list:', participants);
        
        // Add each participant to our set and emit events
        participants.forEach(participantId => {
          if (participantId !== this._state.peerId) {
            this._state.remotePeers.add(participantId);
            // Emit participant joined event for each existing participant
            this._emitEvent('participantJoined', participantId);
          }
        });
      } catch (error) {
        console.error('Failed to get participants list:', error);
      }
    } catch (error) {
      console.error('Join room error:', error);
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

      // Use fewer, more reliable STUN/TURN servers to avoid Firefox warnings
      // Firefox warns when using 5+ servers as it slows down discovery
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add free TURN servers from Google
        {
          urls: 'turn:relay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:relay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:relay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ];

      console.log('Creating send transport with ICE servers:', iceServers);

      // Create the local send transport
      this._state.sendTransport = this._state.device.createSendTransport({
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        iceServers,
        // Try all connection methods
        iceTransportPolicy: 'all',
        additionalSettings: {
          iceCheckingTimeout: 15000, // Increase timeout to 15 seconds
          iceTrickle: true
        }
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
              
              console.log('Send transport connected successfully');
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

      console.log('Creating receive transport...');
      
      // Request server to create a WebRTC transport
      const transportResponse = await this._state.peer.request('createWebRtcTransport', {
        producing: false,
        consuming: true,
      });
      
      const { id, iceParameters, iceCandidates, dtlsParameters } = 
        transportResponse as unknown as MediasoupTransportResponse;

      // Use fewer, more reliable STUN/TURN servers to avoid Firefox warnings
      // Firefox warns when using 5+ servers as it slows down discovery
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add free TURN servers from Google
        {
          urls: 'turn:relay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:relay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:relay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ];

      console.log('Creating receive transport with ICE servers:', iceServers);

      // Create the local receive transport
      this._state.recvTransport = this._state.device.createRecvTransport({
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        iceServers,
        // Use more lenient ICE settings
        iceTransportPolicy: 'all',
        additionalSettings: {
          encodedInsertableStreams: false, // Don't use insertable streams
          iceCheckingTimeout: 15000, // Longer timeout for ICE connectivity checks
        },
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

      // Publish audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioProducer = await this._state.sendTransport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
          },
        });
        this._state.producers.set('audio', audioProducer);
      }

      // Publish video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const videoProducer = await this._state.sendTransport.produce({
          track: videoTrack,
          codecOptions: {
            videoGoogleStartBitrate: 1000,
          },
        });
        this._state.producers.set('video', videoProducer);
      }
    } catch (error) {
      console.error('Publish stream error:', error);
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

        const consumerId = data.consumerId as string;
        const producerId = data.producerId as string;
        const kind = data.kind as mediasoupClient.types.MediaKind;
        const rtpParameters = data.rtpParameters as mediasoupClient.types.RtpParameters;
        const appData = data.appData as Record<string, unknown>;
        const remotePeerId = data.peerId as string;

        console.log('Processing newConsumer notification:', { 
          consumerId, 
          producerId, 
          kind, 
          appData,
          remotePeerId
        });

        // Ensure the remote peer is in our list of participants
        if (remotePeerId && remotePeerId !== this._state.peerId) {
          if (!this._state.remotePeers.has(remotePeerId)) {
            console.log(`Adding missing remote peer from consumer: ${remotePeerId}`);
            this._state.remotePeers.add(remotePeerId);
            this._emitEvent('participantJoined', remotePeerId);
          }
        }

        // Create consumer with retry mechanism
        let retryCount = 0;
        const maxRetries = 3;
        
        const tryCreateConsumer = async (): Promise<void> => {
          try {
            if (!this._state.recvTransport || !this._state.peer) {
              throw new Error('Receive transport or Peer not available');
            }
            
            const consumer = await this._state.recvTransport.consume({
              id: consumerId,
              producerId,
              kind,
              rtpParameters,
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
            };
            this._state.remoteStreams.set(producerId, streamInfo);
            
            console.log('Remote stream added:', {
              id: producerId,
              isScreenShare: streamInfo.isScreenShare,
              trackKind: streamInfo.track.kind,
              trackId: streamInfo.track.id
            });
            
            // Emit event with the new stream
            this._emitEvent('remoteStreamAdded', streamInfo);

            // Notify the server that we're ready to receive the stream
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

      // Publish the screen sharing stream
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