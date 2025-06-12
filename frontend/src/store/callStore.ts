import { create } from 'zustand';
import { mediasoupService, type MediaStreamInfo, type ConnectionState } from '@/services/MediasoupService';
import { toast } from 'sonner';

// Track toast IDs to prevent duplicates
const activeToastIds = new Set<string>();

interface User {
  id: string;
  name: string;
}

interface CallState {
  roomId: string;
  userName: string;
  isConnected: boolean;
  isJoining: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStreamInfo>;
  users: Map<string, User>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  screenSharingStream: MediaStream | null;
  connectionStatus: ConnectionState['connectionStatus'];
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  lastToastId: string | null;
  
  // Actions
  joinRoom: () => void;
  leaveRoom: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  setUserName: (name: string) => void;
  setRoomId: (id: string) => void;
}

// Helper to generate a user-friendly name from a peer ID
const generateUserNameFromPeerId = (peerId: string): string => {
  const prefixes = ['Guest', 'User', 'Visitor', 'Attendee', 'Member'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const shortId = peerId.substring(0, 4);
  return `${prefix}-${shortId}`;
};

export const useCallStore = create<CallState>((set, get) => ({
  roomId: '',
  userName: '',
  isConnected: false,
  isJoining: false,
  localStream: null,
  remoteStreams: new Map(),
  users: new Map([['local', { id: 'local', name: 'You' }]]),
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  screenSharingStream: null,
  connectionStatus: 'disconnected',
  reconnectAttempt: 0,
  maxReconnectAttempts: 3,
  lastToastId: null,
  
  joinRoom: async () => {
    const { roomId, userName } = get();
    
    if (!roomId || !userName) {
      console.error('Room ID and username must be provided');
      return;
    }
    
    set({ isJoining: true });
    
    // Add a connection timeout to prevent getting stuck on the loading screen
    const connectionTimeout = setTimeout(() => {
      if (get().isJoining && !get().isConnected) {
        console.error('Connection timeout reached after 15 seconds');
        
        // Show error toast
        const toastId = 'connection-timeout';
        if (!activeToastIds.has(toastId)) {
          activeToastIds.add(toastId);
          
          toast.error('Connection timeout', {
            id: toastId,
            description: 'Failed to connect after 15 seconds. Please try again.',
            action: {
              label: 'Retry',
              onClick: get().joinRoom
            },
            onDismiss: () => {
              activeToastIds.delete(toastId);
            }
          });
        }
        
        // Reset joining state
        set({ isJoining: false });
      }
    }, 15000); // 15 second timeout
    
    try {
      // Set up event listeners for connection state
      mediasoupService.addEventListener('connectionStatus', (status: unknown) => {
        if (typeof status === 'string') {
          console.log('Connection status changed:', status);
          set({ connectionStatus: status as ConnectionState['connectionStatus'] });
          
          // Clear timeout if we got a definitive connection status
          if (status === 'connected' || status === 'failed') {
            clearTimeout(connectionTimeout);
          }
          
          // Update isJoining state when we get a definitive status
          if (status === 'connected') {
            set({ isJoining: false, isConnected: true });
            toast.success('Connected to meeting room');
          } else if (status === 'failed') {
            set({ isJoining: false, isConnected: false });
          }
        }
      });
      
      // Set up event listeners for connection state
      mediasoupService.addEventListener('connectionstatechange', (...args: unknown[]) => {
        if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
          const state = args[0] as ConnectionState;
          
          set({
            isConnected: state.connected,
            connectionStatus: state.connectionStatus,
            reconnectAttempt: state.reconnectAttempt
          });
          
          // Clear timeout if we got a definitive connection status
          if (state.connectionStatus === 'connected' || state.connectionStatus === 'failed') {
            clearTimeout(connectionTimeout);
          }
          
          // Update isJoining state when we get a definitive status
          if (state.connectionStatus === 'connected') {
            set({ isJoining: false });
          } else if (state.connectionStatus === 'failed') {
            set({ isJoining: false });
          }
          
          // Handle connection status changes
          if (state.connectionStatus === 'connected') {
            // Show a success message
            toast.success('Connected to meeting room');
          } else if (state.connectionStatus === 'disconnected') {
            // Show disconnected message if we were previously connected
            if (get().isConnected) {
              const toastId = 'disconnected';
              
              if (!activeToastIds.has(toastId)) {
                activeToastIds.add(toastId);
                
                toast.error('Disconnected from the room', {
                  id: toastId,
                  description: 'The connection to the server has been lost.',
                  action: {
                    label: 'Reconnect',
                    onClick: get().joinRoom
                  },
                  onDismiss: () => {
                    activeToastIds.delete(toastId);
                  }
                });
              }
            }
          } else if (state.connectionStatus === 'failed') {
            // Show failure message
            const toastId = 'connection-failed';
            
            if (!activeToastIds.has(toastId)) {
              activeToastIds.add(toastId);
              
              toast.error('Connection failed', {
                id: toastId,
                description: `Unable to connect to the room (Attempt ${state.reconnectAttempt}/${get().maxReconnectAttempts}).`,
                action: state.reconnectAttempt < get().maxReconnectAttempts ? {
                  label: 'Retry',
                  onClick: get().joinRoom
                } : undefined,
                onDismiss: () => {
                  activeToastIds.delete(toastId);
                }
              });
            }
          }
        }
      });
      
      // Handle local stream
      mediasoupService.addEventListener('localStream', (...args: unknown[]) => {
        if (args.length > 0 && args[0] instanceof MediaStream) {
          set({ localStream: args[0] });
        }
      });
      
      // Handle remote streams
      mediasoupService.addEventListener('remoteStream', (...args: unknown[]) => {
        if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
          const streamInfo = args[0] as MediaStreamInfo;
          
          set(state => {
            const updatedStreams = new Map(state.remoteStreams);
            updatedStreams.set(streamInfo.id, streamInfo);
            return { remoteStreams: updatedStreams };
          });
        }
      });
      
      // Handle remote stream removal
      mediasoupService.addEventListener('remoteStreamRemoved', (...args: unknown[]) => {
        if (args.length > 0 && typeof args[0] === 'string') {
          const producerId = args[0];
          
          set(state => {
            const updatedStreams = new Map(state.remoteStreams);
            updatedStreams.delete(producerId);
            return { remoteStreams: updatedStreams };
          });
        }
      });
      
      // Handle participant join
      mediasoupService.addEventListener('participantJoined', (...args: unknown[]) => {
        if (args.length > 0 && typeof args[0] === 'string') {
          const peerId = args[0];
          const peerInfo = args.length > 1 ? args[1] : null;
          
          set(state => {
            const updatedUsers = new Map(state.users);
            updatedUsers.set(peerId, {
              id: peerId,
              // Use the peer name if available, otherwise generate one
              name: peerInfo && typeof peerInfo === 'object' && peerInfo !== null && 'name' in peerInfo
                ? String(peerInfo.name)
                : generateUserNameFromPeerId(peerId)
            });
            return { users: updatedUsers };
          });
        }
      });
      
      // Handle participant leave
      mediasoupService.addEventListener('participantLeft', (...args: unknown[]) => {
        if (args.length > 0 && typeof args[0] === 'string') {
          const peerId = args[0];
          
          set(state => {
            const updatedUsers = new Map(state.users);
            updatedUsers.delete(peerId);
            return { users: updatedUsers };
          });
        }
      });
      
      // Event listeners
      mediasoupService.addEventListener('error', (...args: unknown[]) => {
        const error = args[0];
        console.error('MediasoupService error:', error);
        toast.error('Connection error', { 
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      });
      
      // Track remote streams
      mediasoupService.addEventListener('remoteStreamAdded', (...args: unknown[]) => {
        if (args.length > 0 && typeof args[0] === 'object') {
          const streamInfo = args[0] as MediaStreamInfo;
          
          set(state => {
            const updatedStreams = new Map(state.remoteStreams);
            updatedStreams.set(streamInfo.id, streamInfo);
            
            // If this is a screen share, show a toast notification
            if (streamInfo.isScreenShare) {
              toast.info('Someone started sharing their screen');
            }
            
            return { remoteStreams: updatedStreams };
          });
        }
      });
      
      mediasoupService.addEventListener('remoteStreamRemoved', (...args: unknown[]) => {
        const streamId = args[0];
        if (typeof streamId === 'string') {
          set(state => {
            const updatedStreams = new Map(state.remoteStreams);
            
            // Check if this was a screen share
            const removedStream = updatedStreams.get(streamId);
            if (removedStream?.isScreenShare) {
              toast.info('Screen sharing ended');
            }
            
            updatedStreams.delete(streamId);
            return { remoteStreams: updatedStreams };
          });
        }
      });
      
      // Event listeners for screen sharing
      mediasoupService.addEventListener('remoteScreenShareStarted', (...args: unknown[]) => {
        if (args.length > 0 && typeof args[0] === 'object') {
          const data = args[0] as {peerId: string; producerId: string};
          toast.info(`${get().users.get(data.peerId)?.name || 'Someone'} started sharing their screen`);
        }
      });
      
      mediasoupService.addEventListener('remoteScreenShareStopped', (...args: unknown[]) => {
        if (args.length > 0 && typeof args[0] === 'object') {
          const data = args[0] as {peerId: string; producerId: string};
          toast.info(`${get().users.get(data.peerId)?.name || 'Someone'} stopped sharing their screen`);
        }
      });
      
      // Connect to the room
      await mediasoupService.connect(roomId, userName);
      
      // Add self to users map
      set(state => {
        const updatedUsers = new Map(state.users);
        updatedUsers.set('local', {
          id: 'local',
          name: userName
        });
        return { users: updatedUsers };
      });
      
    } catch (error) {
      // Clear the connection timeout
      clearTimeout(connectionTimeout);
      
      console.error('Failed to join room:', error);
      
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const toastId = 'join-error';
      
      if (!activeToastIds.has(toastId)) {
        activeToastIds.add(toastId);
        
        toast.error('Failed to join room', {
          id: toastId,
          description: errorMessage,
          action: {
            label: 'Retry',
            onClick: get().joinRoom
          },
          onDismiss: () => {
            activeToastIds.delete(toastId);
          }
        });
      }
      
      set({ isJoining: false });
    }
  },
  
  leaveRoom: () => {
    // Disconnect from the room
    mediasoupService.disconnect();
    
    // Reset state
    set({
      isConnected: false,
      isJoining: false,
      localStream: null,
      remoteStreams: new Map(),
      users: new Map(),
      connectionStatus: 'disconnected',
      reconnectAttempt: 0
    });
  },
  
  toggleAudio: () => {
    const { localStream, isAudioEnabled } = get();
    
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      
      set({ isAudioEnabled: !isAudioEnabled });
      
      // Show toast notification
      const toastId = !isAudioEnabled ? 'audio-on' : 'audio-off';
      if (!activeToastIds.has(toastId)) {
        activeToastIds.add(toastId);
        
        toast.info(!isAudioEnabled ? 'Microphone turned on' : 'Microphone turned off', {
          id: toastId,
          duration: 2000,
          onDismiss: () => {
            activeToastIds.delete(toastId);
          }
        });
      }
    }
  },
  
  toggleVideo: () => {
    const { localStream, isVideoEnabled } = get();
    
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      
      set({ isVideoEnabled: !isVideoEnabled });
      
      // Show toast notification
      const toastId = !isVideoEnabled ? 'video-on' : 'video-off';
      if (!activeToastIds.has(toastId)) {
        activeToastIds.add(toastId);
        
        toast.info(!isVideoEnabled ? 'Camera turned on' : 'Camera turned off', {
          id: toastId,
          duration: 2000,
          onDismiss: () => {
            activeToastIds.delete(toastId);
          }
        });
      }
    }
  },
  
  toggleScreenShare: async () => {
    const { isScreenSharing, screenSharingStream } = get();
    
    if (isScreenSharing && screenSharingStream) {
      // Stop screen sharing
      mediasoupService.stopScreenSharing();
      set({ 
        isScreenSharing: false,
        screenSharingStream: null
      });
      
      // Show toast notification
      const toastId = 'screen-share-off';
      if (!activeToastIds.has(toastId)) {
        activeToastIds.add(toastId);
        
        toast.info('Screen sharing stopped', {
          id: toastId,
          duration: 2000,
          onDismiss: () => {
            activeToastIds.delete(toastId);
          }
        });
      }
    } else {
      try {
        // Start screen sharing
        const stream = await mediasoupService.startScreenSharing();
        
        set({ 
          isScreenSharing: true,
          screenSharingStream: stream
        });
        
        // Add event listener for when screen sharing stops
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          // This is triggered when the user clicks "Stop sharing" in the browser UI
          mediasoupService.stopScreenSharing();
          
          set({ 
            isScreenSharing: false,
            screenSharingStream: null
          });
          
          // Show toast notification
          const toastId = 'screen-share-ended';
          if (!activeToastIds.has(toastId)) {
            activeToastIds.add(toastId);
            
            toast.info('Screen sharing ended', {
              id: toastId,
              duration: 2000,
              onDismiss: () => {
                activeToastIds.delete(toastId);
              }
            });
          }
        });
        
        // Show toast notification
        const toastId = 'screen-share-on';
        if (!activeToastIds.has(toastId)) {
          activeToastIds.add(toastId);
          
          toast.success('Screen sharing started', {
            id: toastId,
            duration: 2000,
            onDismiss: () => {
              activeToastIds.delete(toastId);
            }
          });
        }
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
        // Show error toast only if it's not a user cancellation
        if (error instanceof Error && error.name !== 'NotAllowedError') {
          toast.error('Failed to start screen sharing. Please try again.');
        }
      }
    }
  },
  
  setUserName: (name: string) => {
    set({ userName: name });
  },
  
  setRoomId: (id: string) => {
    set({ roomId: id });
  }
})); 