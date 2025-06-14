import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface JoinFormProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * JoinForm component for joining a video meeting room
 */
export function JoinForm({ className }: JoinFormProps) {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomId.trim() || !userName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      // Navigate to room with user data
      navigate(`/room/${roomId}?userName=${encodeURIComponent(userName)}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Join Video Meeting</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomId">Room ID</Label>
            <Input
              id="roomId"
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomId(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userName">Your Name</Label>
            <Input
              id="userName"
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)}
              required
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Joining...' : 'Join Room'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 