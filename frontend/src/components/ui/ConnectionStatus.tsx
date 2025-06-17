import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ConnectionStats {
  status: 'connected' | 'connecting' | 'disconnected' | 'failed' | 'reconnecting';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  bandwidth: {
    upload: number;
    download: number;
  };
  participants: number;
  reconnectAttempts: number;
}

interface ConnectionStatusProps {
  stats: ConnectionStats;
  className?: string;
  onStatsVisibilityChange?: (visible: boolean) => void;
}

/**
 * Connection Status component like Google Meet
 */
export function ConnectionStatus({ stats, className, onStatsVisibilityChange }: ConnectionStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Handle dropdown toggle
  const toggleDetails = () => {
    const newShowDetails = !showDetails;
    setShowDetails(newShowDetails);
    onStatsVisibilityChange?.(newShowDetails);
  };

  // Get status color and icon
  const getStatusInfo = () => {
    switch (stats.status) {
      case 'connected':
        switch (stats.quality) {
          case 'excellent': return { color: 'text-green-500', bg: 'bg-green-500', icon: '●●●●' };
          case 'good': return { color: 'text-green-400', bg: 'bg-green-400', icon: '●●●○' };
          case 'fair': return { color: 'text-yellow-500', bg: 'bg-yellow-500', icon: '●●○○' };
          case 'poor': return { color: 'text-red-500', bg: 'bg-red-500', icon: '●○○○' };
        }
        break;
      case 'connecting':
        return { color: 'text-yellow-500', bg: 'bg-yellow-500', icon: '⟳' };
      case 'reconnecting':
        return { color: 'text-orange-500', bg: 'bg-orange-500', icon: '⟳' };
      case 'disconnected':
      case 'failed':
        return { color: 'text-red-500', bg: 'bg-red-500', icon: '✕' };
    }
  };

  const statusInfo = getStatusInfo();

  // Format bandwidth
  const formatBandwidth = (kbps: number) => {
    if (kbps < 1024) return `${kbps} kbps`;
    return `${(kbps / 1024).toFixed(1)} Mbps`;
  };

  return (
    <div className={cn('relative', className)}>
      {/* Status button */}
      <button
        onClick={toggleDetails}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-background/90 hover:bg-accent/90 text-foreground',
          'transition-all duration-200 backdrop-blur-sm',
          'border border-border'
        )}
        title="Connection status"
      >
        {/* Status indicator */}
        <div className={cn('w-3 h-3 rounded-full', statusInfo.bg)} />
        
        {/* Signal strength icon */}
        <span className={cn('text-xs font-mono', statusInfo.color)}>
          {statusInfo.icon}
        </span>

        {/* Latency */}
        <span className="text-xs">
          {stats.latency}ms
        </span>

        {/* Dropdown arrow */}
        <svg 
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            showDetails ? 'rotate-180' : ''
          )}
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Detailed stats dropdown */}
      {showDetails && (
        <div className={cn(
          'absolute top-full mt-2 right-0 z-[9999]',
          'bg-background/95 backdrop-blur-md rounded-lg border border-border',
          'p-4 min-w-64 text-foreground text-sm shadow-xl'
        )}>
          <div className="space-y-3">
            {/* Connection status */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <span className={cn('font-medium', statusInfo.color)}>
                {stats.status.charAt(0).toUpperCase() + stats.status.slice(1)}
              </span>
            </div>

            {/* Quality */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Quality:</span>
              <span className={cn('font-medium', statusInfo.color)}>
                {stats.quality.charAt(0).toUpperCase() + stats.quality.slice(1)}
              </span>
            </div>

            {/* Latency */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Latency:</span>
              <span className="font-medium">{stats.latency}ms</span>
            </div>

            {/* Bandwidth */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Upload:</span>
                <span className="font-medium">{formatBandwidth(stats.bandwidth.upload)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Download:</span>
                <span className="font-medium">{formatBandwidth(stats.bandwidth.download)}</span>
              </div>
            </div>

            {/* Participants */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Participants:</span>
              <span className="font-medium">{stats.participants}</span>
            </div>

            {/* Reconnect attempts */}
            {stats.reconnectAttempts > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Reconnect attempts:</span>
                <span className="font-medium text-orange-400">{stats.reconnectAttempts}</span>
              </div>
            )}

            {/* Status description */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {stats.status === 'connected' && stats.quality === 'excellent' && 
                  'Your connection is excellent. All features are working optimally.'}
                {stats.status === 'connected' && stats.quality === 'good' && 
                  'Your connection is good. Minor delays may occur.'}
                {stats.status === 'connected' && stats.quality === 'fair' && 
                  'Your connection is fair. Some features may be limited.'}
                {stats.status === 'connected' && stats.quality === 'poor' && 
                  'Your connection is poor. Consider checking your network.'}
                {stats.status === 'connecting' && 
                  'Connecting to the meeting...'}
                {stats.status === 'reconnecting' && 
                  'Attempting to reconnect...'}
                {(stats.status === 'disconnected' || stats.status === 'failed') && 
                  'Connection lost. Please check your network and try again.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 