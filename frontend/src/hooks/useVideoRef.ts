import { useRef, useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Hook to attach a MediaStream to a video element
 * @param stream The MediaStream to attach to the video element
 * @returns A ref object to attach to the video element
 */
export function useVideoRef(stream: MediaStream | null): RefObject<HTMLVideoElement | null> {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Get a reference to the current video element
    const videoElement = videoRef.current;
    
    if (videoElement && stream) {
      videoElement.srcObject = stream;
    }
    
    return () => {
      // Use the captured reference in cleanup
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [stream]);

  return videoRef;
} 