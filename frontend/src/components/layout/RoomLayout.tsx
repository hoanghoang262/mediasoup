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
      {/* 📍 PHẦN 1: HEADER SIMPLE - không giống navbar */}
      <header className="flex items-center justify-between px-6 py-3 bg-background border-b border-border">
        {/* Left - Room info */}
        <div className="flex items-center gap-3">
          <div className="text-foreground">
            <h1 className="font-medium text-base">{roomId}</h1>
          </div>
        </div>

        {/* Center - Connection Status - đưa ra đây để không bị che */}
        <div className="flex items-center gap-3">
          <ConnectionStatus stats={connectionStats} />
        </div>

        {/* Right - Sidebar toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
              'hover:bg-muted text-muted-foreground hover:text-foreground',
              sidebarOpen && 'bg-muted text-foreground'
            )}
            title="Participants"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
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

      {/* 📍 PHẦN 4: BOTTOM CONTROLS - FULL WIDTH như header */}
      <footer className="flex items-center justify-center px-6 py-4 bg-background border-t border-border">
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
      </footer>

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