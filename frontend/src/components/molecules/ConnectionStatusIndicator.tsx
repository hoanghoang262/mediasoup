import { useState, useEffect } from 'react';
import { useCallStore } from '@/store/callStore';
import { mediasoupService } from '@/services/MediasoupService';
import { StatusIcon } from '@/components/atoms/StatusIcon';
import { type ConnectionState } from '@/types/connection';

interface IceStatus {
  sendTransportState: string;
  recvTransportState: string;
  hasIceFailure: boolean;
}

/**
 * ConnectionStatusIndicator displays the current WebRTC and WebSocket connection status
 * with visual feedback and detailed information on failures
 */
export function ConnectionStatusIndicator() {
  const { connectionStatus } = useCallStore();
  const [iceStatus, setIceStatus] = useState<IceStatus>({
    sendTransportState: 'new',
    recvTransportState: 'new',
    hasIceFailure: false
  });
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    // Function to check and update ICE connection status
    const checkIceStatus = () => {
      const state = mediasoupService.state;
      const newIceStatus: IceStatus = {
        sendTransportState: state.sendTransport ? 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (state.sendTransport as any).connectionState || 'unknown' : 'none',
        recvTransportState: state.recvTransport ? 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (state.recvTransport as any).connectionState || 'unknown' : 'none',
        hasIceFailure: false
      };
      
      // Check if we have an ICE failure
      if (newIceStatus.sendTransportState === 'failed' || newIceStatus.recvTransportState === 'failed') {
        newIceStatus.hasIceFailure = true;
      }
      
      setIceStatus(newIceStatus);
    };
    
    // Check initial status
    checkIceStatus();
    
    // Set up interval to periodically check status
    const interval = setInterval(checkIceStatus, 2000);
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, []);
  
  const statusMessages: Record<ConnectionState['connectionStatus'], string> = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    failed: 'Connection Failed',
    reconnecting: 'Reconnecting...',
  };
  
  const statusClasses: Record<ConnectionState['connectionStatus'], string> = {
    connected: 'bg-green-100 text-green-800 border-green-200',
    connecting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    disconnected: 'bg-red-100 text-red-800 border-red-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    reconnecting: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  
  // Add warning for ICE failure
  const iceFailureWarning = iceStatus.hasIceFailure && (
    <div className="absolute top-full left-0 mt-2 w-60 bg-red-100 text-red-800 border border-red-200 px-3 py-2 text-xs rounded-md shadow-md z-10">
      <div className="font-semibold mb-1">WebRTC Connection Failed</div>
      <div>Your network may be blocking UDP traffic or have restrictive firewall settings.</div>
      <div className="mt-1">
        <span className="font-medium">Send:</span> {iceStatus.sendTransportState}
        <br />
        <span className="font-medium">Receive:</span> {iceStatus.recvTransportState}
      </div>
    </div>
  );
  
  return (
    <div className="relative">
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border ${statusClasses[connectionStatus]} ${iceStatus.hasIceFailure ? 'cursor-pointer' : ''}`}
        onClick={() => iceStatus.hasIceFailure && setShowDetails(!showDetails)}
        title={iceStatus.hasIceFailure ? "ICE connection failure detected - click for details" : ""}
      >
        <StatusIcon status={connectionStatus} />
        <span>{statusMessages[connectionStatus]}</span>
        {iceStatus.hasIceFailure && (
          <StatusIcon status="failed" />
        )}
      </div>
      
      {showDetails && iceFailureWarning}
    </div>
  );
} 