import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { VideoGrid } from '@/components/media/VideoGrid';
import { MeetingControls } from '@/features/meeting/components/MeetingControls';
import { ConnectionStatus, type ConnectionStats } from '@/components/ui/ConnectionStatus';
import { MeetingSidebar, type ParticipantData } from '@/components/ui/MeetingSidebar';

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
  
  // Event handlers
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
  
  // Connection info
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'failed' | 'reconnecting';
  reconnectAttempts: number;
  
  // MediaSoup service instance for getting real stats
  mediasoupService?: {
    getConnectionStats: () => Promise<{
      latency: number;
      bandwidth: { upload: number; download: number };
      quality: 'excellent' | 'good' | 'fair' | 'poor';
    }>;
  };
  
  // Stats gathering options
  enableRealTimeStats?: boolean; // true = real-time (1s), false = lazy loading
  statsMode?: 'realtime' | 'optimized' | 'lazy'; // More granular control
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
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  connectionStatus,
  reconnectAttempts,
  mediasoupService,
  enableRealTimeStats,
  statsMode,
}: RoomLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [realStats, setRealStats] = useState<{
    latency: number;
    bandwidth: { upload: number; download: number };
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  } | null>(null);
  const [isStatsVisible, setIsStatsVisible] = useState(false);


  // Function to update stats
  const updateStats = useCallback(async () => {
    if (!mediasoupService) return;
    try {
      const stats = await mediasoupService.getConnectionStats();
      setRealStats(stats);
    } catch (error) {
      console.error('Failed to get connection stats:', error);
    }
  }, [mediasoupService]);

  // Update real stats with optimization options
  useEffect(() => {
    if (!mediasoupService || connectionStatus !== 'connected') {
      setRealStats(null);
      return;
    }

    // Determine mode priority: statsMode > enableRealTimeStats > default
    const mode = statsMode || (enableRealTimeStats ? 'realtime' : 'optimized');

    switch (mode) {
      case 'realtime': {
        // 🚀 REAL-TIME MODE: Update every 1 second for live monitoring
        console.log('📊 Real-time stats mode enabled (1s interval)');
        updateStats(); // Initial update
        const realtimeInterval = setInterval(updateStats, 1000);
        return () => clearInterval(realtimeInterval);
      }

      case 'optimized': {
        // ⚡ OPTIMIZED MODE: Update every 10 seconds to save resources
        console.log('⚡ Optimized stats mode enabled (10s interval)');
        updateStats(); // Initial update
        const optimizedInterval = setInterval(updateStats, 10000);
        return () => clearInterval(optimizedInterval);
      }

      case 'lazy': {
        // 💤 LAZY MODE: Only update when stats are visible
    
        if (isStatsVisible) {
          updateStats();
        }
        return; // No interval
      }

      default: {
        // Default to optimized mode
        console.log('⚡ Default optimized stats mode (10s interval)');
        updateStats();
        const defaultInterval = setInterval(updateStats, 10000);
        return () => clearInterval(defaultInterval);
      }
    }
  }, [mediasoupService, connectionStatus, enableRealTimeStats, statsMode, isStatsVisible, updateStats]);

  // Calculate connection stats
  const connectionStats: ConnectionStats = useMemo(() => {
    // Use real stats if available, otherwise fallback to calculated values
    const latency = realStats?.latency ?? (connectionStatus === 'connected' ? 45 : 999);
    const bandwidth = realStats?.bandwidth ?? {
      upload: connectionStatus === 'connected' ? 800 : 0,
      download: connectionStatus === 'connected' ? 1200 : 0,
    };
    const quality = realStats?.quality ?? (() => {
      if (connectionStatus === 'connected') {
        if (reconnectAttempts === 0) return 'excellent';
        if (reconnectAttempts <= 2) return 'good';
        if (reconnectAttempts <= 5) return 'fair';
        return 'poor';
      }
      return 'poor';
    })();

    return {
      status: connectionStatus,
      quality,
      latency,
      bandwidth,
      participants: userIds.length + 1,
      reconnectAttempts,
    };
  }, [connectionStatus, reconnectAttempts, userIds.length, realStats]);

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
          <ConnectionStatus 
            stats={connectionStats} 
            onStatsVisibilityChange={setIsStatsVisible}
          />
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
            localStream={localStream}
            onToggleAudio={onToggleAudio}
            onToggleVideo={onToggleVideo}
            onToggleScreenShare={onToggleScreenShare}
            onLeaveMeeting={onLeaveMeeting}
          />
        </div>
      </footer>

      {/* Device warnings - overlays */}
      {/* Removed device warnings since buttons are now properly disabled when devices are not available */}
      
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