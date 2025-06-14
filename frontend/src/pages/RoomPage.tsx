import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { VideoGrid } from '@/components/media/VideoGrid';
import { RoomLayout } from '@/components/layout/RoomLayout';
import { LoadingScreen, EmptyRoomState, ParticipantsList } from '@/components/ui';
import { useCallStore } from '@/store/callStore';
import { checkServerAndNotify } from '@/utils/serverCheck';
import { mediasoupService } from '@/services/MediasoupService';

// Track toast IDs to prevent duplicates
const activeToastIds = new Set<string>();

// Maximum time to wait in loading state before showing retry option (in ms)
const MAX_LOADING_TIME = 20000; // 20 seconds

/**
 * RoomPage is the main page for the video conference room
 */
export function RoomPage() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const urlUserName = searchParams.get('userName');
  
  const { 
    roomId, 
    userName, 
    setRoomData,
    joinRoom, 
    leaveRoom,
    localStream, 
    remoteStreams,
    users,
    isJoining, 
    isConnected,
    connectionStatus
  } = useCallStore();
  const [serverChecked, setServerChecked] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [allParticipantIds, setAllParticipantIds] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number>(0);
  const [showRetry, setShowRetry] = useState(false);
  
  // Generate a list of users for the participants list
  const usersList = Array.from(users.values()).map(user => ({
    id: user.id,
    name: user.name
  }));
  
  // Create a mapping of peer IDs to names
  const remoteUserNames: Record<string, string> = {};
  users.forEach((user) => {
    remoteUserNames[user.id] = user.name;
  });

  // Reset loading timer when joining state changes
  useEffect(() => {
    if (isJoining) {
      setLoadingStartTime(Date.now());
      setShowRetry(false);
      
      // Set a timeout to show retry button after MAX_LOADING_TIME
      const timeoutId = setTimeout(() => {
        if (isJoining && !isConnected) {
          setShowRetry(true);
        }
      }, MAX_LOADING_TIME);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isJoining, isConnected]);

  useEffect(() => {
    // Get roomId and userName from URL
    if (!urlRoomId || !urlUserName) {
      console.log('Missing roomId or userName in URL, redirecting to join page');
      navigate('/');
      return;
    }

    // Set room data in store if not already set or different
    if (roomId !== urlRoomId || userName !== urlUserName) {
      console.log('Setting room data:', { roomId: urlRoomId, userName: urlUserName });
      setRoomData(urlRoomId, urlUserName);
    }
  }, [urlRoomId, urlUserName, roomId, userName, setRoomData, navigate]);

  useEffect(() => {
    // Only proceed if we have room data set in store
    if (!roomId || !userName) {
      return;
    }

    // Check if the server is running before attempting to join
    const checkServer = async () => {
      const isRunning = await checkServerAndNotify();
      setServerChecked(true);
      
      if (isRunning) {
        // Join the room only if the server is running
        joinRoom();
      } else {
        // Show error and provide a retry button
        const toastId = 'connection-failed';
        
        // Only show toast if it's not already displayed
        if (!activeToastIds.has(toastId)) {
          activeToastIds.add(toastId);
          
          toast.error('Unable to connect to server', {
            id: toastId,
            description: 'The connection to the video conferencing server failed.',
            action: {
              label: 'Retry',
              onClick: () => checkServer(),
            },
            duration: 0, // Persistent notification
            onDismiss: () => {
              activeToastIds.delete(toastId);
            }
          });
        }
      }
    };
    
    checkServer();

    // Setup participant tracking
    const handleParticipantJoined = (...args: unknown[]) => {
      const peerId = args[0];
      if (typeof peerId === 'string') {
        // Track in participants list
        setParticipants(prev => {
          if (!prev.includes(peerId)) {
            return [...prev, peerId];
          }
          return prev;
        });
        
        // Also add to comprehensive ID list used for the grid
        setAllParticipantIds(prev => {
          if (!prev.includes(peerId)) {
            return [...prev, peerId];
          }
          return prev;
        });
      }
    };

    const handleParticipantLeft = (...args: unknown[]) => {
      const peerId = args[0];
      if (typeof peerId === 'string') {
        // Remove from both lists
        setParticipants(prev => prev.filter(id => id !== peerId));
        setAllParticipantIds(prev => prev.filter(id => id !== peerId));
      }
    };

    // Listen for participant events
    mediasoupService.addEventListener('participantJoined', handleParticipantJoined);
    mediasoupService.addEventListener('participantLeft', handleParticipantLeft);

    // Initialize with current remotePeers from service
    const currentPeers = Array.from(mediasoupService.state.remotePeers);
    setParticipants(currentPeers);
    setAllParticipantIds(currentPeers);

    // Cleanup listeners on unmount and leave the room
    return () => {
      mediasoupService.removeEventListener('participantJoined', handleParticipantJoined);
      mediasoupService.removeEventListener('participantLeft', handleParticipantLeft);
      
      // Leave the room when component unmounts to clean up connections
      leaveRoom();
    };
  }, [roomId, userName, joinRoom, leaveRoom, navigate]);

  // Create an array from the remote streams Map
  const remoteStreamsArray = Array.from(remoteStreams.values());

  // Toggle the invite modal
  const toggleInviteModal = () => {
    setShowInviteModal(!showInviteModal);
  };

  // Function to handle retry
  const handleRetry = () => {
    // Reset connection state and try again
    leaveRoom();
    joinRoom();
  };

  // Render loading screen if not connected yet
  if (!serverChecked || (isJoining && !isConnected)) {
    // Calculate how long we've been loading
    const loadingTime = Date.now() - loadingStartTime;
    const loadingTooLong = loadingTime > MAX_LOADING_TIME;
    
    let loadingTitle = !serverChecked ? 'Checking server...' : 'Joining meeting...';
    let loadingDescription = !serverChecked 
      ? 'Verifying connection to media server' 
      : 'Setting up your secure connection';
    
    // If connection failed or taking too long, update message
    if (connectionStatus === 'failed' || loadingTooLong) {
      loadingTitle = 'Connection problem';
      loadingDescription = 'Having trouble connecting to the meeting room';
    }
    
    return (
      <RoomLayout roomId={roomId || ''} userName={userName || ''} localStream={null}>
        <LoadingScreen 
          title={loadingTitle}
          description={loadingDescription}
          showRetry={showRetry || connectionStatus === 'failed'}
          onRetry={handleRetry}
        />
      </RoomLayout>
    );
  }

  // Render the room when connected
  return (
    <RoomLayout roomId={roomId} userName={userName} localStream={localStream}>
      <div className="py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Meeting Room</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {participants.length === 0 
                ? 'You are the only one here' 
                : `${participants.length + 1} participants in the room`}
            </p>
          </div>
          
          <button 
            onClick={toggleInviteModal}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite
          </button>
        </div>
        
        {/* Video grid with all participants */}
        <VideoGrid
          localStream={localStream}
          localUserName={userName}
          remoteStreams={remoteStreamsArray}
          remoteUserNames={remoteUserNames}
          userIds={allParticipantIds}
        />
        
        {/* Invite others modal (replaced EmptyRoomState) */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={toggleInviteModal}>
            <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-medium mb-4">Invite others to this room</h3>
              <EmptyRoomState roomId={roomId} />
              <div className="mt-6 flex justify-end">
                <button 
                  className="px-4 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm font-medium"
                  onClick={toggleInviteModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Participants list (floating panel) */}
        <ParticipantsList 
          users={usersList}
          roomId={roomId}
        />
      </div>
    </RoomLayout>
  );
} 