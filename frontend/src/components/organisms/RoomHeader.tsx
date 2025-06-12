import { ConnectionStatusIndicator } from '@/components/molecules/ConnectionStatusIndicator';
import { MediaAccessIndicator } from '@/components/molecules/MediaAccessIndicator';

interface RoomHeaderProps {
  /**
   * The room ID
   */
  roomId: string;
  
  /**
   * The user's name
   */
  userName: string;
  
  /**
   * The local media stream
   */
  localStream: MediaStream | null;
}

/**
 * RoomHeader displays the app header with connection status and room information
 */
export function RoomHeader({ roomId, userName, localStream }: RoomHeaderProps) {
  return (
    <header className="py-4 px-6 border-b border-border/50 backdrop-blur-sm bg-background/90 sticky top-0 z-20 transition-all duration-300 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">VideoMeet</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <ConnectionStatusIndicator />
          
          {localStream && <MediaAccessIndicator stream={localStream} />}
          
          <div className="bg-primary/5 px-4 py-2 rounded-full flex items-center gap-2 border border-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="font-medium text-sm text-primary">{roomId}</span>
          </div>
          
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
} 