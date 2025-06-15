import { useState, useEffect, useCallback } from 'react';

export interface MediaDevicesInfo {
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasScreenShare: boolean;
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook để detect và monitor media devices
 * Theo dõi camera, microphone availability
 */
export function useMediaDevices() {
  const [deviceInfo, setDeviceInfo] = useState<MediaDevicesInfo>({
    hasCamera: false,
    hasMicrophone: false,
    hasScreenShare: true, // Screen share thường luôn available
    cameras: [],
    microphones: [],
    isLoading: true,
    error: null,
  });

  // Check if screen sharing is supported
  const checkScreenShareSupport = useCallback(() => {
    return !!(navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices);
  }, []);

  // Enumerate and check devices
  const checkDevices = useCallback(async () => {
    try {
      setDeviceInfo(prev => ({ ...prev, isLoading: true, error: null }));

      // Request permission first to get accurate device info
      let permissionGranted = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: true 
        });
        permissionGranted = true;
        // Stop all tracks immediately
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.log('Permission not granted for initial check:', error);
      }

      // Get list of available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');

      // Test actual device access
      let hasCamera = false;
      let hasMicrophone = false;

      if (permissionGranted) {
        // If permission was granted, we can trust the device list
        hasCamera = cameras.length > 0;
        hasMicrophone = microphones.length > 0;
      } else {
        // Try to access devices individually to check availability
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          hasCamera = true;
          videoStream.getTracks().forEach(track => track.stop());
        } catch {
          hasCamera = false;
        }

        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          hasMicrophone = true;
          audioStream.getTracks().forEach(track => track.stop());
        } catch {
          hasMicrophone = false;
        }
      }

      const hasScreenShare = checkScreenShareSupport();

      setDeviceInfo({
        hasCamera,
        hasMicrophone,
        hasScreenShare,
        cameras,
        microphones,
        isLoading: false,
        error: null,
      });

      console.log('🎥 Device detection result:', {
        hasCamera,
        hasMicrophone,
        hasScreenShare,
        camerasCount: cameras.length,
        microphonesCount: microphones.length,
      });

    } catch (error) {
      console.error('❌ Device detection error:', error);
      setDeviceInfo(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [checkScreenShareSupport]);

  // Monitor device changes
  useEffect(() => {
    checkDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      console.log('🔄 Media devices changed, re-checking...');
      checkDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [checkDevices]);

  // Refresh devices manually
  const refreshDevices = useCallback(() => {
    checkDevices();
  }, [checkDevices]);

  return {
    ...deviceInfo,
    refreshDevices,
  };
} 