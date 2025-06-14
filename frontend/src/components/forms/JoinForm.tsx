import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Video, Plus, Users, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '@/services/ApiService';

interface JoinFormProps {
  onJoin?: (roomId: string, userName: string) => void;
}

export const JoinForm: React.FC<JoinFormProps> = ({ onJoin }) => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [roomValidation, setRoomValidation] = useState<{
    status: 'idle' | 'valid' | 'invalid' | 'checking';
    message?: string;
  }>({ status: 'idle' });

  // Validate room ID when user types
  const handleRoomIdChange = async (value: string) => {
    setRoomId(value);
    setRoomValidation({ status: 'idle' });

    if (!value.trim()) {
      setRoomValidation({ status: 'idle' });
      return;
    }

    if (value.length < 3) {
      setRoomValidation({ 
        status: 'invalid', 
        message: 'Room ID must be at least 3 characters' 
      });
      return;
    }

    // Debounce validation
    const timeoutId = setTimeout(async () => {
      setRoomValidation({ status: 'checking' });
      setIsValidating(true);

      try {
        const room = await apiService.getRoom(value);
        if (room) {
          setRoomValidation({ 
            status: 'valid', 
            message: `Room "${room.name}" found` 
          });
        } else {
          setRoomValidation({ 
            status: 'invalid', 
            message: 'Room does not exist' 
          });
        }
             } catch {
         setRoomValidation({ 
           status: 'invalid', 
           message: 'Failed to validate room' 
         });
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomId.trim() || !userName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (roomValidation.status !== 'valid') {
      toast.error('Please enter a valid room ID');
      return;
    }

    setIsJoining(true);

    try {
      // Final validation before joining
      const room = await apiService.joinRoom(roomId);
      
      toast.success(`Joining room "${room.name}"...`);
      
      if (onJoin) {
        onJoin(roomId, userName);
      } else {
        navigate(`/room/${roomId}?userName=${encodeURIComponent(userName)}`);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      
      if (error instanceof Error && error.message === 'Room does not exist') {
        toast.error('Room not found', {
          description: 'The room ID you entered does not exist.',
          action: {
            label: 'Create Room',
            onClick: handleCreateRoom
          }
        });
        setRoomValidation({ 
          status: 'invalid', 
          message: 'Room does not exist' 
        });
      } else {
        toast.error('Failed to join room', {
          description: 'Please try again or create a new room.'
        });
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      toast.error('Please enter your name first');
      return;
    }

    setIsCreating(true);

    try {
      const { roomId: newRoomId, room } = await apiService.createRoom();
      
      toast.success(`Room "${room.name}" created!`, {
        description: `Room ID: ${newRoomId}`
      });

      setRoomId(newRoomId);
      setRoomValidation({ 
        status: 'valid', 
        message: `Room "${room.name}" created successfully` 
      });

      // Auto-join the created room
      setTimeout(() => {
        if (onJoin) {
          onJoin(newRoomId, userName);
        } else {
          navigate(`/room/${newRoomId}?userName=${encodeURIComponent(userName)}`);
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to create room:', error);
      toast.error('Failed to create room', {
        description: 'Please try again.'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getRoomValidationIcon = () => {
    switch (roomValidation.status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getRoomValidationColor = () => {
    switch (roomValidation.status) {
      case 'valid':
        return 'border-green-500 focus:border-green-500';
      case 'invalid':
        return 'border-red-500 focus:border-red-500';
      case 'checking':
        return 'border-blue-500 focus:border-blue-500';
      default:
        return '';
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Video className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Join Video Meeting
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter a room ID to join an existing meeting or create a new one
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleJoinRoom} className="space-y-4">
            {/* Room ID Input */}
            <div className="space-y-2">
              <Label htmlFor="roomId" className="text-sm font-medium text-gray-700">
                Room ID
              </Label>
              <div className="relative">
                <Input
                  id="roomId"
                  type="text"
                  placeholder="Enter room ID (e.g., main, meeting)"
                  value={roomId}
                  onChange={(e) => handleRoomIdChange(e.target.value)}
                  className={`pr-10 ${getRoomValidationColor()}`}
                  disabled={isJoining || isCreating}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getRoomValidationIcon()}
                </div>
              </div>
              {roomValidation.message && (
                <p className={`text-xs ${
                  roomValidation.status === 'valid' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {roomValidation.message}
                </p>
              )}
            </div>

            {/* User Name Input */}
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-sm font-medium text-gray-700">
                Your Name
              </Label>
              <div className="relative">
                <Input
                  id="userName"
                  type="text"
                  placeholder="Enter your display name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  disabled={isJoining || isCreating}
                />
                <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Join Room Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
              disabled={
                isJoining || 
                isCreating || 
                isValidating ||
                !roomId.trim() || 
                !userName.trim() || 
                roomValidation.status !== 'valid'
              }
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining Room...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Join Room
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Create New Room Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5"
            onClick={handleCreateRoom}
            disabled={isJoining || isCreating || !userName.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Room...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create New Room
              </>
            )}
          </Button>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Room IDs are case-sensitive. Popular rooms: "main", "meeting"
            </p>
          </div>
        </CardContent>
      </Card>
  );
}; 