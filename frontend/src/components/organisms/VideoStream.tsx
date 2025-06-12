import { useEffect, useRef, useState } from 'react';

interface VideoStreamProps {
  /**
   * The media stream to display
   */
  stream: MediaStream | null;
  
  /**
   * The name of the user associated with this stream
   */
  userName: string;
  
  /**
   * Whether this is the local user's stream
   */
  isLocal?: boolean;
  
  /**
   * Whether the audio is muted
   */
  isMuted?: boolean;
}

/**
 * VideoStream displays a video stream with various UI indicators
 * for audio levels and user information
 */
export function VideoStream({ 
  stream, 
  userName, 
  isLocal = false, 
  isMuted = false 
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Attach the stream to the video element
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Set up audio level analyzer
  useEffect(() => {
    if (!stream || isMuted) return;

    // Create audio analyzer to detect speaking
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;
    const detectSound = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = Math.min(1, average / 50); // Normalize to 0-1
      
      setAudioLevel(normalizedLevel);
      animationId = requestAnimationFrame(detectSound);
    };

    detectSound();

    return () => {
      cancelAnimationFrame(animationId);
      microphone.disconnect();
      audioContext.close();
    };
  }, [stream, isMuted]);

  const handleMouseEnter = () => {
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    setShowControls(false);
  };

  return (
    <div 
      className="relative h-full w-full rounded-xl overflow-hidden border border-border/40 bg-background/70 backdrop-blur-sm shadow-md transition-all duration-300 hover:shadow-lg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Audio level indicator */}
      <div 
        className={`absolute inset-0 bg-primary/10 transition-opacity duration-300 z-0 ${
          audioLevel > 0.05 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          boxShadow: `inset 0 0 ${Math.round(audioLevel * 80)}px ${Math.round(audioLevel * 40)}px rgba(var(--primary), ${audioLevel * 0.3})` 
        }}
      />
      
      {/* Border pulse effect when speaking */}
      <div 
        className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
          audioLevel > 0.1 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          border: `${Math.max(1, Math.round(audioLevel * 4))}px solid rgb(var(--primary) / ${audioLevel * 0.7})`,
          boxShadow: `0 0 ${Math.round(audioLevel * 20)}px rgba(var(--primary), ${audioLevel * 0.4})`
        }}
      />
      
      {/* Video element */}
      <video
        ref={videoRef}
        className={`h-full w-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
      />
      
      {/* User indicator overlay */}
      <div className={`absolute left-0 right-0 bottom-0 transition-all duration-300 ${
        showControls ? 'opacity-100 transform translate-y-0' : 'opacity-60 transform translate-y-1/2'
      }`}>
        <div className="bg-gradient-to-t from-black/80 to-transparent pt-12 pb-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/30 backdrop-blur-md border border-primary/40 flex items-center justify-center text-sm font-medium text-primary-foreground">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white">
                {userName} {isLocal && '(You)'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {isMuted && (
                <div className="h-6 w-6 rounded-full bg-destructive/80 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                </div>
              )}
              
              {isLocal && (
                <div className="text-xs px-2 py-1 rounded-full bg-primary/20 backdrop-blur-md text-primary-foreground border border-primary/30">
                  {audioLevel > 0.1 ? 'Speaking' : 'Not speaking'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading state */}
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Connecting video...</p>
          </div>
        </div>
      )}
    </div>
  );
} 