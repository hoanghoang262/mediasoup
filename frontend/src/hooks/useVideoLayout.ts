import { useState, useCallback } from 'react';
import type { MediaStreamInfo } from '@/services/MediasoupService';

export interface VideoLayoutState {
  pinnedParticipant: string | null;
  layout: 'grid' | 'focus' | 'sidebar';
  showGrid: boolean;
  maxGridItems: number;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal: boolean;
  isScreenShare: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
}

/**
 * Hook để quản lý video layout với pin functionality như Google Meet
 */
export function useVideoLayout() {
  const [layoutState, setLayoutState] = useState<VideoLayoutState>({
    pinnedParticipant: null,
    layout: 'grid',
    showGrid: true,
    maxGridItems: 9, // Tối đa 9 participants trong grid
  });

  // Pin/unpin participant
  const togglePin = useCallback((participantId: string) => {
    setLayoutState(prev => ({
      ...prev,
      pinnedParticipant: prev.pinnedParticipant === participantId ? null : participantId,
      layout: prev.pinnedParticipant === participantId ? 'grid' : 'focus',
    }));
  }, []);

  // Unpin current participant
  const unpin = useCallback(() => {
    setLayoutState(prev => ({
      ...prev,
      pinnedParticipant: null,
      layout: 'grid',
    }));
  }, []);

  // Set layout mode
  const setLayout = useCallback((layout: VideoLayoutState['layout']) => {
    setLayoutState(prev => ({
      ...prev,
      layout,
      pinnedParticipant: layout === 'grid' ? null : prev.pinnedParticipant,
    }));
  }, []);

  // Toggle grid visibility (when pinned)
  const toggleGrid = useCallback(() => {
    setLayoutState(prev => ({
      ...prev,
      showGrid: !prev.showGrid,
    }));
  }, []);

  // Set max grid items
  const setMaxGridItems = useCallback((max: number) => {
    setLayoutState(prev => ({
      ...prev,
      maxGridItems: Math.max(1, Math.min(16, max)),
    }));
  }, []);

  // Calculate layout for participants
  const calculateLayout = useCallback((
    participants: ParticipantInfo[],
    remoteScreenShares: MediaStreamInfo[]
  ) => {
    const { pinnedParticipant, layout, showGrid, maxGridItems } = layoutState;

    // Screen shares always get priority
    const hasScreenShare = remoteScreenShares.length > 0;
    
    if (hasScreenShare) {
      // When someone is screen sharing, show screen share prominently
      return {
        mainVideo: {
          type: 'screenshare' as const,
          participant: remoteScreenShares[0],
          streams: remoteScreenShares,
        },
        gridVideos: showGrid ? participants.slice(0, maxGridItems) : [],
        layout: 'focus' as const,
        canToggleGrid: true,
      };
    }

    if (pinnedParticipant && layout === 'focus') {
      const pinnedParticipantData = participants.find(p => p.id === pinnedParticipant);
      
      if (pinnedParticipantData) {
        return {
          mainVideo: {
            type: 'participant' as const,
            participant: pinnedParticipantData,
          },
          gridVideos: showGrid 
            ? participants.filter(p => p.id !== pinnedParticipant).slice(0, maxGridItems - 1)
            : [],
          layout: 'focus' as const,
          canToggleGrid: true,
        };
      }
    }

    // Default grid layout
    return {
      mainVideo: null,
      gridVideos: participants.slice(0, maxGridItems),
      layout: 'grid' as const,
      canToggleGrid: false,
    };
  }, [layoutState]);

  // Get grid class names based on participant count
  const getGridClassName = useCallback((participantCount: number) => {
    if (participantCount <= 1) return 'grid-cols-1';
    if (participantCount === 2) return 'grid-cols-2';
    if (participantCount <= 4) return 'grid-cols-2 grid-rows-2';
    if (participantCount <= 6) return 'grid-cols-3 grid-rows-2';
    if (participantCount <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-4';
  }, []);

  return {
    layoutState,
    actions: {
      togglePin,
      unpin,
      setLayout,
      toggleGrid,
      setMaxGridItems,
    },
    utils: {
      calculateLayout,
      getGridClassName,
    },
  };
} 