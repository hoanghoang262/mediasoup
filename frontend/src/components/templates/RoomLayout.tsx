import type { ReactNode } from 'react';
import { RoomHeader } from '@/components/organisms/RoomHeader';
import { RoomControls } from '@/components/organisms/RoomControls';

interface RoomLayoutProps {
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
  
  /**
   * The content to render in the main area
   */
  children: ReactNode;
}

/**
 * RoomLayout provides the base layout structure for the video conference room
 */
export function RoomLayout({ 
  roomId, 
  userName, 
  localStream, 
  children 
}: RoomLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      
      <RoomHeader 
        roomId={roomId}
        userName={userName}
        localStream={localStream}
      />
      
      <main className="flex-1 p-6 container mx-auto">
        {children}
      </main>
      
      <RoomControls />
    </div>
  );
} 