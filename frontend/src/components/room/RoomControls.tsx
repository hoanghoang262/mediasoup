import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCallStore } from '@/store/callStore';

export function RoomControls() {
  const navigate = useNavigate();
  const { 
    isConnected, 
    leaveRoom, 
    toggleAudio, 
    toggleVideo, 
    toggleScreenShare,
    isAudioEnabled, 
    isVideoEnabled,
    isScreenSharing
  } = useCallStore();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isTogglingScreen, setIsTogglingScreen] = useState(false);

  const handleLeaveRoom = () => {
    setIsLeaving(true);
    toast.info('Leaving meeting...');
    
    // Short delay to show loading state
    setTimeout(() => {
      leaveRoom();
      navigate('/');
      setIsLeaving(false);
    }, 800);
  };

  const handleToggleScreenShare = async () => {
    setIsTogglingScreen(true);
    try {
      await toggleScreenShare();
    } catch (error) {
      console.error('Screen sharing toggle failed:', error);
    } finally {
      setIsTogglingScreen(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 py-4 z-30">
      <div className="backdrop-blur-md bg-background/90 border-t border-border/50 shadow-lg">
        <div className="container mx-auto py-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-3">
            {/* Mic Button */}
            <div className="relative group">
              <Button
                onClick={toggleAudio}
                variant={isAudioEnabled ? "outline" : "destructive"}
                size="icon"
                className={`h-14 w-14 rounded-full transition-all duration-300 ${
                  isAudioEnabled 
                    ? "hover:bg-primary/10 border-primary/30 text-primary hover:text-primary hover:border-primary" 
                    : "hover:bg-destructive/90 border-destructive"
                }`}
              >
                {isAudioEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeDasharray="2 2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </Button>
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap bg-background/90 border border-border/50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {isAudioEnabled ? 'Mute' : 'Unmute'}
              </span>
            </div>

            {/* Camera Button */}
            <div className="relative group">
              <Button
                onClick={toggleVideo}
                variant={isVideoEnabled ? "outline" : "destructive"}
                size="icon"
                className={`h-14 w-14 rounded-full transition-all duration-300 ${
                  isVideoEnabled 
                    ? "hover:bg-primary/10 border-primary/30 text-primary hover:text-primary hover:border-primary" 
                    : "hover:bg-destructive/90 border-destructive"
                }`}
              >
                {isVideoEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeDasharray="2 2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" />
                  </svg>
                )}
              </Button>
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap bg-background/90 border border-border/50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              </span>
            </div>

            {/* Screen Share Button */}
            <div className="relative group">
              <Button
                onClick={handleToggleScreenShare}
                variant={isScreenSharing ? "secondary" : "outline"}
                size="icon"
                disabled={isTogglingScreen}
                className={`h-14 w-14 rounded-full transition-all duration-300 ${
                  isScreenSharing 
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" 
                    : "hover:bg-primary/10 border-primary/30 text-primary hover:text-primary hover:border-primary"
                }`}
              >
                {isTogglingScreen ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </Button>
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap bg-background/90 border border-border/50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {isScreenSharing ? 'Stop sharing' : 'Share screen'}
              </span>
            </div>

            {/* End Call Button */}
            <div className="relative group">
              <Button
                onClick={handleLeaveRoom}
                variant="destructive"
                size="icon"
                disabled={isLeaving}
                className="h-14 w-14 rounded-full transition-all duration-300 hover:bg-destructive/80 hover:scale-105"
              >
                {isLeaving ? (
                  <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                  </svg>
                )}
              </Button>
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap bg-background/90 border border-border/50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Leave meeting
              </span>
            </div>
          </div>
          
          {/* Additional Controls */}
          <div className="flex items-center gap-3 ml-4">
            {/* Share Screen Button - disabled for now */}
            <div className="relative group">
              <Button
                variant="outline"
                size="icon"
                disabled
                className="h-12 w-12 rounded-full transition-all duration-300 border-primary/30 text-primary/60 hover:text-primary hover:border-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </Button>
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap bg-background/90 border border-border/50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Share screen (coming soon)
              </span>
            </div>
            
            {/* Chat Button - disabled for now */}
            <div className="relative group">
              <Button
                variant="outline"
                size="icon"
                disabled
                className="h-12 w-12 rounded-full transition-all duration-300 border-primary/30 text-primary/60 hover:text-primary hover:border-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Button>
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap bg-background/90 border border-border/50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Chat (coming soon)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 