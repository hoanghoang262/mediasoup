import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Meeting controls props
 */
export interface MeetingControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
  onEndMeeting?: () => void;
  className?: string;
}

/**
 * Google Meet style icons for controls
 */
const MicIcon: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    {enabled ? (
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
    ) : (
      <>
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
      </>
    )}
  </svg>
);

const VideoIcon: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    {enabled ? (
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    ) : (
      <>
        <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l8.18 8.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
      </>
    )}
  </svg>
);

const ScreenShareIcon: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    {enabled ? (
      <>
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
        <circle cx="12" cy="11" r="2"/>
      </>
    ) : (
      <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
    )}
  </svg>
);

const LeaveIcon: React.FC = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16 13h-3V3h-2v10H8l4 4 4-4zM4 19v2h16v-2H4z"/>
  </svg>
);

/**
 * Meeting controls component
 */
export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isHost,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  onEndMeeting,
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center justify-center gap-3 px-6 py-4',
      'bg-gray-800/95 backdrop-blur-md rounded-full shadow-2xl',
      'border border-gray-700',
      className
    )}>
      {/* Audio Control */}
      <button
        onClick={onToggleAudio}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isAudioEnabled 
            ? 'bg-gray-600 hover:bg-gray-500 text-white' 
            : 'bg-red-600 hover:bg-red-500 text-white'
        )}
        title={isAudioEnabled ? 'Tắt micro' : 'Bật micro'}
      >
        <MicIcon enabled={isAudioEnabled} />
      </button>

      {/* Video Control */}
      <button
        onClick={onToggleVideo}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isVideoEnabled 
            ? 'bg-gray-600 hover:bg-gray-500 text-white' 
            : 'bg-red-600 hover:bg-red-500 text-white'
        )}
        title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}
      >
        <VideoIcon enabled={isVideoEnabled} />
      </button>

      {/* Screen Share Control */}
      <button
        onClick={onToggleScreenShare}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isScreenSharing 
            ? 'bg-blue-600 hover:bg-blue-500 text-white' 
            : 'bg-gray-600 hover:bg-gray-500 text-white'
        )}
        title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
      >
        <ScreenShareIcon enabled={isScreenSharing} />
      </button>

      {/* Leave Meeting */}
      <button
        onClick={onLeaveMeeting}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
          'hover:scale-110 active:scale-95',
          'bg-red-600 hover:bg-red-500 text-white'
        )}
        title="Rời khỏi cuộc họp"
      >
        <LeaveIcon />
      </button>

      {/* End Meeting (Host only) */}
      {isHost && onEndMeeting && (
        <button
          onClick={onEndMeeting}
          className={cn(
            'px-4 py-2 rounded-full transition-all duration-200',
            'hover:scale-105 active:scale-95',
            'bg-red-700 hover:bg-red-600 text-white text-sm font-medium'
          )}
          title="Kết thúc cuộc họp cho tất cả"
        >
          Kết thúc
        </button>
      )}
    </div>
  );
}; 