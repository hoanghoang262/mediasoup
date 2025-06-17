import React from 'react';
import { cn } from '@/lib/utils';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import { useAudioLevel } from '@/hooks/useAudioLevel';
import { AudioLevelIndicator } from '@/components/ui/AudioLevelIndicator';
// Icons are defined as components below

/**
 * Meeting controls props
 */
export interface MeetingControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  localStream?: MediaStream | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
  className?: string;
}

/**
 * Google Meet style icons for controls - Bigger and more prominent
 */
const MicIcon: React.FC<{ enabled: boolean; state?: string }> = ({ enabled, state }) => (
  <div className="relative w-5 h-5">
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      {enabled ? (
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
      ) : (
        <>
          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
        </>
      )}
    </svg>
    {/* Gạch chéo khi cần permission */}
    {state === 'need-permission' && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-0.5 bg-current transform rotate-45"></div>
      </div>
    )}
  </div>
);

const VideoIcon: React.FC<{ enabled: boolean; state?: string }> = ({ enabled, state }) => (
  <div className="relative w-5 h-5">
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      {enabled ? (
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
      ) : (
        <>
          <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l8.18 8.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
        </>
      )}
    </svg>
    {/* Gạch chéo khi cần permission */}
    {state === 'need-permission' && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-0.5 bg-current transform rotate-45"></div>
      </div>
    )}
  </div>
);

const ScreenShareIcon: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    {enabled ? (
      <>
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
        <circle cx="12" cy="11" r="2" fill="white"/>
      </>
    ) : (
      <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
    )}
  </svg>
);

const PhoneOffIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
  </svg>
);

/**
 * Meeting controls component - Enhanced UI
 */
