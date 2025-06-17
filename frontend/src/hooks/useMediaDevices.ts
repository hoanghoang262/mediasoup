import { useState, useEffect, useCallback } from 'react';

export interface MediaDevicesInfo {
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasScreenShare: boolean;
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  isLoading: boolean;
  error: string | null;
  
  // Permission states
  audioPermission: 'prompt' | 'granted' | 'denied';
  videoPermission: 'prompt' | 'granted' | 'denied';
  
  refreshDevices: () => void;
  requestAudioPermission: () => Promise<boolean>;
  requestVideoPermission: () => Promise<boolean>;
  requestBothPermissions: () => Promise<{ audio: boolean; video: boolean }>;
}

/**
 * Hook để detect và monitor media devices
 * Theo dõi camera, microphone availability
 */
export function useMediaDevices() {
  const [deviceInfo, setDeviceInfo] = useState<Omit<MediaDevicesInfo, 'refreshDevices' | 'requestAudioPermission' | 'requestVideoPermission' | 'requestBothPermissions'>>({
    hasCamera: false,
    hasMicrophone: false,
    hasScreenShare: true, // Screen share thường luôn available
    cameras: [],
    microphones: [],
    isLoading: true,
    error: null,
    audioPermission: 'prompt',
    videoPermission: 'prompt',
  });

  // Check if screen sharing is supported
  const checkScreenShareSupport = useCallback(() => {
    return !!(navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices);
  }, []);

  // Enumerate and check devices
  const checkDevices = useCallback(async () => {
    try {
      setDeviceInfo(prev => ({ ...prev, isLoading: true, error: null }));

      // Check permissions individually using permissions API
      let audioPermissionState: 'prompt' | 'granted' | 'denied' = 'prompt';
      let videoPermissionState: 'prompt' | 'granted' | 'denied' = 'prompt';
      
      try {
        // Check permissions without requesting media first
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        audioPermissionState = microphonePermission.state as 'prompt' | 'granted' | 'denied';
        videoPermissionState = cameraPermission.state as 'prompt' | 'granted' | 'denied';
        
        console.log('🔍 Individual permission states:', {
          audio: microphonePermission.state,
          video: cameraPermission.state
        });
        
      } catch {
        // Permission API not available, assume we need to check manually
        console.log('📟 Permission API not available, will check based on device enumeration');
      }

      // Get list of available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');

      // Determine device availability based on permissions and device list
      let hasCamera = false;
      let hasMicrophone = false;

      // For audio devices
      if (audioPermissionState === 'granted') {
        // Permission granted, trust device list
        hasMicrophone = microphones.length > 0;
      } else {
        // No permission yet, but devices might be available
        // We can see device count but not labels until permission granted
        hasMicrophone = microphones.length > 0;
      }

      // For video devices  
      if (videoPermissionState === 'granted') {
        // Permission granted, trust device list
        hasCamera = cameras.length > 0;
      } else {
        // No permission yet, but devices might be available
        hasCamera = cameras.length > 0;
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
        audioPermission: audioPermissionState,
        videoPermission: videoPermissionState,
      });

      // Only log when device availability changes
      const deviceStatus = `${hasCamera ? '📹' : '❌'}${hasMicrophone ? '🎤' : '❌'}`;
      const globalWindow = window as unknown as { __lastDeviceStatus?: string };
      if (deviceStatus !== globalWindow.__lastDeviceStatus) {
        console.log('🎥 Devices available:', deviceStatus, `(${cameras.length} cameras, ${microphones.length} mics)`);
        globalWindow.__lastDeviceStatus = deviceStatus;
      }

    } catch (error) {
      console.error('❌ Device detection error:', error);
      setDeviceInfo(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [checkScreenShareSupport]);

  // Check permissions using navigator.permissions API
  const checkPermissions = useCallback(async () => {
    try {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      // Only re-check if either permission was recently granted
      // This prevents unnecessary re-renders when permissions haven't changed
      if (cameraPermission.state === 'granted' || microphonePermission.state === 'granted') {
        // Add debounce to prevent rapid re-checks
        const currentTime = Date.now();
        const globalWindow = window as unknown as { __lastPermissionCheck?: number };
        const lastCheckTime = globalWindow.__lastPermissionCheck || 0;
        
        if (currentTime - lastCheckTime > 2000) { // 2 second debounce
          globalWindow.__lastPermissionCheck = currentTime;
          checkDevices();
        }
      }
    } catch (error) {
      console.log('Permission API not available:', error);
    }
  }, [checkDevices]);

  // Monitor device changes
  useEffect(() => {
    checkDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      checkDevices();
    };

    // Listen for page visibility changes (when user comes back from permission dialog)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          checkPermissions();
        }, 500); // Small delay to allow permission dialog to close
      }
    };

    // Listen for window focus (alternative to visibility change)
    const handleWindowFocus = () => {
      setTimeout(() => {
        checkPermissions();
      }, 500); // Small delay to allow permission dialog to close
    };

    // Listen for user interaction after permission dialog
    const handleUserInteraction = () => {
      checkPermissions();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleUserInteraction, { once: true, passive: true });

    // Removed periodic permission check to prevent infinite re-renders
    // Only check on actual user interactions and focus changes

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [checkDevices, checkPermissions]);

  // Refresh devices manually
  const refreshDevices = useCallback(() => {
    checkDevices();
  }, [checkDevices]);

  // Request audio permission separately
  const requestAudioPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🎤 Requesting audio permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Audio permission granted');
      checkDevices(); // Refresh device info
      return true;
    } catch (error) {
      console.log('❌ Audio permission denied', error);
      return false;
    }
  }, [checkDevices]);

  // Request video permission separately  
  const requestVideoPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('📹 Requesting video permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Video permission granted');
      checkDevices(); // Refresh device info
      return true;
    } catch (error) {
      console.log('❌ Video permission denied', error);
      return false;
    }
  }, [checkDevices]);

  // Request both permissions (current behavior)
  const requestBothPermissions = useCallback(async (): Promise<{ audio: boolean; video: boolean }> => {
    try {
      console.log('🎬 Requesting both audio and video permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Both permissions granted');
      checkDevices(); // Refresh device info
      return { audio: true, video: true };
    } catch (error) {
      console.log('❌ Some permissions denied, trying individually...', error);
      
      // Try audio first
      const audioGranted = await requestAudioPermission();
      
      // Then try video
      const videoGranted = await requestVideoPermission();
      
      return { audio: audioGranted, video: videoGranted };
    }
  }, [checkDevices, requestAudioPermission, requestVideoPermission]);

  return {
    ...deviceInfo,
    refreshDevices,
    requestAudioPermission,
    requestVideoPermission,
    requestBothPermissions,
  };
} 