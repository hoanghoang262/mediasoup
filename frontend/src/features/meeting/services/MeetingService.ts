import { BaseService } from '../../../shared/services/BaseService';
import type { Participant, ConnectionStatus } from '../../../shared/types/common';

/**
 * Meeting state interface
 */
export interface MeetingState {
  roomId: string;
  isJoined: boolean;
  isHost: boolean;
  participants: Map<string, Participant>;
  connectionStatus: ConnectionStatus;
  localParticipant?: Participant;
}

/**
 * Join meeting parameters
 */
export interface JoinMeetingParams {
  roomId: string;
  userName: string;
  isHost?: boolean;
  roomPassword?: string;
}

/**
 * Meeting events
 */
export interface MeetingEvents {
  'participant-joined': Participant;
  'participant-left': { participantId: string };
  'participant-updated': Participant;
  'meeting-ended': { reason: string };
  'connection-status-changed': ConnectionStatus;
  'error': Error;
}

/**
 * Service for managing meeting/room functionality
 */
export class MeetingService extends BaseService {
  private state: MeetingState = {
    roomId: '',
    isJoined: false,
    isHost: false,
    participants: new Map(),
    connectionStatus: 'disconnected',
  };

  constructor() {
    super({ name: 'Meeting' });
  }

  /**
   * Join a meeting room
   */
  public async joinMeeting(params: JoinMeetingParams): Promise<void> {
    this.validateRequired({ 
      roomId: params.roomId, 
      userName: params.userName 
    }, 'joinMeeting');

    await this.executeWithLogging(
      'Join Meeting',
      async () => {
        // Update state
        this.updateState({
          roomId: params.roomId,
          connectionStatus: 'connecting',
        });

        // Create local participant
        const localParticipant: Participant = {
          id: crypto.randomUUID(),
          userId: crypto.randomUUID(),
          roomId: params.roomId,
          name: params.userName,
          isHost: params.isHost || false,
          joinedAt: new Date().toISOString(),
          isAudioEnabled: true,
          isVideoEnabled: true,
          isScreenSharing: false,
          connectionStatus: 'connecting',
        };

        this.updateState({
          isJoined: true,
          isHost: params.isHost || false,
          localParticipant,
          connectionStatus: 'connected',
        });

        // Add local participant to participants map
        this.state.participants.set(localParticipant.id, localParticipant);

        this.emitEvent('participant-joined', localParticipant);
        this.emitEvent('connection-status-changed', 'connected');
             },
       { roomId: params.roomId, userName: params.userName, isHost: params.isHost }
     );
  }

  /**
   * Leave the meeting
   */
  public async leaveMeeting(): Promise<void> {
    await this.executeWithLogging(
      'Leave Meeting',
      async () => {
        const { localParticipant } = this.state;
        
        if (localParticipant) {
          this.emitEvent('participant-left', { participantId: localParticipant.id });
        }

        // Reset state
        this.updateState({
          roomId: '',
          isJoined: false,
          isHost: false,
          participants: new Map(),
          connectionStatus: 'disconnected',
          localParticipant: undefined,
        });

        this.emitEvent('connection-status-changed', 'disconnected');
      }
    );
  }

  /**
   * Add a remote participant
   */
  public addParticipant(participant: Participant): void {
    this.executeWithLogging(
      'Add Participant',
      async () => {
        this.state.participants.set(participant.id, participant);
        this.emitEvent('participant-joined', participant);
      },
      { participantId: participant.id, participantName: participant.name }
    );
  }

  /**
   * Remove a participant
   */
  public removeParticipant(participantId: string): void {
    this.executeWithLogging(
      'Remove Participant',
      async () => {
        const participant = this.state.participants.get(participantId);
        if (participant) {
          this.state.participants.delete(participantId);
          this.emitEvent('participant-left', { participantId });
        }
      },
      { participantId }
    );
  }

  /**
   * Update participant information
   */
  public updateParticipant(participantId: string, updates: Partial<Participant>): void {
    this.executeWithLogging(
      'Update Participant',
      async () => {
        const participant = this.state.participants.get(participantId);
        if (participant) {
          const updatedParticipant = { ...participant, ...updates };
          this.state.participants.set(participantId, updatedParticipant);
          
          // Update local participant if it's the same
          if (this.state.localParticipant?.id === participantId) {
            this.state.localParticipant = updatedParticipant;
          }
          
          this.emitEvent('participant-updated', updatedParticipant);
        }
      },
      { participantId, updates }
    );
  }

