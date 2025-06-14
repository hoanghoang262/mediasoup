import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';

interface RoomHeaderProps {
  roomId: string;
  userName: string;
  localStream: MediaStream | null;
}

export function RoomHeader({ roomId, userName }: RoomHeaderProps) {
  const navigate = useNavigate();

  const handleLeave = () => {
    navigate('/');
  };

  return (
    <header className="bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <Link to="/" className="text-lg font-semibold text-primary hover:text-primary/80">VideoMeet</Link>
          </div>
          
          <div className="h-6 w-px bg-border" />
          
          <div>
            <h2 className="font-medium">Room: {roomId}</h2>
            <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleLeave}
        >
          Leave Room
        </Button>
      </div>
    </header>
  );
} 