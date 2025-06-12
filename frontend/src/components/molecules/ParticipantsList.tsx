import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';

interface User {
  id: string;
  name: string;
}

interface ParticipantsListProps {
  /**
   * The users in the room
   */
  users: User[];
  
  /**
   * The room ID to display and copy
   */
  roomId: string;
}

/**
 * ParticipantsList displays all users in the room with their names
 */
export function ParticipantsList({ users, roomId }: ParticipantsListProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  return (
    <Card className="fixed right-6 bottom-24 w-72 shadow-lg transition-all duration-300" 
      style={{ height: isCollapsed ? '54px' : 'auto', maxHeight: '70vh' }}>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 cursor-pointer" onClick={toggleCollapse}>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {users.slice(0, 3).map((user) => (
              <div key={user.id} className="h-6 w-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-semibold text-primary">
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {users.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-background border-2 border-background flex items-center justify-center text-xs font-semibold">
                +{users.length - 3}
              </div>
            )}
          </div>
          <span className="font-medium text-sm">
            Participants ({users.length})
          </span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </CardHeader>
      
      {!isCollapsed && (
        <>
          <div className="max-h-60 overflow-y-auto">
            <CardBody className="py-2 px-4 divide-y divide-border">
              {users.map(user => (
                <div key={user.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{user.name}</span>
                  </div>
                </div>
              ))}
            </CardBody>
          </div>
          
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="relative">
              <div className="bg-background p-2 rounded-md border border-border flex items-center justify-between overflow-hidden text-xs">
                <div className="truncate font-mono text-primary">{roomId}</div>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyRoomId}
                  className="ml-2 h-6 px-2"
                  leftIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  }
                >
                  Copy
                </Button>
              </div>
              {copySuccess && (
                <div className="absolute -bottom-7 left-0 right-0 bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-opacity duration-300">
                  Room ID copied!
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
} 