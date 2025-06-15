import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { RoomLayout } from '@/components/layout/RoomLayout';
import { UsernamePrompt } from '@/components/forms/UsernamePrompt';
import { useCallStore } from '@/store/callStore';
import { checkServerAndNotify } from '@/utils/serverCheck';
import { toast } from 'sonner';



/**
 * Room page sử dụng Google Meet style layout
 */
export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [localUserName, setLocalUserName] = useState<string>('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [isJoining] = useState(false);
  
  // Check if username is provided in URL or prompt user
  useEffect(() => {
    const userNameFromUrl = searchParams.get('userName');
    if (userNameFromUrl && userNameFromUrl.trim()) {
      setLocalUserName(decodeURIComponent(userNameFromUrl.trim()));
      setShowUsernamePrompt(false);
    } else {
      setShowUsernamePrompt(true);
    }
  }, [searchParams]);

  // Handle username submission from prompt
  const handleUsernameSubmit = (username: string) => {
    setLocalUserName(username);
    setShowUsernamePrompt(false);
    
    // Update URL to include username for future reference
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('userName', encodeURIComponent(username));
    setSearchParams(newSearchParams, { replace: true });
  };
  
  const {
    // State
    localStream,
    remoteStreams,
    users,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionStatus,
    reconnectAttempt,
    
    // Actions
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    setRoomData,
  } = useCallStore();

  // Join room when we have both roomId and username
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    // Only join if we have a username and we're not showing the username prompt
    if (!localUserName || showUsernamePrompt) {
      return;
    }

    const initializeRoom = async () => {
      try {
        // Check server connectivity first
        const serverRunning = await checkServerAndNotify();
        if (!serverRunning) {
          toast.error('Cannot connect to server. Please try again later.');
          return;
        }

        // Set room data and join
        console.log('🚀 Joining room:', roomId, 'as', localUserName);
        setRoomData(roomId, localUserName);
        await joinRoom();
      } catch (error) {
        console.error('❌ Failed to join room:', error);
        toast.error('Failed to join room. Please check your connection.');
      }
    };

    initializeRoom();

    // Cleanup on unmount
    return () => {
      leaveRoom();
    };
  }, [roomId, localUserName, showUsernamePrompt, joinRoom, leaveRoom, navigate, setRoomData]);

  // Handle leave meeting
  const handleLeaveMeeting = async () => {
    try {
      await leaveRoom();
      navigate('/');
    } catch (error) {
      console.error('❌ Failed to leave room:', error);
      // Navigate anyway
      navigate('/');
    }
  };

  // Handle end meeting (host only)
  const handleEndMeeting = async () => {
    try {
      // Could implement end meeting for all participants
      toast.info('End meeting for all participants not implemented yet');
      await handleLeaveMeeting();
    } catch (error) {
      console.error('❌ Failed to end meeting:', error);
    }
  };

  // Show username prompt if no username provided
  if (showUsernamePrompt) {
    return (
      <UsernamePrompt
        roomId={roomId || 'unknown'}
        onUsernameSubmit={handleUsernameSubmit}
        isLoading={isJoining}
      />
    );
  }

  // Show loading state
  if (!roomId) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-2xl mb-4">⚠️</div>
          <div>Invalid room ID</div>
        </div>
      </div>
    );
  }

  // Show loading while connecting (only if we have username)
  if (connectionStatus === 'connecting' && localUserName) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div>Connecting to room...</div>
          <div className="text-sm text-gray-400 mt-2">Room: {roomId}</div>
          <div className="text-sm text-gray-400 mt-1">User: {localUserName}</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (connectionStatus === 'failed') {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-2xl mb-4">❌</div>
          <div className="mb-4">Failed to connect to room</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoomLayout
      roomId={roomId}
      localUserName={localUserName}
      localStream={localStream}
      remoteStreams={Array.from(remoteStreams.values())}
      remoteUserNames={Object.fromEntries(
        Array.from(users.entries()).map(([id, user]) => [id, user.name])
      )}
      userIds={Array.from(users.keys()).filter(id => id !== 'local')}
      
      // Meeting controls state
      isAudioEnabled={isAudioEnabled}
      isVideoEnabled={isVideoEnabled}
      isScreenSharing={isScreenSharing}
      isHost={true} // Could be dynamic based on room settings
      
      // Event handlers
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onToggleScreenShare={toggleScreenShare}
      onLeaveMeeting={handleLeaveMeeting}
      onEndMeeting={handleEndMeeting}
      
      // Connection info
      connectionStatus={connectionStatus}
      reconnectAttempts={reconnectAttempt}
    />
  );
}; 