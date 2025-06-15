import { type MediaStreamInfo } from '@/services/MediasoupService';
import { VideoStream } from './VideoStream';
import { useCallStore } from '@/store/callStore';

interface VideoGridProps {
  /**
   * The local stream
   */
  localStream: MediaStream | null;
  
  /**
   * The local user's name
   */
  localUserName: string;
  
  /**
   * The remote streams
   */
  remoteStreams: MediaStreamInfo[];
  
  /**
   * The names of remote users
   */
  remoteUserNames: Record<string, string>;
  
  /**
   * All user IDs in the room (including those without streams)
   */
  userIds: string[];
}

/**
 * VideoGrid displays multiple video streams in a responsive grid layout
 * Compatible with new shared VideoStream component
 */
export function VideoGrid({ 
  localStream, 
  localUserName, 
  remoteStreams,
  remoteUserNames,
  userIds
}: VideoGridProps) {
  const { screenSharingStream, isScreenSharing } = useCallStore();

  // Debug logging
  console.log('🎥 VideoGrid render:', {
    userIds,
    remoteStreamsCount: remoteStreams.length,
    remoteStreams: remoteStreams.map(s => ({ 
      id: s.id, 
      peerId: s.peerId, 
      isScreenShare: s.isScreenShare, 
      kind: s.track?.kind,
      trackId: s.track?.id
    })),
    remoteUserNames
  });

  // Find remote screen shares với debug chi tiết
  console.log('🔍 Filtering for screen shares...');
  const remoteScreenShares = remoteStreams.filter((stream, index) => {
    console.log(`🔍 Stream ${index}:`, {
      id: stream.id,
      peerId: stream.peerId,
      isScreenShare: stream.isScreenShare,
      trackKind: stream.track?.kind,
      willInclude: stream.isScreenShare
    });
    return stream.isScreenShare;
  });
  
  console.log('🖥️ Screen shares found:', {
    localScreenSharing: isScreenSharing,
    totalRemoteStreams: remoteStreams.length,
    remoteScreenSharesCount: remoteScreenShares.length,
    remoteScreenShares: remoteScreenShares.map(s => ({ 
      id: s.id, 
      peerId: s.peerId, 
      trackKind: s.track?.kind,
      isScreenShare: s.isScreenShare
    }))
  });

  // Calculate total participants
  const totalParticipants = userIds.length + 1; // +1 for local user
  
  // Determine grid layout based on participant count
  let gridClassName = 'grid gap-6';
  
  if (totalParticipants <= 1) {
    gridClassName += ' grid-cols-1';
  } else if (totalParticipants === 2) {
    gridClassName += ' grid-cols-1 md:grid-cols-2';
  } else if (totalParticipants <= 4) {
    gridClassName += ' grid-cols-1 md:grid-cols-2';
  } else if (totalParticipants <= 6) {
    gridClassName += ' grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  } else {
    gridClassName += ' grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  }
    
  return (
    <div className={`${gridClassName} h-full`}>
      {/* Local Screen share (if active) */}
      {isScreenSharing && screenSharingStream && (
        <div className="col-span-full aspect-video mb-6 relative">
          <VideoStream
            stream={screenSharingStream}
            muted={true}
            className="w-full h-full rounded-2xl shadow-2xl border-2 border-secondary/30"
          />
          <div className="absolute bottom-4 left-4 bg-secondary/90 backdrop-blur text-secondary-foreground px-4 py-2 rounded-lg font-medium shadow-lg">
            🖥️ {localUserName} (Screen Share)
          </div>
        </div>
      )}
      
      {/* Remote Screen shares */}
      {remoteScreenShares.map((screenShareStream) => {
        const sharerName = remoteUserNames[screenShareStream.peerId] || screenShareStream.peerId.substring(0, 8);
        const cleanSharerName = sharerName.startsWith('User ') ? sharerName.substring(5) : sharerName;
        
        return (
          <div key={`screen-${screenShareStream.id}`} className="col-span-full aspect-video mb-6 relative">
            <VideoStream
              stream={screenShareStream.stream}
              muted={false}
              className="w-full h-full rounded-2xl shadow-2xl border-2 border-secondary/30"
            />
            <div className="absolute bottom-4 left-4 bg-secondary/90 backdrop-blur text-secondary-foreground px-4 py-2 rounded-lg font-medium shadow-lg">
              🖥️ {cleanSharerName} (Screen Share)
            </div>
          </div>
        );
      })}
      
      {/* Local video */}
      <div className="relative aspect-video">
        <VideoStream
          stream={localStream}
          muted={true}
          className="w-full h-full rounded-2xl shadow-xl border-2 border-primary/30"
        />
        <div className="absolute bottom-3 left-3 bg-primary/90 backdrop-blur text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
          📹 {localUserName} (You)
        </div>
      </div>
      
      {/* Remote videos */}
      {userIds.map((userId) => {
        // Find audio and video streams for this user (non-screen share)
        const audioStream = remoteStreams.find(stream => 
          stream.peerId === userId && 
          !stream.isScreenShare && 
          stream.track?.kind === 'audio'
        );
        
        const videoStream = remoteStreams.find(stream => 
          stream.peerId === userId && 
          !stream.isScreenShare && 
          stream.track?.kind === 'video'
        );
        
        // Combine audio and video tracks into single stream
        const combinedTracks = [];
        if (audioStream?.track) combinedTracks.push(audioStream.track);
        if (videoStream?.track) combinedTracks.push(videoStream.track);
        const combinedStream = combinedTracks.length > 0 ? new MediaStream(combinedTracks) : null;
        
        // Clean up username - remove "User " prefix if exists
        const rawUserName = remoteUserNames[userId] || userId.substring(0, 8);
        const userName = rawUserName.startsWith('User ') ? rawUserName.substring(5) : rawUserName;
        
        console.log(`🔍 Combining streams for userId: ${userId}:`, {
          audioStream: audioStream ? { id: audioStream.id, kind: audioStream.track?.kind } : null,
          videoStream: videoStream ? { id: videoStream.id, kind: videoStream.track?.kind } : null,
          combinedTracks: combinedTracks.length,
          hasAudio: !!audioStream,
          hasVideo: !!videoStream
        });
        
        return (
          <div key={userId} className="relative aspect-video">
            <VideoStream
              stream={combinedStream}
              className="w-full h-full rounded-2xl shadow-xl border-2 border-border/30"
              placeholder={
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted to-muted/50 text-muted-foreground rounded-2xl border-2 border-border/30">
                  <div className="text-center">
                    <div className="text-4xl mb-3">👤</div>
                    <div className="text-base font-medium">{userName}</div>
                    <div className="text-sm text-muted-foreground/70 mt-1">Waiting for video...</div>
                  </div>
                </div>
              }
            />
            <div className="absolute bottom-3 left-3 bg-muted/90 backdrop-blur text-muted-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
              👥 {userName}
            </div>
          </div>
        );
      })}
    </div>
  );
} 