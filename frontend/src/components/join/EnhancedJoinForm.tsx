import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCallStore } from '@/store/callStore';
import { apiService } from '@/services/ApiService';
import { toast } from 'sonner';

const formSchema = z.object({
  userName: z.string().min(2, {
    message: 'Username must be at least 2 characters.',
  }),
  roomId: z.string().min(2, {
    message: 'Room ID must be at least 2 characters.',
  }),
});

// Function to generate a random room ID
const generateRandomRoomId = () => {
  const adjectives = ['happy', 'quick', 'clever', 'brave', 'calm', 'eager', 'kind', 'proud', 'bold', 'blue'];
  const nouns = ['tiger', 'mountain', 'river', 'forest', 'ocean', 'desert', 'planet', 'galaxy', 'moon', 'star'];
  const randomNum = Math.floor(Math.random() * 1000);
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${randomAdjective}-${randomNoun}-${randomNum}`;
};

export function EnhancedJoinForm() {
  const navigate = useNavigate();
  const { setRoomId, setUserName, checkServerHealth } = useCallStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomValidationState, setRoomValidationState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: '',
      roomId: '',
    },
  });

  // Check server health on component mount
  useEffect(() => {
    const checkHealth = async () => {
      setServerStatus('checking');
      const isHealthy = await checkServerHealth();
      setServerStatus(isHealthy ? 'online' : 'offline');
    };
    
    checkHealth();
    
    // Re-check server health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkServerHealth]);

  // Validate room on blur
  const handleRoomBlur = async () => {
    const roomId = form.getValues('roomId');
    if (!roomId.trim()) {
      setRoomValidationState('idle');
      return;
    }

    setRoomValidationState('checking');
    try {
      const room = await apiService.getRoom(roomId);
      setRoomValidationState(room ? 'valid' : 'invalid');
    } catch {
      setRoomValidationState('invalid');
    }
  };

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (serverStatus === 'offline') {
      toast.error('Server is offline', {
        description: 'Please wait for the server to come back online.'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if room exists
      const room = await apiService.getRoom(values.roomId);
      if (!room) {
        toast.error('Room not found', {
          description: 'The room does not exist. Would you like to create it?',
          action: {
            label: 'Create Room',
            onClick: () => handleCreateRoom(values.roomId, values.userName)
          }
        });
        setIsLoading(false);
        return;
      }

      // Room exists, proceed to join
      setRoomId(values.roomId);
      setUserName(values.userName);
      
      toast.success('Joining room...', {
        description: `Connecting to ${values.roomId}`
      });
      
      // Short delay to show success message
      setTimeout(() => {
        navigate('/room');
        setIsLoading(false);
      }, 500);
    } catch (error) {
      toast.error('Failed to join room', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsLoading(false);
    }
  }

  // Handle creating a new room
  const handleCreateRoom = async (_roomId?: string, userName?: string) => {
    if (serverStatus === 'offline') {
      toast.error('Server is offline', {
        description: 'Cannot create room while server is offline.'
      });
      return;
    }

    setIsCreatingRoom(true);
    
    try {
      const { roomId: newRoomId } = await apiService.createRoom();
      
      // Update form with new room ID
      form.setValue('roomId', newRoomId);
      setRoomValidationState('valid');
      
      toast.success('Room created successfully!', {
        description: `Room ID: ${newRoomId}`
      });

      // If userName is provided, also join the room
      if (userName) {
        setRoomId(newRoomId);
        setUserName(userName);
        navigate('/room');
      }
    } catch (error) {
      toast.error('Failed to create room', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Function to handle random room ID generation
  const handleRandomRoomId = () => {
    const randomId = generateRandomRoomId();
    form.setValue('roomId', randomId);
    setRoomValidationState('idle');
  };

  // Server status indicator
  const ServerStatusIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        serverStatus === 'online' ? 'bg-green-500' : 
        serverStatus === 'offline' ? 'bg-red-500' : 
        'bg-yellow-500 animate-pulse'
      }`} />
      <span className={`${
        serverStatus === 'online' ? 'text-green-600' : 
        serverStatus === 'offline' ? 'text-red-600' : 
        'text-yellow-600'
      }`}>
        {serverStatus === 'online' ? 'Server Online' : 
         serverStatus === 'offline' ? 'Server Offline' : 
         'Checking Server...'}
      </span>
    </div>
  );

  // Room validation indicator
  const RoomValidationIndicator = () => {
    if (roomValidationState === 'idle') return null;
    
    return (
      <div className="flex items-center gap-2 text-xs mt-1">
        {roomValidationState === 'checking' && (
          <>
            <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground">Checking room...</span>
          </>
        )}
        {roomValidationState === 'valid' && (
          <>
            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-600">Room exists</span>
          </>
        )}
        {roomValidationState === 'invalid' && (
          <>
            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-red-600">Room not found</span>
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-lg shadow-xl border-opacity-50 backdrop-blur-sm bg-background/95 transition-all duration-300 hover:shadow-primary/10">
      <CardHeader className="space-y-3 px-8 pt-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <CardTitle className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Join a Meeting</CardTitle>
        <CardDescription className="text-center text-base">
          Enter your name and room ID to join a video call
        </CardDescription>
        <div className="flex justify-center">
          <ServerStatusIndicator />
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Your Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="John Doe" 
                        {...field} 
                        className="transition-all focus:ring-2 focus:ring-primary/50 h-12 pl-10 text-base"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Room ID
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="meeting-123" 
                        {...field} 
                        onBlur={handleRoomBlur}
                        className="transition-all focus:ring-2 focus:ring-primary/50 h-12 pl-10 pr-14 text-base"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={handleRandomRoomId}
                          className="h-8 w-8 rounded-full hover:bg-primary/10 transition-colors duration-200"
                          title="Generate Random Room ID"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <RoomValidationIndicator />
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex gap-3">
              <Button 
                type="submit" 
                className="flex-1 transition-all hover:translate-y-[-2px] hover:shadow-md h-14 text-base font-medium" 
                disabled={isLoading || serverStatus === 'offline'}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Joining...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Join Room
                  </>
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                onClick={() => handleCreateRoom()}
                disabled={isCreatingRoom || serverStatus === 'offline'}
                className="h-14 px-6 transition-all hover:translate-y-[-2px] hover:shadow-md"
                title="Create New Room"
              >
                {isCreatingRoom ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground pb-8 px-8">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Start a secure video meeting with anyone
        </div>
      </CardFooter>
    </Card>
  );
} 