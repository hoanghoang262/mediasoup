import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UsernamePromptProps {
  roomId: string;
  onUsernameSubmit: (username: string) => void;
  isLoading?: boolean;
}

/**
 * Component hiển thị form để user nhập username khi truy cập trực tiếp vào room
 */
export const UsernamePrompt: React.FC<UsernamePromptProps> = ({
  roomId,
  onUsernameSubmit,
  isLoading = false
}) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Please enter your name');
      return;
    }

    onUsernameSubmit(username.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Join Meeting
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter your name to join room: <span className="font-mono text-blue-600">{roomId}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Your Name
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your display name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
                <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining Meeting...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Join Meeting
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              You'll join the meeting room once you provide your name
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 