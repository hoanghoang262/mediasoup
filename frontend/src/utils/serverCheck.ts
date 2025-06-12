/**
 * Utility to check if the backend server is running
 */
import { toast } from 'sonner';

// Backend server URL configuration
const BACKEND_URL = 'http://localhost:3000';

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT = 5000;

// Track toast IDs to prevent duplicates
const activeToastIds: Set<string> = new Set();

/**
 * Checks if the backend server is running and accessible
 * @returns A promise that resolves to true if the server is running, false otherwise
 */
export async function isServerRunning(): Promise<boolean> {
  try {
    // Create an AbortController to handle timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
    
    try {
      // Try to make a simple HTTP request to the server
      const serverUrl = `${BACKEND_URL}/api/health`;
      const response = await fetch(serverUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // If we get any response, consider the server running
      return response.ok;
    } catch (error) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check if the error was due to timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('Server check timed out after', CONNECTION_TIMEOUT, 'ms');
      } else {
        console.error('Server check failed:', error);
      }
      
      return false;
    }
  } catch (error) {
    console.error('Server check failed with unexpected error:', error);
    return false;
  }
}

/**
 * Shows a server status notification using the toast library
 * @param isRunning Whether the server is running
 */
export function showServerStatusNotification(isRunning: boolean): void {
  if (!isRunning) {
    const toastId = 'backend-server-unavailable';
    
    // Only show toast if it's not already displayed
    if (!activeToastIds.has(toastId)) {
      activeToastIds.add(toastId);
      
      toast.error('Backend server unavailable', {
        id: toastId,
        description: 'The connection to the backend server failed. Please ensure the server is running.',
        duration: 0, // Persistent notification
        onDismiss: () => {
          activeToastIds.delete(toastId);
        }
      });
    }
  }
}

/**
 * Checks server status and shows a notification if there's a problem
 */
export async function checkServerAndNotify(): Promise<boolean> {
  const serverRunning = await isServerRunning();
  if (!serverRunning) {
    showServerStatusNotification(serverRunning);
  }
  return serverRunning;
} 