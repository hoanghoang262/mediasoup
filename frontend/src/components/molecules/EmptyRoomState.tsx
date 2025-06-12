import { useState } from 'react';
import { Card, CardBody } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';

interface EmptyRoomStateProps {
  /**
   * The room ID to display and copy
   */
  roomId: string;
}

/**
 * EmptyRoomState displays when there are no other participants in the room
 */
export function EmptyRoomState({ roomId }: EmptyRoomStateProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };
  
  return (
    <Card className="mt-8 border-dashed p-8 text-center max-w-md mx-auto">
      <CardBody>
        <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">Waiting for others</h3>
        <p className="text-muted-foreground mb-6">
          Share the room ID with others to invite them to your meeting
        </p>
        <div className="relative">
          <div className="bg-background p-3 rounded-md border border-border flex items-center justify-between overflow-hidden group">
            <code className="text-sm font-mono text-primary">{roomId}</code>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleCopyRoomId}
              leftIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              }
            >
              Copy
            </Button>
          </div>
          {copySuccess && (
            <div className="absolute -bottom-9 left-0 right-0 bg-primary/10 text-primary py-2 px-3 rounded-md text-xs transition-opacity duration-300">
              Room ID copied to clipboard!
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
} 