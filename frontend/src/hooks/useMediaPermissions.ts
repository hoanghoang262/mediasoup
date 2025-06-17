import { useState, useEffect, useCallback } from 'react';

export interface MediaPermissionState {
  audio: {
    granted: boolean;
    denied: boolean;
    checking: boolean;
  };
  video: {
    granted: boolean;
    denied: boolean;
    checking: boolean;
  };
}

/**
 * Hook để quản lý permissions riêng biệt cho audio và video
 * Tránh vấn đề khi audio và video bị link với nhau
 */
export function useMediaPermissions() {
  const [permissions, setPermissions] = useState<MediaPermissionState>({
    audio: { granted: false, denied: false, checking: false },
    video: { granted: false, denied: false, checking: false },
  });

  // Check individual permission status
  const checkAudioPermission = useCallback(async () => {
    if (permissions.audio.checking) return;
    
    setPermissions(prev => ({
      ...prev,
      audio: { ...prev.audio, checking: true }
    }));

    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      setPermissions(prev => ({
        ...prev,
        audio: {
          granted: permission.state === 'granted',
          denied: permission.state === 'denied',
          checking: false
        }
      }));

      // Listen for permission changes
      permission.addEventListener('change', () => {
        setPermissions(prev => ({
          ...prev,
          audio: {
            granted: permission.state === 'granted',
            denied: permission.state === 'denied',
            checking: false
          }
        }));
      });

    } catch {
      // Permission API not available, assume granted
      setPermissions(prev => ({
        ...prev,
        audio: { granted: true, denied: false, checking: false }
      }));
    }
  }, [permissions.audio.checking]);

  const checkVideoPermission = useCallback(async () => {
    if (permissions.video.checking) return;
    
    setPermissions(prev => ({
      ...prev,
      video: { ...prev.video, checking: true }
    }));

    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      setPermissions(prev => ({
        ...prev,
        video: {
          granted: permission.state === 'granted',
          denied: permission.state === 'denied',
          checking: false
        }
      }));

      // Listen for permission changes
      permission.addEventListener('change', () => {
        setPermissions(prev => ({
          ...prev,
          video: {
            granted: permission.state === 'granted',
            denied: permission.state === 'denied',
            checking: false
          }
        }));
      });

    } catch {
      // Permission API not available, assume granted
      setPermissions(prev => ({
        ...prev,
        video: { granted: true, denied: false, checking: false }
      }));
    }
  }, [permissions.video.checking]);

  // Request audio permission
  const requestAudioPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setPermissions(prev => ({
        ...prev,
        audio: { granted: true, denied: false, checking: false }
      }));
      
      return true;
    } catch {
      setPermissions(prev => ({
        ...prev,
        audio: { granted: false, denied: true, checking: false }
      }));
      
      return false;
    }
  }, []);

  // Request video permission
  const requestVideoPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      setPermissions(prev => ({
        ...prev,
        video: { granted: true, denied: false, checking: false }
      }));
      
      return true;
    } catch {
      setPermissions(prev => ({
        ...prev,
        video: { granted: false, denied: true, checking: false }
      }));
      
      return false;
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkAudioPermission();
    checkVideoPermission();
  }, [checkAudioPermission, checkVideoPermission]);

  // Helper functions
  const canUseAudio = permissions.audio.granted && !permissions.audio.denied;
  const canUseVideo = permissions.video.granted && !permissions.video.denied;
  const isLoading = permissions.audio.checking || permissions.video.checking;

  return {
    permissions,
    canUseAudio,
    canUseVideo,
    isLoading,
    requestAudioPermission,
    requestVideoPermission,
    checkAudioPermission,
    checkVideoPermission,
  };
} 