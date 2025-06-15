import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { VideoGrid } from '@/components/media/VideoGrid';
import { MeetingControls } from '@/features/meeting/components/MeetingControls';
import { ConnectionStatus, type ConnectionStats } from '@/components/ui/ConnectionStatus';
import { MeetingSidebar, type ParticipantData } from '@/components/ui/MeetingSidebar';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import type { MediaStreamInfo } from '@/services/MediasoupService';

interface RoomLayoutProps {
  roomId: string;
  localUserName: string;
  localStream: MediaStream | null;
  remoteStreams: MediaStreamInfo[];
  remoteUserNames: Record<string, string>;
  userIds: string[];
  
  // Meeting controls
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  
  // Event handlers
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
  onEndMeeting?: () => void;
  
  // Connection info
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'failed' | 'reconnecting';
  reconnectAttempts: number;
}

/**
 * 4-part layout: Header Top | Sidebar | Video Center | Controls Bottom
 */
export function RoomLayout({
  roomId,
  localUserName,
  localStream,
  remoteStreams,
  remoteUserNames,
  userIds,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isHost,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  onEndMeeting,
  connectionStatus,
  reconnectAttempts,
}: RoomLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasCamera, hasMicrophone } = useMediaDevices();

  // Calculate connection stats
  const connectionStats: ConnectionStats = useMemo(() => {
    const getQuality = (): ConnectionStats['quality'] => {
      if (connectionStatus === 'connected') {
        if (reconnectAttempts === 0) return 'excellent';
        if (reconnectAttempts <= 2) return 'good';
        if (reconnectAttempts <= 5) return 'fair';
        return 'poor';
      }
      return 'poor';
    };

    return {
      status: connectionStatus,
      quality: getQuality(),
      latency: Math.floor(Math.random() * 100) + 20,
      bandwidth: {
        upload: Math.floor(Math.random() * 1000) + 500,
        download: Math.floor(Math.random() * 2000) + 1000,
      },
      participants: userIds.length + 1,
      reconnectAttempts,
    };
  }, [connectionStatus, reconnectAttempts, userIds.length]);

  // Prepare participant data for sidebar
  const participantData: ParticipantData[] = useMemo(() => {
    const participants: ParticipantData[] = [];

    // Add local participant
    participants.push({
      id: 'local',
      name: localUserName,
      isLocal: true,
      hasAudio: isAudioEnabled,
      hasVideo: isVideoEnabled,
      isScreenSharing: isScreenSharing,
      connectionQuality: connectionStats.quality,
    });

    // Add remote participants
    userIds.forEach(userId => {
      const hasAudio = remoteStreams.some(s => 
        s.peerId === userId && !s.isScreenShare && s.track?.kind === 'audio' && s.track?.enabled
      );
      const hasVideo = remoteStreams.some(s => 
        s.peerId === userId && !s.isScreenShare && s.track?.kind === 'video' && s.track?.enabled
      );
      const isRemoteScreenSharing = remoteStreams.some(s => 
        s.peerId === userId && s.isScreenShare
      );

      const rawUserName = remoteUserNames[userId] || userId.substring(0, 8);
      const userName = rawUserName.startsWith('User ') ? rawUserName.substring(5) : rawUserName;

      participants.push({
        id: userId,
        name: userName,
        isLocal: false,
        hasAudio,
        hasVideo,
        isScreenSharing: isRemoteScreenSharing,
        connectionQuality: 'good',
      });
    });

    return participants;
  }, [
    localUserName, isAudioEnabled, isVideoEnabled, isScreenSharing,
    userIds, remoteStreams, remoteUserNames, connectionStats.quality
  ]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* 📍 PHẦN 1: HEADER TRÊN */}
      <header className="flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b border-border shadow-lg">
        {/* Left - Room info */}
        <div className="flex items-center gap-4">
          <div className="text-foreground">
            <h1 className="font-semibold text-lg">Meeting Room</h1>
            <p className="text-sm text-muted-foreground">Room: {roomId}</p>
          </div>
        </div>

        {/* Center - Time */}
        <div className="flex items-center gap-4">
          <div className="text-foreground text-base font-medium">
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Right - Status & Sidebar toggle */}
        <div className="flex items-center gap-3">
          <ConnectionStatus stats={connectionStats} />
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200',
              'hover:scale-105 transform shadow-lg',
              sidebarOpen 
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground ring-2 ring-primary/50' 
                : 'bg-secondary hover:bg-secondary/90 text-secondary-foreground ring-2 ring-border'
            )}
            title="Show meeting details"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA - 3 phần còn lại */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 📍 PHẦN 3: VIDEO Ở GIỮA */}
        <main className={cn(
          'flex-1 flex flex-col bg-gradient-to-br from-background via-muted/20 to-background',
          'transition-all duration-300',
          sidebarOpen ? 'mr-80' : 'mr-0'
        )}>
          
          {/* Video area - chiếm không gian còn lại */}
          <div className="flex-1 p-6 overflow-hidden">
            <VideoGrid
              localStream={localStream}
              localUserName={localUserName}
              remoteStreams={remoteStreams}
              remoteUserNames={remoteUserNames}
              userIds={userIds}
            />
          </div>
          
          {/* 📍 PHẦN 4: CONTROLS Ở BOTTOM GIỮA */}
          <div className="flex justify-center p-6 bg-gradient-to-t from-background/90 to-transparent">
            <div className="relative z-50">
              <MeetingControls
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isScreenSharing={isScreenSharing}
                isHost={isHost}
                onToggleAudio={onToggleAudio}
                onToggleVideo={onToggleVideo}
                onToggleScreenShare={onToggleScreenShare}
                onLeaveMeeting={onLeaveMeeting}
                onEndMeeting={onEndMeeting}
              />
            </div>
          </div>
          
        </main>

        {/* 📍 PHẦN 2: SIDEBAR BÊN PHẢI */}
        <MeetingSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          participants={participantData}
          connectionStats={connectionStats}
          roomId={roomId}
        />
      </div>

      {/* Device warnings - overlays */}
      {!hasCamera && !hasMicrophone && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]">
          <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg">
            ⚠️ No camera or microphone detected
          </div>
        </div>
      )}
      
      {!hasCamera && hasMicrophone && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg">
            📷 No camera detected - audio only
          </div>
        </div>
      )}

      {hasCamera && !hasMicrophone && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg">
            🎤 No microphone detected - video only
          </div>
        </div>
      )}

      {/* Connection warnings */}
      {connectionStatus === 'reconnecting' && (
        <div className="fixed top-20 right-6 z-[100]">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Reconnecting...
          </div>
        </div>
      )}

      {(connectionStatus === 'disconnected' || connectionStatus === 'failed') && (
        <div className="fixed top-20 right-6 z-[100]">
          <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg">
            ❌ Connection lost
          </div>
        </div>
      )}
    </div>
  );
} 