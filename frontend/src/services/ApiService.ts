// API Service để tương tác với backend REST endpoints
class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  }

  /**
   * Check server health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch {
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
      const response = await fetch(`${this.baseURL}/rooms/${roomId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to get room');
      }

      return response.json();
    } catch {
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