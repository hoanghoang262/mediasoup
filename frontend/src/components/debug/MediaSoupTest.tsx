import React, { useState, useRef } from 'react';
import { mediasoupService } from '@/services/MediasoupService';

export const MediaSoupTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setTestResults(prev => [...prev, logMessage]);
    console.log(logMessage);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 100);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  const runFullMediaSoupTest = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    clearLogs();
    
    try {
      addLog('🔄 Starting comprehensive MediaSoup test...');

      // Step 1: Test basic WebSocket connection
      addLog('📡 Testing WebSocket connection...');
      
      // First check if we can reach the backend
      try {
        const healthResponse = await fetch('http://localhost:3000/api/health');
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          addLog(`✅ Backend is reachable: ${JSON.stringify(healthData)}`);
        } else {
          addLog(`⚠️ Backend responded with status: ${healthResponse.status}`);
        }
      } catch (fetchError) {
        addLog('❌ Cannot reach backend HTTP API: ' + fetchError);
        setIsRunning(false);
        return;
      }

      // Now test WebSocket connection
      try {
        const wsUrl = 'ws://localhost:3000?roomId=test-room&peerId=test-user';
        addLog(`🔗 Connecting to WebSocket: ${wsUrl}`);
        // Use protoo subprotocol as required by protoo-server
        const ws = new WebSocket(wsUrl, 'protoo');
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            addLog('⏰ WebSocket connection timeout after 5 seconds');
            if (ws.readyState === WebSocket.CONNECTING) {
              ws.close();
            }
            reject(new Error('WebSocket connection timeout'));
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            addLog('✅ WebSocket connected successfully');
            addLog(`📊 WebSocket state: readyState=${ws.readyState}, url=${ws.url}`);
            ws.close(1000, 'Test completed');
            resolve();
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            addLog(`❌ WebSocket error event: ${JSON.stringify(error)}`);
            addLog(`📊 WebSocket state during error: readyState=${ws.readyState}`);
            reject(error);
          };

          ws.onclose = (event) => {
            clearTimeout(timeout);
            addLog(`🔒 WebSocket closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`);
            if (event.code !== 1000 && event.code !== 1001) {
              reject(new Error(`WebSocket closed unexpectedly: ${event.code} ${event.reason}`));
            }
          };
        });
      } catch (wsError) {
        addLog('❌ WebSocket test failed: ' + wsError);
        setIsRunning(false);
        return;
      }

      // Step 2: Test MediaSoup service connection
      addLog('🎥 Testing MediaSoup service connection...');
      
      // Add event listeners to capture all MediaSoup events
      const events = ['connected', 'disconnected', 'error', 'localStream', 'remoteStreamAdded'];
      const eventListeners: { [key: string]: (...args: unknown[]) => void } = {};
      
      events.forEach(event => {
                 eventListeners[event] = (...args: unknown[]) => {
           const formattedArgs = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
           addLog(`📢 MediaSoup event '${event}': ${formattedArgs}`);
         };
        mediasoupService.addEventListener(event, eventListeners[event]);
      });

      try {
        // Generate test room and user IDs
        const testRoomId = `test-${Date.now()}`;
        const testUserId = `user-${Date.now()}`;
        
        addLog(`🏠 Connecting to room: ${testRoomId} as user: ${testUserId}`);
        
        // Connect to MediaSoup
        await mediasoupService.connect(testRoomId, testUserId);
        addLog('✅ MediaSoup connection completed');
        
        // Test getting local stream
        addLog('🎬 Testing local media access...');
        const stream = await mediasoupService.getLocalStream();
        addLog(`✅ Local stream obtained with ${stream.getTracks().length} tracks`);
        
        stream.getTracks().forEach((track, index) => {
          addLog(`  Track ${index + 1}: ${track.kind} - ${track.readyState} - ${track.enabled ? 'enabled' : 'disabled'}`);
        });

        // Wait a moment to see if any additional events fire
        addLog('⏳ Waiting for additional events...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        addLog('✅ MediaSoup test completed successfully!');
        
      } catch (mediasoupError) {
        addLog('❌ MediaSoup test failed: ' + mediasoupError);
      }

      // Cleanup event listeners
      events.forEach(event => {
        mediasoupService.removeEventListener(event, eventListeners[event]);
      });

    } catch (error) {
      addLog('❌ Test failed: ' + error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">🔧 MediaSoup Connection Test</h3>
        <div className="flex gap-2">
          <button
            onClick={clearLogs}
            disabled={isRunning}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Clear Logs
          </button>
          <button
            onClick={runFullMediaSoupTest}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isRunning ? '🔄 Running Test...' : '▶️ Run Full Test'}
          </button>
        </div>
      </div>

      <div 
        ref={logRef}
        className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm"
      >
        {testResults.length === 0 ? (
          <div className="text-gray-500">Click "Run Full Test" to start testing MediaSoup connection...</div>
        ) : (
          testResults.map((result, index) => (
            <div key={index} className="mb-1">
              {result}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>This test will:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Test WebSocket connection to backend</li>
          <li>Test MediaSoup service initialization</li>
          <li>Test local media access (camera/microphone)</li>
          <li>Show detailed logs of each step</li>
          <li>Identify exactly where the connection fails</li>
        </ul>
      </div>
    </div>
  );
}; 