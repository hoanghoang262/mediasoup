import { cn } from '@/lib/utils';

interface MediaAccessIndicatorProps {
  /**
   * The media stream to check
   */
  stream: MediaStream | null;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * MediaAccessIndicator shows the current media access status
 */
export function MediaAccessIndicator({ 
  stream, 
  className 
}: MediaAccessIndicatorProps) {
  if (!stream) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <div className="w-2 h-2 rounded-full bg-gray-400" />
        <span>No media</span>
      </div>
    );
  }

  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();
  
  const hasAudio = audioTracks.length > 0 && audioTracks.some(track => track.enabled);
  const hasVideo = videoTracks.length > 0 && videoTracks.some(track => track.enabled);

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      {/* Audio indicator */}
      <div className="flex items-center gap-1">
        <div className={cn('w-2 h-2 rounded-full', hasAudio ? 'bg-green-500' : 'bg-red-500')} />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {hasAudio ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          )}
        </svg>
      </div>
      
      {/* Video indicator */}
      <div className="flex items-center gap-1">
        <div className={cn('w-2 h-2 rounded-full', hasVideo ? 'bg-green-500' : 'bg-red-500')} />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {hasVideo ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
      </div>
    </div>
  );
} 