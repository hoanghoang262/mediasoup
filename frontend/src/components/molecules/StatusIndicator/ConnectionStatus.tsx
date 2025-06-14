import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  /**
   * Connection status
   */
  status?: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'failed';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ConnectionStatus molecule shows the current connection status
 */
export function ConnectionStatus({ 
  status = 'connected', 
  className 
}: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      icon: '●'
    },
    connecting: {
      color: 'bg-yellow-500 animate-pulse',
      text: 'Connecting...',
      icon: '●'
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Disconnected',
      icon: '●'
    },
    reconnecting: {
      color: 'bg-orange-500 animate-pulse',
      text: 'Reconnecting...',
      icon: '●'
    },
    failed: {
      color: 'bg-red-600',
      text: 'Connection Failed',
      icon: '●'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div className={cn('w-2 h-2 rounded-full', config.color)} />
      <span className="text-muted-foreground">{config.text}</span>
    </div>
  );
} 