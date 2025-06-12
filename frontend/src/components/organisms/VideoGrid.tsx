import { type MediaStreamInfo } from '@/services/MediasoupService';
import { VideoStream } from '../room/VideoStream';
import { useCallStore } from '@/store/callStore';
import { useEffect } from 'react';

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
 * that adapts based on the number of participants
 */
export function VideoGrid({ 
  localStream, 
  localUserName, 
  remoteStreams,
  remoteUserNames,
  userIds
}: VideoGridProps) {
  const { screenSharingStream, isScreenSharing } = useCallStore();

  // Debug log
  useEffect(() => {
    console.log('VideoGrid render:', {
      localStream,
      screenSharingStream,
      isScreenSharing,
      remoteStreams: remoteStreams.map(s => ({
        id: s.id,
        isScreenShare: s.isScreenShare,
        kind: s.track.kind
      })),
      userIds
    });
  }, [localStream, screenSharingStream, isScreenSharing, remoteStreams, userIds]);

  // Create a map of stream IDs to stream info objects for faster lookup
  const streamMap = new Map<string, MediaStreamInfo>();
  remoteStreams.forEach(stream => {
    streamMap.set(stream.id, stream);
  });

  // Determine if there's any screen sharing going on (local or remote)
  const hasScreenSharing = isScreenSharing || remoteStreams.some(stream => stream.isScreenShare);
  
  // Calculate total participants (not including the screen share)
  const totalParticipants = userIds.length + 1; // +1 for local user
  
  // Determine grid layout based on participant count and screen sharing
  let gridClassName = 'grid gap-4';
  
  if (hasScreenSharing) {
    // Layout with screen sharing (main screen on top, participants below)
    gridClassName += ' grid-rows-[1fr,auto] grid-cols-1 md:grid-cols-4 xl:grid-cols-6';
  } else {
    // Standard video layout without screen sharing
    if (totalParticipants <= 1) {
      gridClassName += ' grid-cols-1';
    } else if (totalParticipants === 2) {
      gridClassName += ' grid-cols-2';
    } else if (totalParticipants <= 4) {
      gridClassName += ' grid-cols-2';
    } else if (totalParticipants <= 6) {
      gridClassName += ' grid-cols-3';
    } else if (totalParticipants <= 9) {
      gridClassName += ' grid-cols-3';
    } else {
      gridClassName += ' grid-cols-4';
    }
  }
  
  // Determine classes for different video types based on layout
  const localVideoClassName = hasScreenSharing
    ? 'col-span-1 aspect-video h-full'
    : 'col-span-1 row-span-1 aspect-video';
    
  const remoteVideoClassName = hasScreenSharing
    ? 'col-span-1 aspect-video h-full'
    : 'col-span-1 row-span-1 aspect-video';
    
  const screenShareClassName = 'row-span-1 col-span-full md:col-span-3 xl:col-span-5 aspect-video mb-4';
    
  return (
    <div className={gridClassName}>
      {/* Screen share (if active) */}
      {hasScreenSharing && (
        <div className={screenShareClassName}>
          {isScreenSharing && screenSharingStream ? (
            // Local screen sharing
            <VideoStream
              stream={screenSharingStream}
              userName={localUserName}
              isLocal={true}
              isMuted={true}
              isScreenShare={true}
            />
          ) : (
            // Remote screen sharing - find the first remote screen share
            remoteStreams.find(stream => stream.isScreenShare) && (
              <VideoStream
                stream={remoteStreams.find(stream => stream.isScreenShare)?.stream || null}
                userName={remoteUserNames[remoteStreams.find(stream => stream.isScreenShare)?.id || ''] || 'Remote User'}
                isScreenShare={true}
              />
            )
          )}
        </div>
      )}
      
      {/* Local video */}
      <div className={localVideoClassName}>
        <VideoStream
          stream={localStream}
          userName={localUserName}
          isLocal={true}
          isMuted={true}
        />
      </div>
      
      {/* Remote videos - show all users with or without streams */}
      {userIds.map((userId) => {
        // Find the stream for this user if it exists
        const userStreamInfo = remoteStreams.find(stream => stream.id === userId || stream.id.startsWith(userId));
        const userName = remoteUserNames[userId] || `User ${userId.substring(0, 5)}`;
        
        // Don't show screen sharing streams in the participants grid
        if (userStreamInfo?.isScreenShare) {
          return null;
        }
        
        return (
          <div 
            key={userId}
            className={remoteVideoClassName}
          >
            <VideoStream
              stream={userStreamInfo?.stream || null}
              userName={userName}
              userId={userId}
            />
          </div>
        );
      })}
    </div>
  );
} 