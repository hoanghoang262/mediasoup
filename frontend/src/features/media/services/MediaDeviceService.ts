import { BaseService } from '../../../shared/services/BaseService';
import type { MediaStreamInfo } from '../../../shared/types/common';
import { mediaConfig } from '../../../config/env.config';

/**
 * Media device permissions
 */
export interface MediaPermissions {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

/**
 * Media constraints for getUserMedia
 */
export interface MediaConstraints {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

/**
 * Screen share constraints
 */
export interface ScreenShareConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}

/**
 * Media device info
 */
export interface MediaDeviceInfo {
  deviceId: string;
  groupId: string;
  kind: MediaDeviceKind;
  label: string;
}

/**
 * Service for managing media devices and streams
 */
export class MediaDeviceService extends BaseService {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private permissions: MediaPermissions = {
    audio: false,
    video: false,
    screen: false,
  };

  constructor() {
    super({ name: 'MediaDevice' });
  }

  /**
   * Get available media devices
   */
  public async getDevices(): Promise<MediaDeviceInfo[]> {
    return this.executeWithLogging(
      'Get Media Devices',
      async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.map(device => ({
          deviceId: device.deviceId,
          groupId: device.groupId,
          kind: device.kind,
          label: device.label,
        }));
      }
    );
  }

  /**
   * Check media permissions
   */
  public async checkPermissions(): Promise<MediaPermissions> {
    return this.executeWithLogging(
      'Check Media Permissions',
      async () => {
        const permissions = await Promise.allSettled([
          navigator.permissions.query({ name: 'microphone' as PermissionName }),
          navigator.permissions.query({ name: 'camera' as PermissionName }),
        ]);

        this.permissions = {
          audio: permissions[0].status === 'fulfilled' && permissions[0].value.state === 'granted',
          video: permissions[1].status === 'fulfilled' && permissions[1].value.state === 'granted',
          screen: true, // Screen share permission is requested on demand
        };

        return { ...this.permissions };
      }
    );
  }

