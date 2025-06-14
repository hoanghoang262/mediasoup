import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomHeader } from '@/features/meeting/components/RoomHeader';
import { MeetingControls } from '@/features/meeting/components/MeetingControls';
import { useCallStore } from '@/store/callStore';

interface RoomLayoutProps {
  /**
   * The room ID
   */
  roomId: string;
  
  /**
   * The user's name
   */
  userName: string;
  
  /**
   * The local media stream
   */
  localStream: MediaStream | null;
  
  /**
   * The content to render in the main area
   */
  children: ReactNode;
}

/**
 * RoomLayout provides the base layout structure for the video conference room
 */
export function RoomLayout({ 
  roomId, 
  userName, 
  localStream, 
  children 
}: RoomLayoutProps) {
  const navigate = useNavigate();
  const { 
    isAudioEnabled, 
    isVideoEnabled, 
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leaveRoom
  } = useCallStore();

  const handleLeaveRoom = async () => {
    await leaveRoom();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      
      <RoomHeader 
        roomId={roomId}
        userName={userName}
        localStream={localStream}
      />
      
      <main className="flex-1 p-6 container mx-auto">
        {children}
      </main>
      
      {/* Fixed position meeting controls */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <MeetingControls 
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          isHost={true}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onLeaveMeeting={handleLeaveRoom}
        />
      </div>
    </div>
  );
} 