import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCallStore } from '@/store/callStore';
import { IconButton } from '@/components/atoms/IconButton';
import { Button } from '@/components/atoms/Button';

/**
 * RoomControls provides the main control buttons for the video conference
 */
export function RoomControls() {
  const navigate = useNavigate();
  const { localStream, leaveRoom } = useCallStore();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  
  const handleToggleAudio = () => {
    if (!localStream) return;
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      toast.error('No audio track available');
      return;
    }
    
    const newState = !audioEnabled;
    audioTracks.forEach(track => {
      track.enabled = newState;
    });
    setAudioEnabled(newState);
    
    toast.success(newState ? 'Microphone enabled' : 'Microphone disabled');
  };
  
  const handleToggleVideo = () => {
    if (!localStream) return;
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      toast.error('No video track available');
      return;
    }
    
    const newState = !videoEnabled;
    videoTracks.forEach(track => {
      track.enabled = newState;
    });
    setVideoEnabled(newState);
    
    toast.success(newState ? 'Camera enabled' : 'Camera disabled');
  };
  
  const handleToggleScreenShare = async () => {
    try {
      if (isSharingScreen) {
        // Stop screen sharing
        const videoTracks = localStream?.getVideoTracks() || [];
        videoTracks.forEach(track => {
          if (track.label.includes('screen')) {
            track.stop();
          }
        });
        setIsSharingScreen(false);
        toast.success('Screen sharing stopped');
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        // Replace video track
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // When the user stops sharing via the browser UI
        screenTrack.onended = () => {
          setIsSharingScreen(false);
          toast.info('Screen sharing stopped');
        };
        
        setIsSharingScreen(true);
        toast.success('Screen sharing started');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to share screen');
    }
  };
  
  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 py-4 backdrop-blur-md bg-background/80 border-t border-border/30 z-10">
      <div className="container mx-auto flex items-center justify-center">
        <div className="flex items-center gap-3">
          {/* Audio toggle button */}
          <IconButton
            variant={audioEnabled ? 'primary' : 'danger'}
            ariaLabel={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            onClick={handleToggleAudio}
            icon={
              audioEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )
            }
          />
          
          {/* Video toggle button */}
          <IconButton
            variant={videoEnabled ? 'primary' : 'danger'}
            ariaLabel={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            onClick={handleToggleVideo}
            icon={
              videoEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
            }
          />
          
          {/* Screen share button */}
          <IconButton
            variant={isSharingScreen ? 'secondary' : 'primary'}
            ariaLabel={isSharingScreen ? 'Stop screen sharing' : 'Share screen'}
            onClick={handleToggleScreenShare}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          
          {/* Leave button */}
          <Button
            variant="danger"
            className="ml-4"
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
            onClick={handleLeaveRoom}
          >
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
} 