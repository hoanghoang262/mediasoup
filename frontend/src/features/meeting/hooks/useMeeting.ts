import { useState, useEffect, useCallback, useRef } from 'react';
import { MeetingService, type MeetingState, type JoinMeetingParams } from '../services/MeetingService';
import { createLogger } from '../../../infrastructure/logging/Logger';

/**
 * Meeting hook return type
 */
export interface UseMeetingReturn {
  // State
  state: MeetingState;
  isLoading: boolean;
  error: string | null;

  // Actions
  joinMeeting: (params: JoinMeetingParams) => Promise<void>;
  leaveMeeting: () => Promise<void>;
  endMeeting: (reason?: string) => Promise<void>;
  toggleAudio: (enabled?: boolean) => boolean;
  toggleVideo: (enabled?: boolean) => boolean;
  toggleScreenShare: (enabled?: boolean) => boolean;

  // Getters
  getParticipants: () => ReturnType<MeetingService['getParticipants']>;
  getLocalParticipant: () => ReturnType<MeetingService['getLocalParticipant']>;
  isInMeeting: () => boolean;
  isHost: () => boolean;
  getParticipantCount: () => number;
}

/**
 * Hook for managing meeting functionality
 */
export const useMeeting = (): UseMeetingReturn => {
  const logger = createLogger('useMeeting');
  const serviceRef = useRef<MeetingService | null>(null);
  
  // State
  const [state, setState] = useState<MeetingState>({
    roomId: '',
    isJoined: false,
    isHost: false,
    participants: new Map(),
    connectionStatus: 'disconnected',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new MeetingService();
      
      // Setup event listeners
      const service = serviceRef.current;
      
      service.on('participant-joined', (participant) => {
        logger.info('Participant joined', { participantId: participant.id, name: participant.name });
        setState(service.getState());
      });

      service.on('participant-left', ({ participantId }) => {
        logger.info('Participant left', { participantId });
        setState(service.getState());
      });

      service.on('participant-updated', (participant) => {
        logger.debug('Participant updated', { participantId: participant.id });
        setState(service.getState());
      });

      service.on('connection-status-changed', (status) => {
        logger.info('Connection status changed', { status });
        setState(service.getState());
      });

      service.on('meeting-ended', ({ reason }) => {
        logger.info('Meeting ended', { reason });
        setState(service.getState());
      });

      service.on('error', (error) => {
        logger.error('Meeting error', error);
        setError(error.message);
      });
    }

    return () => {
      if (serviceRef.current) {
        // Cleanup will be handled by the service internally
        serviceRef.current = null;
      }
    };
  }, [logger]);

  // Join meeting
  const joinMeeting = useCallback(async (params: JoinMeetingParams) => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      await serviceRef.current.joinMeeting(params);
      setState(serviceRef.current.getState());
      logger.info('Successfully joined meeting', { roomId: params.roomId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join meeting';
      setError(errorMessage);
      logger.error('Failed to join meeting', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  // Leave meeting
  const leaveMeeting = useCallback(async () => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      await serviceRef.current.leaveMeeting();
      setState(serviceRef.current.getState());
      logger.info('Successfully left meeting');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave meeting';
      setError(errorMessage);
      logger.error('Failed to leave meeting', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  // End meeting
  const endMeeting = useCallback(async (reason?: string) => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      await serviceRef.current.endMeeting(reason);
      setState(serviceRef.current.getState());
      logger.info('Successfully ended meeting', { reason });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end meeting';
      setError(errorMessage);
      logger.error('Failed to end meeting', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  // Toggle audio
  const toggleAudio = useCallback((enabled?: boolean) => {
    if (!serviceRef.current) return false;

    try {
      const result = serviceRef.current.toggleAudio(enabled);
      setState(serviceRef.current.getState());
      return result;
    } catch (err) {
      logger.error('Failed to toggle audio', err as Error);
      return false;
    }
  }, [logger]);

  // Toggle video
  const toggleVideo = useCallback((enabled?: boolean) => {
    if (!serviceRef.current) return false;

    try {
      const result = serviceRef.current.toggleVideo(enabled);
      setState(serviceRef.current.getState());
      return result;
    } catch (err) {
      logger.error('Failed to toggle video', err as Error);
      return false;
    }
  }, [logger]);

  // Toggle screen share
  const toggleScreenShare = useCallback((enabled?: boolean) => {
    if (!serviceRef.current) return false;

    try {
      const result = serviceRef.current.toggleScreenShare(enabled);
      setState(serviceRef.current.getState());
      return result;
    } catch (err) {
      logger.error('Failed to toggle screen share', err as Error);
      return false;
    }
  }, [logger]);

  // Getters
  const getParticipants = useCallback(() => {
    return serviceRef.current?.getParticipants() || [];
  }, []);

  const getLocalParticipant = useCallback(() => {
    return serviceRef.current?.getLocalParticipant();
  }, []);

  const isInMeeting = useCallback(() => {
    return serviceRef.current?.isInMeeting() || false;
  }, []);

  const isHost = useCallback(() => {
    return serviceRef.current?.isHost() || false;
  }, []);

  const getParticipantCount = useCallback(() => {
    return serviceRef.current?.getParticipantCount() || 0;
  }, []);

  return {
    // State
    state,
    isLoading,
    error,

    // Actions
    joinMeeting,
    leaveMeeting,
    endMeeting,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,

    // Getters
    getParticipants,
    getLocalParticipant,
    isInMeeting,
    isHost,
    getParticipantCount,
  };
}; 