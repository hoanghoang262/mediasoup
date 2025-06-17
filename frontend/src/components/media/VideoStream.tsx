import React from 'react';
import { useVideoRef } from '@/hooks/useVideoRef';
import { cn } from '@/lib/utils';

/**
 * Video stream component props
 */
export interface VideoStreamProps {
  /**
   * The MediaStream to display
   */
  stream: MediaStream | null;
  
  /**
   * Whether to mute the video (for local streams)
   */
  muted?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Placeholder content when no stream is available
   */
  placeholder?: React.ReactNode;
  
  /**
   * Whether to mirror the video (useful for local camera)
   */
  mirror?: boolean;
}

/**
 * VideoStream component for displaying MediaStream in a video element
 * Optimized for video meeting sessions
 */
export function VideoStream({ 
  stream, 
  muted = false, 
  className,
  placeholder,
  mirror = false
}: VideoStreamProps) {
  const videoRef = useVideoRef(stream);

  // Show placeholder if no stream
  if (!stream) {
    return (
      <div className={cn("bg-gray-900 flex items-center justify-center rounded-lg", className)}>
        {placeholder || (
          <div className="text-center text-white">
            <div className="text-4xl mb-2">📹</div>
            <div className="text-sm opacity-75">No video</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn(
        "w-full h-full bg-gray-900 rounded-lg",
        // Use object-cover by default, but allow override via className
        !className?.includes('object-') && "object-cover",
        mirror && "scale-x-[-1]",
        className
      )}
      style={{
        // Ensure video maintains aspect ratio and fills container properly
        objectPosition: 'center'
      }}
    />
  );
} 