  /**
   * Get user media stream with fallback handling
   */
  public async getUserMedia(constraints: MediaConstraints = {}): Promise<MediaStreamInfo> {
    if (!mediaConfig.audio && !mediaConfig.video) {
      throw this.createError('Media not enabled in configuration', 'MEDIA_DISABLED');
    }

    const finalConstraints: MediaStreamConstraints = {
      audio: mediaConfig.audio ? (constraints.audio ?? true) : false,
      video: mediaConfig.video ? (constraints.video ?? true) : false,
    };

    return this.executeWithLogging(
      'Get User Media',
      async () => {
        // Stop existing stream if any
        if (this.localStream) {
          this.stopLocalStream();
        }

        let stream: MediaStream;
        
        try {
          // Try to get both audio and video
          stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
          this.logger.info('✅ Got both audio and video stream');
        } catch (error) {
          this.logger.warn('Failed to get video stream, trying audio only', { error });
          
          // Fallback to audio only if video fails
          if (finalConstraints.video && finalConstraints.audio) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: finalConstraints.audio,
                video: false,
              });
              this.logger.info('✅ Got audio-only stream as fallback');
            } catch {
              this.logger.error('Failed to get any media stream');
              throw this.createError(
                'Unable to access microphone or camera. Please check permissions.',
                'MEDIA_ACCESS_DENIED'
              );
            }
          } else {
            // Re-throw if not a video constraint issue
            throw this.createError(
              'Media access failed. Please check device permissions.',
              'MEDIA_ACCESS_FAILED'
            );
          }
        }

        this.localStream = stream;
        
        // Update permissions based on actual tracks
        this.permissions.audio = this.localStream.getAudioTracks().length > 0;
        this.permissions.video = this.localStream.getVideoTracks().length > 0;

        // Log what we actually got
        const audioTracks = this.localStream.getAudioTracks();
        const videoTracks = this.localStream.getVideoTracks();
        this.logger.info('Media stream acquired', {
          streamId: this.localStream.id,
          audioTracks: audioTracks.length,
          videoTracks: videoTracks.length,
          audioEnabled: audioTracks.length > 0 ? audioTracks[0].enabled : false,
          videoEnabled: videoTracks.length > 0 ? videoTracks[0].enabled : false,
        });

        const streamInfo: MediaStreamInfo = {
          id: this.localStream.id,
          stream: this.localStream,
          track: this.localStream.getTracks()[0], // Primary track
          kind: this.localStream.getVideoTracks().length > 0 ? 'video' : 'audio',
          isScreenShare: false,
          peerId: 'local',
          isLocal: true,
        };

        this.emitEvent('streamAcquired', streamInfo);
        return streamInfo;
      },
      { constraints: finalConstraints }
    );
  }

  /**
   * Get screen share stream
   */
  public async getScreenShare(includeAudio = true): Promise<MediaStreamInfo> {
    if (!mediaConfig.screenShare) {
      throw this.createError('Screen sharing not enabled', 'SCREEN_SHARE_DISABLED');
    }

    const constraints: MediaStreamConstraints = {
      video: {
        mediaSource: 'screen',
      } as MediaTrackConstraints,
      audio: includeAudio,
    };

    return this.executeWithLogging(
      'Get Screen Share',
      async () => {
        // Stop existing screen stream if any
        if (this.screenStream) {
          this.stopScreenShare();
        }

        this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

        const streamInfo: MediaStreamInfo = {
          id: this.screenStream.id,
          stream: this.screenStream,
          track: this.screenStream.getVideoTracks()[0],
          kind: 'video',
          isScreenShare: true,
          peerId: 'local',
          isLocal: true,
        };

        // Handle screen share end by user
        this.screenStream.getVideoTracks()[0].onended = () => {
          this.logger.info('Screen sharing ended by user');
          this.stopScreenShare();
          this.emitEvent('screenShareEnded');
        };

        this.emitEvent('screenShareStarted', streamInfo);
        return streamInfo;
      },
      { includeAudio }
    );
  }

  /**
   * Stop local media stream
   */
  public stopLocalStream(): void {
    this.executeWithLogging(
      'Stop Local Stream',
      async () => {
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            track.stop();
            this.logger.debug(`Stopped ${track.kind} track: ${track.id}`);
          });
          this.localStream = null;
          this.emitEvent('streamStopped', { type: 'local' });
        }
      }
    );
  }

  /**
   * Stop screen share stream
   */
  public stopScreenShare(): void {
    this.executeWithLogging(
      'Stop Screen Share',
      async () => {
        if (this.screenStream) {
          this.screenStream.getTracks().forEach(track => {
            track.stop();
            this.logger.debug(`Stopped screen ${track.kind} track: ${track.id}`);
          });
          this.screenStream = null;
          this.emitEvent('screenShareStopped');
        }
      }
    );
  }

  /**
   * Toggle audio track
   */
  public toggleAudio(enabled?: boolean): boolean {
    const audioTracks = this.localStream?.getAudioTracks() || [];
    if (audioTracks.length === 0) {
      this.logger.warn('No audio tracks available to toggle');
      return false;
    }

    const newState = enabled ?? !audioTracks[0].enabled;
    audioTracks.forEach(track => {
      track.enabled = newState;
    });

    this.logger.info(`Audio ${newState ? 'enabled' : 'disabled'}`);
    this.emitEvent('audioToggled', { enabled: newState });
    return newState;
  }

  /**
   * Toggle video track
   */
  public toggleVideo(enabled?: boolean): boolean {
    const videoTracks = this.localStream?.getVideoTracks() || [];
    if (videoTracks.length === 0) {
      this.logger.warn('No video tracks available to toggle');
      return false;
    }

    const newState = enabled ?? !videoTracks[0].enabled;
    videoTracks.forEach(track => {
      track.enabled = newState;
    });

    this.logger.info(`Video ${newState ? 'enabled' : 'disabled'}`);
    this.emitEvent('videoToggled', { enabled: newState });
    return newState;
  }

  /**
   * Switch camera (front/back on mobile)
   */
  public async switchCamera(): Promise<void> {
    if (!this.localStream) {
      throw this.createError('No active video stream', 'NO_ACTIVE_STREAM');
    }

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      throw this.createError('No video tracks available', 'NO_VIDEO_TRACKS');
    }

    await this.executeWithLogging(
      'Switch Camera',
      async () => {
        const currentTrack = videoTracks[0];
        const currentFacingMode = currentTrack.getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        // Get new stream with switched camera
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
          audio: false,
        });

        // Replace the track
        const newVideoTrack = newStream.getVideoTracks()[0];
        this.localStream!.removeTrack(currentTrack);
        this.localStream!.addTrack(newVideoTrack);

        // Stop old track
        currentTrack.stop();

        this.logger.info(`Switched camera to ${newFacingMode}`);
        this.emitEvent('cameraSwirched', { facingMode: newFacingMode });
      }
    );
  }

  /**
   * Get current stream states
   */
  public getStreamStates() {
    const audioTracks = this.localStream?.getAudioTracks() || [];
    const videoTracks = this.localStream?.getVideoTracks() || [];

    return {
      hasLocalStream: !!this.localStream,
      hasScreenShare: !!this.screenStream,
      audioEnabled: audioTracks.length > 0 && audioTracks[0].enabled,
      videoEnabled: videoTracks.length > 0 && videoTracks[0].enabled,
      permissions: { ...this.permissions },
    };
  }

  /**
   * Get current streams
   */
  public getStreams() {
    return {
      localStream: this.localStream,
      screenStream: this.screenStream,
    };
  }

  /**
   * Cleanup service
   */
  protected cleanup(): void {
    this.stopLocalStream();
    this.stopScreenShare();
    super.cleanup();
  }

  /**
   * Get service health
   */
  public getHealth() {
    const { hasLocalStream, hasScreenShare } = this.getStreamStates();
    
    return {
      ...super.getHealth(),
      status: (hasLocalStream || hasScreenShare) ? ('healthy' as const) : ('unhealthy' as const),
    };
  }
} 