  /**
   * Toggle local audio
   */
  public toggleAudio(enabled?: boolean): boolean {
    const { localParticipant } = this.state;
    if (!localParticipant) {
      this.logger.warn('No local participant to toggle audio');
      return false;
    }

    const newState = enabled ?? !localParticipant.isAudioEnabled;
    this.updateParticipant(localParticipant.id, { isAudioEnabled: newState });
    
    this.logger.info(`Local audio ${newState ? 'enabled' : 'disabled'}`);
    return newState;
  }

  /**
   * Toggle local video
   */
  public toggleVideo(enabled?: boolean): boolean {
    const { localParticipant } = this.state;
    if (!localParticipant) {
      this.logger.warn('No local participant to toggle video');
      return false;
    }

    const newState = enabled ?? !localParticipant.isVideoEnabled;
    this.updateParticipant(localParticipant.id, { isVideoEnabled: newState });
    
    this.logger.info(`Local video ${newState ? 'enabled' : 'disabled'}`);
    return newState;
  }

  /**
   * Toggle screen sharing
   */
  public toggleScreenShare(enabled?: boolean): boolean {
    const { localParticipant } = this.state;
    if (!localParticipant) {
      this.logger.warn('No local participant to toggle screen share');
      return false;
    }

    const newState = enabled ?? !localParticipant.isScreenSharing;
    this.updateParticipant(localParticipant.id, { isScreenSharing: newState });
    
    this.logger.info(`Screen sharing ${newState ? 'started' : 'stopped'}`);
    return newState;
  }

  /**
   * End meeting (host only)
   */
  public async endMeeting(reason = 'Meeting ended by host'): Promise<void> {
    if (!this.state.isHost) {
      throw this.createError('Only host can end meeting', 'NOT_HOST');
    }

    await this.executeWithLogging(
      'End Meeting',
      async () => {
        this.emitEvent('meeting-ended', { reason });
        await this.leaveMeeting();
      },
      { reason }
    );
  }

  /**
   * Get current meeting state
   */
  public getState(): MeetingState {
    return {
      ...this.state,
      participants: new Map(this.state.participants), // Return copy
    };
  }

  /**
   * Get participants as array
   */
  public getParticipants(): Participant[] {
    return Array.from(this.state.participants.values());
  }

  /**
   * Get participant by ID
   */
  public getParticipant(participantId: string): Participant | undefined {
    return this.state.participants.get(participantId);
  }

  /**
   * Get local participant
   */
  public getLocalParticipant(): Participant | undefined {
    return this.state.localParticipant;
  }

  /**
   * Check if user is in meeting
   */
  public isInMeeting(): boolean {
    return this.state.isJoined;
  }

  /**
   * Check if user is host
   */
  public isHost(): boolean {
    return this.state.isHost;
  }

  /**
   * Get participant count
   */
  public getParticipantCount(): number {
    return this.state.participants.size;
  }

  /**
   * Update connection status
   */
  public updateConnectionStatus(status: ConnectionStatus): void {
    if (this.state.connectionStatus !== status) {
      this.updateState({ connectionStatus: status });
      this.emitEvent('connection-status-changed', status);
    }
  }

  /**
   * Add event listener for meeting events
   */
  public on<K extends keyof MeetingEvents>(
    event: K,
    callback: (data: MeetingEvents[K]) => void
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.addEventListener(event, callback as any);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof MeetingEvents>(
    event: K,
    callback: (data: MeetingEvents[K]) => void
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.removeEventListener(event, callback as any);
  }

  /**
   * Get service health
   */
  public getHealth() {
    return {
      ...super.getHealth(),
      status: this.state.isJoined ? ('healthy' as const) : ('unhealthy' as const),
    };
  }

  /**
   * Update meeting state
   */
  private updateState(updates: Partial<MeetingState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Cleanup service
   */
  protected cleanup(): void {
    if (this.state.isJoined) {
      this.leaveMeeting();
    }
    super.cleanup();
  }
} 