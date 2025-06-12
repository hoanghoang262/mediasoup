import React, { useState, useEffect } from 'react';
import { useCallStore } from '../store/callStore';
import { mediasoupService } from '../services/MediasoupService';

// Icon components
const ConnectedIcon = () => (
  <svg className="w-4 h-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const DisconnectedIcon = () => (
  <svg className="w-4 h-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
  </svg>
);

const ConnectingIcon = () => (
  <svg className="w-4 h-4 text-yellow-500 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V12L15 15" />
  </svg>
);

const ReconnectingIcon = () => (
  <svg className="w-4 h-4 text-orange-500 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const FailedIcon = () => (
  <svg className="w-4 h-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

interface IceStatus {
  sendTransportState: string;
  recvTransportState: string;
  hasIceFailure: boolean;
}

export const ConnectionStatusIndicator: React.FC = () => {
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
  
  const statusMessages = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    failed: 'Connection Failed',
    reconnecting: 'Reconnecting...',
  };
  
  const statusIcons = {
    connected: <ConnectedIcon />,
    connecting: <ConnectingIcon />,
    disconnected: <DisconnectedIcon />,
    failed: <FailedIcon />,
    reconnecting: <ReconnectingIcon />,
  };
  
  const statusClasses = {
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
        {statusIcons[connectionStatus]}
        <span>{statusMessages[connectionStatus]}</span>
        {iceStatus.hasIceFailure && (
          <FailedIcon />
        )}
      </div>
      
      {showDetails && iceFailureWarning}
    </div>
  );
}; 