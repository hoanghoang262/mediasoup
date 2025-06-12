import { useEffect, useState } from 'react';
import { MediaIcon } from '@/components/atoms/MediaIcon';

interface MediaAccessIndicatorProps {
  /**
   * The media stream to monitor
   */
  stream: MediaStream | null;
}

/**
 * MediaAccessIndicator displays the current audio and video access status
 * and provides feedback when clicked
 */
export function MediaAccessIndicator({ stream }: MediaAccessIndicatorProps) {
  const [hasAudio, setHasAudio] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!stream) {
      setHasAudio(false);
      setHasVideo(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    
    setHasAudio(audioTracks.length > 0 && audioTracks[0].enabled);
    setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);

    // Listen for track ended events
    const handleTrackEnded = () => {
      setHasAudio(stream.getAudioTracks().some(track => track.readyState === 'live' && track.enabled));
      setHasVideo(stream.getVideoTracks().some(track => track.readyState === 'live' && track.enabled));
    };

    stream.getTracks().forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      stream.getTracks().forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
      });
    };
  }, [stream]);

  const handleShowHelp = () => {
    // Instead of showing a toast, just show a tooltip
    // The main toast notifications will be handled by the central store
    setShowTooltip(true);
    
    // Hide tooltip after a short delay
    setTimeout(() => {
      setShowTooltip(false);
    }, 3000);
  };

  if (!stream) {
    return null;
  }

  return (
    <div 
      className="relative flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 border border-border shadow-sm backdrop-blur-sm cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleShowHelp}
    >
      {/* Audio indicator */}
      <div className="p-1 rounded-full">
        <MediaIcon type="audio" enabled={hasAudio} />
      </div>

      {/* Video indicator */}
      <div className="p-1 rounded-full">
        <MediaIcon type="video" enabled={hasVideo} />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black/80 text-white rounded-md whitespace-nowrap z-50">
          {!hasVideo && !hasAudio ? (
            'No media access'
          ) : !hasVideo ? (
            'Audio only mode'
          ) : !hasAudio ? (
            'No microphone access'
          ) : (
            'All media enabled'
          )}
        </div>
      )}
    </div>
  );
} 