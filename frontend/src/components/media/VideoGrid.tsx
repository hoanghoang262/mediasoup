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
    remoteStreams: remoteStreams.map(s => ({ id: s.id, peerId: s.peerId, isScreenShare: s.isScreenShare, kind: s.track?.kind })),
    remoteUserNames
  });

  // Calculate total participants
  const totalParticipants = userIds.length + 1; // +1 for local user
  
  // Determine grid layout based on participant count
  let gridClassName = 'grid gap-4';
  
  if (totalParticipants <= 1) {
    gridClassName += ' grid-cols-1';
  } else if (totalParticipants === 2) {
    gridClassName += ' grid-cols-2';
  } else if (totalParticipants <= 4) {
    gridClassName += ' grid-cols-2';
  } else if (totalParticipants <= 6) {
    gridClassName += ' grid-cols-3';
  } else {
    gridClassName += ' grid-cols-4';
  }
    
  return (
    <div className={gridClassName}>
      {/* Screen share (if active) */}
      {isScreenSharing && screenSharingStream && (
        <div className="col-span-full aspect-video mb-4">
          <VideoStream
            stream={screenSharingStream}
            muted={true}
            className="w-full h-full rounded-lg"
          />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {localUserName} (Screen Share)
          </div>
        </div>
      )}
      
      {/* Local video */}
      <div className="relative aspect-video">
        <VideoStream
          stream={localStream}
          muted={true}
          className="w-full h-full rounded-lg"
        />
        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {localUserName} (You)
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
              className="w-full h-full rounded-lg"
              placeholder={
                <div className="flex items-center justify-center h-full bg-gray-800 text-white rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl mb-2">👤</div>
                    <div className="text-sm">{userName}</div>
                  </div>
                </div>
              }
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              {userName}
            </div>
          </div>
        );
      })}
    </div>
  );
} 