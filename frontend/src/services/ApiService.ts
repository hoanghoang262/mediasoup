// API Service để tương tác với backend REST endpoints
class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    console.log('🔧 ApiService baseURL:', this.baseURL);
  }

  /**
   * Check server health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const url = `${this.baseURL}/health`;
      console.log('🏥 ApiService checking health at:', url);
      const response = await fetch(url);
      console.log('🏥 Health check response:', response.status, response.ok);
      return response.ok;
    } catch (error) {
      console.error('❌ Health check error:', error);
      return false;
    }
  }

  /**
   * Create a new room with random ID
   */
  async createRoom(): Promise<{ roomId: string; room: Room }> {
    const response = await fetch(`${this.baseURL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    return response.json();
  }

  /**
   * Join existing room by ID
   */
  async joinRoom(roomId: string): Promise<Room> {
    const response = await fetch(`${this.baseURL}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Room does not exist');
      }
      throw new Error('Failed to join room');
    }

    return response.json();
  }

  /**
   * Get room by ID
   */
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      console.log('🔍 Checking room existence:', roomId);
      const response = await fetch(`${this.baseURL}/rooms/${roomId}`);
      
      if (response.status === 404) {
        console.log('❌ Room not found:', roomId);
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to get room');
      }

      const room = await response.json();
      console.log('✅ Room found:', room);
      return room;
    } catch (error) {
      console.error('❌ Error checking room:', error);
      return null;
    }
  }

  /**
   * Get all rooms
   */
  async getAllRooms(): Promise<Room[]> {
    const response = await fetch(`${this.baseURL}/rooms`);

    if (!response.ok) {
      throw new Error('Failed to get rooms');
    }

    return response.json();
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${this.baseURL}/users`);

    if (!response.ok) {
      throw new Error('Failed to get users');
    }

    return response.json();
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to get user');
      }

      return response.json();
    } catch {
      return null;
    }
  }
}

// Types từ backend
export interface Room {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  participantIds: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  code?: number;
  details?: unknown;
}

// Export singleton instance
export const apiService = new ApiService(); 