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
 * VideoGrid displays all participants (including screen shares) in a unified grid layout
 * Optimized for video meeting sessions with consistent aspect ratios
 */
export function VideoGrid({ 
  localStream, 
  localUserName, 
  remoteStreams,
  remoteUserNames,
  userIds
}: VideoGridProps) {
  const { screenSharingStream, isScreenSharing } = useCallStore();

  // Find remote screen shares và regular streams
  const remoteScreenShares = remoteStreams.filter(stream => stream.isScreenShare);
  const remoteRegularStreams = remoteStreams.filter(stream => !stream.isScreenShare);
  
  // Only log when there are changes in participant count or screen sharing
  const participantCount = userIds.length + 1; // +1 for local user
  const screenShareCount = remoteScreenShares.length + (isScreenSharing ? 1 : 0);
  
  const globalWindow = window as unknown as { 
    __lastParticipantCount?: number; 
    __lastScreenShareCount?: number; 
  };
  
  if (participantCount !== globalWindow.__lastParticipantCount || 
      screenShareCount !== globalWindow.__lastScreenShareCount) {
    console.log('👥 Participants:', participantCount, screenShareCount > 0 ? `🖥️ Screen shares: ${screenShareCount}` : '');
    globalWindow.__lastParticipantCount = participantCount;
    globalWindow.__lastScreenShareCount = screenShareCount;
  }

  // Tạo danh sách tất cả participants (bao gồm cả screen shares) trong cùng một grid
  const allParticipants: Array<{
    id: string;
    type: 'local' | 'remote' | 'local-screen' | 'remote-screen';
    stream: MediaStream | null;
    name: string;
    peerId?: string;
    isScreenShare: boolean;
  }> = [];

  // Add local user
  allParticipants.push({
    id: 'local',
    type: 'local',
    stream: localStream,
    name: localUserName,
    isScreenShare: false
  });

  // Add local screen share if active
  if (isScreenSharing && screenSharingStream) {
    allParticipants.push({
      id: 'local-screen',
      type: 'local-screen',
      stream: screenSharingStream,
      name: `${localUserName} (Screen)`,
      isScreenShare: true
    });
  }

  // Helper function to get consistent user name
  const getUserName = (userId: string): string => {
    const rawUserName = remoteUserNames[userId] || `User ${userId.substring(0, 8)}`;
    return rawUserName;
  };

  // Add remote users (regular video)
  userIds.forEach((userId) => {
    const audioStream = remoteRegularStreams.find(stream => 
      stream.peerId === userId && stream.track?.kind === 'audio'
    );
    const videoStream = remoteRegularStreams.find(stream => 
      stream.peerId === userId && stream.track?.kind === 'video'
    );
    
    // Combine audio and video tracks into single stream
    const combinedTracks = [];
    if (audioStream?.track) combinedTracks.push(audioStream.track);
    if (videoStream?.track) combinedTracks.push(videoStream.track);
    const combinedStream = combinedTracks.length > 0 ? new MediaStream(combinedTracks) : null;
    
    const userName = getUserName(userId);
    
    allParticipants.push({
      id: userId,
      type: 'remote',
      stream: combinedStream,
      name: userName,
      peerId: userId,
      isScreenShare: false
    });
  });

  // Add remote screen shares
  remoteScreenShares.forEach((screenShareStream) => {
    const userName = getUserName(screenShareStream.peerId);
    
    allParticipants.push({
      id: `${screenShareStream.peerId}-screen`,
      type: 'remote-screen',
      stream: screenShareStream.stream,
      name: `${userName} (Screen)`,
      peerId: screenShareStream.peerId,
      isScreenShare: true
    });
  });

  // Calculate grid layout for all participants
  const totalParticipants = allParticipants.length;
  let gridClassName = 'grid gap-3 h-full';
  
  if (totalParticipants <= 1) {
    gridClassName += ' grid-cols-1';
  } else if (totalParticipants === 2) {
    gridClassName += ' grid-cols-1 lg:grid-cols-2';
  } else if (totalParticipants <= 4) {
    gridClassName += ' grid-cols-2';
  } else if (totalParticipants <= 6) {
    gridClassName += ' grid-cols-2 lg:grid-cols-3';
  } else if (totalParticipants <= 9) {
    gridClassName += ' grid-cols-3';
  } else {
    gridClassName += ' grid-cols-3 lg:grid-cols-4';
  }

  return (
    <div className={gridClassName}>
      {allParticipants.map((participant) => {
        const isLocalUser = participant.type === 'local';
        const isScreenShare = participant.isScreenShare;
        
        let borderClass = 'border-2 border-gray-600/30';
        let labelClass = 'bg-gray-800/90 backdrop-blur text-gray-200';
        let icon = '👥';
        let containerClass = 'relative bg-gray-900 rounded-lg overflow-hidden min-h-[200px]';
        let videoClass = 'w-full h-full object-cover';
        
        if (isLocalUser) {
          borderClass = 'border-2 border-blue-500/50';
          labelClass = 'bg-blue-600/90 backdrop-blur text-white';
          icon = '📹';
        } else if (isScreenShare) {
          borderClass = 'border-2 border-green-500/50';
          labelClass = 'bg-green-600/90 backdrop-blur text-white';
          icon = '🖥️';
          // Screen shares use object-contain to show full content without cropping
          videoClass = 'w-full h-full object-contain bg-black';
          containerClass = 'relative bg-black rounded-lg overflow-hidden min-h-[200px]';
        }
        
        return (
          <div key={participant.id} className={containerClass}>
            <VideoStream
              stream={participant.stream}
              muted={isLocalUser || participant.type === 'local-screen'}
              mirror={isLocalUser && !isScreenShare}
              className={`${videoClass} ${borderClass}`}
              placeholder={
                <div className={`flex items-center justify-center h-full bg-gradient-to-br ${isScreenShare ? 'from-slate-800 to-slate-900' : 'from-gray-800 to-gray-900'} text-gray-300 ${borderClass}`}>
                  <div className="text-center">
                    <div className="text-4xl mb-3">{isScreenShare ? '🖥️' : '👤'}</div>
                    <div className="text-base font-medium">{participant.name}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {isScreenShare 
                        ? 'Screen sharing...' 
                        : isLocalUser 
                          ? 'Camera off' 
                          : 'Waiting for video...'
                      }
                    </div>
                  </div>
                </div>
              }
            />
            <div className={`absolute bottom-3 left-3 ${labelClass} px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg`}>
              {icon} {participant.name}{isLocalUser && !isScreenShare ? ' (You)' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
} 