export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  localStream,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  className,
}) => {
  const { 
    hasCamera, 
    hasMicrophone, 
    hasScreenShare, 
    isLoading,
    audioPermission,
    videoPermission,
    requestAudioPermission,
    requestVideoPermission 
  } = useMediaDevices();

  // Track permission request states
  const [isRequestingAudioPermission, setIsRequestingAudioPermission] = React.useState(false);
  const [isRequestingVideoPermission, setIsRequestingVideoPermission] = React.useState(false);
  
  // Monitor audio level from local stream
  const { audioLevel, isActive: isAudioActive } = useAudioLevel(
    isAudioEnabled && localStream ? localStream : null,
    { updateInterval: 100 }
  );

  // Debug log để xem permission states
  React.useEffect(() => {
    console.log('🔍 Permission Debug:', {
      hasMicrophone,
      hasCamera,
      audioPermission,
      videoPermission,
      isLoading
    });
  }, [hasMicrophone, hasCamera, audioPermission, videoPermission, isLoading]);

  // Simplified button logic based on device availability and permissions
  const audioButtonState = !hasMicrophone 
    ? 'no-device'           // Không có thiết bị
    : isRequestingAudioPermission
      ? 'requesting'        // Đang xin quyền
    : audioPermission === 'denied' 
      ? 'denied'            // Bị từ chối quyền
      : audioPermission === 'granted' 
        ? 'active'          // Đã cấp quyền - có thể toggle
        : 'need-permission'; // Cần cấp quyền (prompt)

  const videoButtonState = !hasCamera 
    ? 'no-device'           // Không có thiết bị
    : isRequestingVideoPermission
      ? 'requesting'        // Đang xin quyền
    : videoPermission === 'denied' 
      ? 'denied'            // Bị từ chối quyền
      : videoPermission === 'granted' 
        ? 'active'          // Đã cấp quyền - có thể toggle
        : 'need-permission'; // Cần cấp quyền (prompt)

  // Button disabled states - disable khi không có device, bị denied, đang loading, hoặc đang request permission
  const audioButtonDisabled = audioButtonState === 'no-device' || audioButtonState === 'denied' || audioButtonState === 'requesting' || isLoading;
  const videoButtonDisabled = videoButtonState === 'no-device' || videoButtonState === 'denied' || videoButtonState === 'requesting' || isLoading;

  // Enhanced click handlers - request permission if not granted
  const handleAudioClick = async () => {
    if (audioButtonState === 'need-permission') {
      try {
        setIsRequestingAudioPermission(true);
        // Try to request audio permission
        const granted = await requestAudioPermission();
        if (granted) {
          console.log('Audio permission granted');
          // Don't toggle immediately, let user click again
        } else {
          console.log('Audio permission denied by user');
        }
      } finally {
        setIsRequestingAudioPermission(false);
      }
      return;
    }
    
    // Only toggle if permission is granted
    if (audioButtonState === 'active') {
      onToggleAudio();
    }
  };

  const handleVideoClick = async () => {
    if (videoButtonState === 'need-permission') {
      try {
        setIsRequestingVideoPermission(true);
        // Try to request video permission
        const granted = await requestVideoPermission();
        if (granted) {
          console.log('Video permission granted');
          // Don't toggle immediately, let user click again
        } else {
          console.log('Video permission denied by user');
        }
      } finally {
        setIsRequestingVideoPermission(false);
      }
      return;
    }
    
    // Only toggle if permission is granted
    if (videoButtonState === 'active') {
      onToggleVideo();
    }
  };

  // Screen Share button logic
  const canUseScreenShare = hasScreenShare && !isLoading;
  const screenShareButtonDisabled = !canUseScreenShare;

  // Debug log để tracking device availability
  React.useEffect(() => {
    console.log('🎛️ Control states:', {
      hasCamera,
      hasMicrophone,
      hasScreenShare,
      isLoading,
      audioPermission,
      videoPermission,
      audioButtonState,
      videoButtonState,
      isAudioEnabled,
      isVideoEnabled
    });
  }, [hasCamera, hasMicrophone, hasScreenShare, isLoading, audioPermission, videoPermission, audioButtonState, videoButtonState, isAudioEnabled, isVideoEnabled]);

  // Helper function to get button tooltip
  const getAudioTooltip = () => {
    switch (audioButtonState) {
      case 'no-device': return 'Không có microphone';
      case 'denied': return 'Quyền microphone bị từ chối';
      case 'requesting': return 'Đang xin quyền microphone...';
      case 'need-permission': return 'Click để cấp quyền microphone';
      case 'active': return isAudioEnabled ? `Tắt micro (${audioLevel}%)` : 'Bật micro';
      default: return 'Microphone';
    }
  };

  const getVideoTooltip = () => {
    switch (videoButtonState) {
      case 'no-device': return 'Không có camera';
      case 'denied': return 'Quyền camera bị từ chối';
      case 'requesting': return 'Đang xin quyền camera...';
      case 'need-permission': return 'Click để cấp quyền camera';
      case 'active': return isVideoEnabled ? 'Tắt camera' : 'Bật camera';
      default: return 'Camera';
    }
  };

  return (
    <div className={cn(
      'flex items-center justify-center gap-4 p-4 bg-black/50 backdrop-blur-sm rounded-lg',
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Audio Control */}
        <div className="relative">
          <button
            onClick={handleAudioClick}
            disabled={audioButtonDisabled}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
              'shadow-md',
              // Disabled states - không có hover effect
              audioButtonState === 'no-device' || audioButtonState === 'denied' || audioButtonState === 'requesting'
                ? 'opacity-40 cursor-not-allowed bg-gray-500 text-white' 
                // Need permission state - màu đỏ với gạch chéo, không có hover effect
                : audioButtonState === 'need-permission'
                  ? 'bg-red-600 text-white cursor-pointer hover:bg-red-700 hover:scale-105 active:scale-95 transform'
                // Active state - có thể toggle với hover effect
                : audioButtonState === 'active'
                  ? isAudioEnabled 
                    ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95 transform' 
                    : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105 active:scale-95 transform'
                  // Fallback
                  : 'bg-gray-600 hover:bg-gray-700 text-white hover:scale-105 active:scale-95 transform'
            )}
            title={getAudioTooltip()}
          >
            <MicIcon enabled={audioButtonDisabled ? false : isAudioEnabled} state={audioButtonState} />
          </button>

          {/* Audio Level Indicator - chỉ hiện khi audio enabled và có signal */}
          {audioButtonState === 'active' && isAudioEnabled && isAudioActive && (
            <div className="absolute -top-1 -right-1">
              <AudioLevelIndicator level={audioLevel} size="sm" isActive={isAudioActive} />
            </div>
          )}
        </div>

        {/* Video Control */}
        <button
          onClick={handleVideoClick}
          disabled={videoButtonDisabled}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
            'hover:scale-105 active:scale-95 transform',
            'shadow-md',
            // Disabled states - không có hover effect
            videoButtonState === 'no-device' || videoButtonState === 'denied' || videoButtonState === 'requesting'
              ? 'opacity-40 cursor-not-allowed bg-gray-500 text-white' 
              // Need permission state - màu đỏ với gạch chéo
              : videoButtonState === 'need-permission'
                ? 'bg-red-600 text-white cursor-pointer hover:bg-red-700 hover:scale-105 active:scale-95 transform'
              // Active state - có thể toggle với hover effect
              : videoButtonState === 'active'
                ? isVideoEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 transform' 
                  : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105 active:scale-95 transform'
                // Fallback
                : 'bg-gray-600 hover:bg-gray-700 text-white hover:scale-105 active:scale-95 transform'
          )}
          title={getVideoTooltip()}
        >
          <VideoIcon enabled={videoButtonDisabled ? false : isVideoEnabled} state={videoButtonState} />
        </button>

        {/* Screen Share Control */}
        <button
          onClick={onToggleScreenShare}
          disabled={screenShareButtonDisabled}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
            'hover:scale-105 active:scale-95 transform',
            'shadow-md',
            screenShareButtonDisabled 
              ? 'opacity-30 cursor-not-allowed hover:scale-100 bg-muted' 
              : canUseScreenShare && isScreenSharing 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
          )}
          title={
            screenShareButtonDisabled 
              ? 'Screen sharing không được hỗ trợ' 
              : (isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình')
          }
        >
          <ScreenShareIcon enabled={screenShareButtonDisabled ? false : isScreenSharing} />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600 mx-2" />

        {/* Leave Meeting */}
        <button
          onClick={onLeaveMeeting}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 transform shadow-md"
          title="Rời khỏi cuộc họp"
        >
          <PhoneOffIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}; 