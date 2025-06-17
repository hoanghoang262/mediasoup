import { useEffect, useState, useRef } from 'react';

interface AudioLevelOptions {
  smoothingTimeConstant?: number;
  fftSize?: number;
  updateInterval?: number;
}

export const useAudioLevel = (
  stream: MediaStream | null,
  options: AudioLevelOptions = {}
) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    smoothingTimeConstant = 0.8,
    fftSize = 256,
    updateInterval = 100
  } = options;

  useEffect(() => {
    if (!stream) {
      cleanup();
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      cleanup();
      return;
    }

    const audioTrack = audioTracks[0];
    if (!audioTrack.enabled) {
      setIsActive(false);
      setAudioLevel(0);
      return;
    }

    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const audioContext = audioContextRef.current;

      // Create analyser node
      analyserRef.current = audioContext.createAnalyser();
      const analyser = analyserRef.current;
      
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyser.fftSize = fftSize;

      // Create media stream source
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Create data array for frequency data
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      setIsActive(true);

      // Function to calculate audio level
      const updateAudioLevel = () => {
        if (!analyser || !audioTrack.enabled) {
          setAudioLevel(0);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (Root Mean Square) for better audio level representation
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(rms / 128, 1); // Normalize to 0-1
        
        setAudioLevel(level);
      };

      // Update audio level periodically
      intervalRef.current = setInterval(updateAudioLevel, updateInterval);

    } catch (error) {
      console.error('Error setting up audio level monitoring:', error);
      setIsActive(false);
      setAudioLevel(0);
    }

    return cleanup;
  }, [stream, smoothingTimeConstant, fftSize, updateInterval]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsActive(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return {
    audioLevel: Math.round(audioLevel * 100), // Return as percentage
    isActive,
    hasAudio: !!stream?.getAudioTracks().length
  };
}; 