import React, { useState } from 'react';
import { useMeeting } from '../features/meeting';
import { MeetingControls } from '../features/meeting';
import { VideoStream } from '../components/media/VideoStream';
import { Button } from '@/components/ui';
import { MediaDeviceService } from '../features/media';
import { cn } from '@/lib/utils';

/**
 * Example of using the new clean architecture
 */
export const NewRoomPage: React.FC = () => {
  const {
    state,
    isLoading,
    error,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    getParticipants,
    getLocalParticipant,
    isInMeeting,
    isHost,
  } = useMeeting();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaService] = useState(() => new MediaDeviceService());

  // Join meeting handler
  const handleJoinMeeting = async () => {
    try {
      // Get user media first
      const streamInfo = await mediaService.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(streamInfo.stream);

      // Join meeting
      await joinMeeting({
        roomId: 'demo-room',
        userName: 'Demo User',
        isHost: true,
      });
    } catch (error) {
      console.error('Failed to join meeting:', error);
    }
  };

  // Leave meeting handler
  const handleLeaveMeeting = async () => {
    try {
      await leaveMeeting();
      mediaService.stopLocalStream();
      setLocalStream(null);
    } catch (error) {
      console.error('Failed to leave meeting:', error);
    }
  };

  // Get local participant info
  const localParticipant = getLocalParticipant();
  const participants = getParticipants();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Clean Architecture Demo
          </h1>
          <p className="text-gray-600">
            Demonstrating the new feature-based architecture
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span className={cn(
                'px-2 py-1 rounded text-xs',
                state.connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              )}>
                {state.connectionStatus}
              </span>
            </div>
            <div>
              <span className="font-medium">Room:</span> {state.roomId || 'None'}
            </div>
            <div>
              <span className="font-medium">Participants:</span> {participants.length}
            </div>
            <div>
              <span className="font-medium">Role:</span> {isHost() ? 'Host' : 'Participant'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {!isInMeeting() ? (
          /* Join Meeting */
          <div className="text-center py-12">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Ready to join?
              </h2>
              <p className="text-gray-600">
                Click below to start the demo meeting
              </p>
            </div>
            
            <Button
              onClick={handleJoinMeeting}
              loading={isLoading}
              size="lg"
              className="px-8 py-3"
            >
              Join Demo Meeting
            </Button>
          </div>
        ) : (
          /* Meeting Interface */
          <div className="space-y-6">
            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Local Video */}
              <div className="relative">
                <VideoStream
                  stream={localStream}
                  muted={true}
                  className="aspect-video rounded-lg overflow-hidden"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  You {localParticipant?.isAudioEnabled ? '🎤' : '🔇'} {localParticipant?.isVideoEnabled ? '📹' : '📷'}
                </div>
              </div>

              {/* Remote Participants */}
              {participants
                .filter(p => p.id !== localParticipant?.id)
                .map(participant => (
                  <div key={participant.id} className="relative">
                    <VideoStream
                      stream={null} // Would be actual remote stream
                      className="aspect-video rounded-lg overflow-hidden"
                      placeholder={
                        <div className="flex items-center justify-center h-full bg-gray-800 text-white">
                          <div className="text-center">
                            <div className="text-2xl mb-2">👤</div>
                            <div className="text-sm">{participant.name}</div>
                          </div>
                        </div>
                      }
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {participant.name} {participant.isAudioEnabled ? '🎤' : '🔇'} {participant.isVideoEnabled ? '📹' : '📷'}
                    </div>
                  </div>
                ))}
            </div>

            {/* Meeting Controls */}
            <div className="flex justify-center">
              <MeetingControls
                isAudioEnabled={localParticipant?.isAudioEnabled || false}
                isVideoEnabled={localParticipant?.isVideoEnabled || false}
                isScreenSharing={localParticipant?.isScreenSharing || false}
                isHost={isHost()}
                onToggleAudio={() => toggleAudio()}
                onToggleVideo={() => toggleVideo()}
                onToggleScreenShare={() => toggleScreenShare()}
                onLeaveMeeting={handleLeaveMeeting}
                onEndMeeting={isHost() ? () => endMeeting() : undefined}
              />
            </div>

            {/* Participants List */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3">
                Participants ({participants.length})
              </h3>
              <div className="space-y-2">
                {participants.map(participant => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-sm text-gray-500">
                          {participant.isHost ? 'Host' : 'Participant'}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <span className={participant.isAudioEnabled ? 'text-green-600' : 'text-red-600'}>
                        {participant.isAudioEnabled ? '🎤' : '🔇'}
                      </span>
                      <span className={participant.isVideoEnabled ? 'text-green-600' : 'text-red-600'}>
                        {participant.isVideoEnabled ? '📹' : '📷'}
                      </span>
                      {participant.isScreenSharing && (
                        <span className="text-blue-600">🖥️</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Architecture Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🏗️ Clean Architecture Features
          </h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>✅ Feature-based organization (meeting, media modules)</li>
            <li>✅ Clean service separation with BaseService</li>
            <li>✅ Structured logging with context</li>
            <li>✅ Type-safe environment validation</li>
            <li>✅ Reusable UI components</li>
            <li>✅ React hooks for state management</li>
            <li>✅ Error handling with user-friendly messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 