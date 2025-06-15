import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ConnectionStatus, type ConnectionStats } from './ConnectionStatus';

export interface ParticipantData {
  id: string;
  name: string;
  isLocal: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantData[];
  connectionStats: ConnectionStats;
  roomId: string;
  className?: string;
}

type SidebarTab = 'participants' | 'chat' | 'settings';

/**
 * Meeting Sidebar như Google Meet
 */
export function MeetingSidebar({ 
  isOpen, 
  onClose, 
  participants, 
  connectionStats,
  roomId,
  className 
}: MeetingSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('participants');

  if (!isOpen) return null;

  // Participant component
  const ParticipantItem: React.FC<{ participant: ParticipantData }> = ({ participant }) => {
    const getQualityColor = (quality: string) => {
      switch (quality) {
        case 'excellent': return 'text-green-500';
        case 'good': return 'text-green-400';
        case 'fair': return 'text-yellow-500';
        case 'poor': return 'text-red-500';
        default: return 'text-gray-500';
      }
    };

    return (
      <div className="flex items-center gap-3 p-3 hover:bg-gray-700/50 rounded-lg transition-colors">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
          {participant.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">
              {participant.name}
            </span>
            {participant.isLocal && (
              <span className="text-xs text-gray-400">(You)</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {/* Audio status */}
            <span className={cn(
              'text-xs',
              participant.hasAudio ? 'text-green-400' : 'text-red-400'
            )}>
              {participant.hasAudio ? '🎤' : '🔇'}
            </span>

            {/* Video status */}
            <span className={cn(
              'text-xs',
              participant.hasVideo ? 'text-green-400' : 'text-red-400'
            )}>
              {participant.hasVideo ? '📹' : '📷'}
            </span>

            {/* Screen sharing */}
            {participant.isScreenSharing && (
              <span className="text-xs text-blue-400">🖥️</span>
            )}

            {/* Connection quality */}
            <span className={cn(
              'text-xs',
              getQualityColor(participant.connectionQuality)
            )}>
              ●
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!participant.isLocal && (
            <>
              <button
                className="w-6 h-6 rounded hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white"
                title="Pin participant"
              >
                📌
              </button>
              <button
                className="w-6 h-6 rounded hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white"
                title="More options"
              >
                ⋯
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'participants':
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-400 px-3">
              {participants.length} participants
            </div>
            {participants.map((participant) => (
              <ParticipantItem key={participant.id} participant={participant} />
            ))}
          </div>
        );

      case 'chat':
        return (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-3 text-gray-400 text-center">
              Chat feature coming soon...
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-4 p-3">
            <div className="space-y-2">
              <h3 className="text-white font-medium">Connection Info</h3>
              <ConnectionStatus stats={connectionStats} />
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-medium">Room Info</h3>
              <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Room ID:</span>
                  <span className="text-white font-mono">{roomId}</span>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg text-sm transition-colors">
                  Copy room link
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={cn(
        'fixed right-0 top-0 h-full w-80 z-50',
        'bg-gray-800/95 backdrop-blur-md border-l border-gray-600',
        'flex flex-col',
        'transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-white font-medium">Meeting Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600">
          {[
            { id: 'participants' as const, label: 'Participants', icon: '👥' },
            { id: 'chat' as const, label: 'Chat', icon: '💬' },
            { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors',
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600">
          <div className="text-xs text-gray-400 text-center">
            Meeting started • {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </>
  );
} 