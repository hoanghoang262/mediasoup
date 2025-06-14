/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  code?: string | number;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Connection states
 */
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting' 
  | 'connected'
  | 'reconnecting'
  | 'failed';

/**
 * Media kinds
 */
export type MediaKind = 'audio' | 'video';

/**
 * Media stream information
 */
export interface MediaStreamInfo {
  id: string;
  stream: MediaStream;
  track: MediaStreamTrack;
  kind: MediaKind;
  isScreenShare: boolean;
  peerId: string;
  isLocal?: boolean;
}

/**
 * User information
 */
export interface User extends BaseEntity {
  name: string;
  email?: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

/**
 * Room information
 */
export interface Room extends BaseEntity {
  name: string;
  description?: string;
  isPrivate: boolean;
  maxParticipants?: number;
  participantIds: string[];
  ownerId: string;
}

/**
 * Participant information
 */
export interface Participant {
  id: string;
  userId: string;
  roomId: string;
  name: string;
  isHost: boolean;
  joinedAt: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionStatus: ConnectionStatus;
}

/**
 * Event callback type
 */
export type EventCallback<T = unknown> = (data: T) => void;

/**
 * Async operation result
 */
export type AsyncResult<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Optional fields utility type
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Required fields utility type
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Deep partial utility type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Nullable utility type
 */
export type Nullable<T> = T | null;

/**
 * Values of an object type
 */
export type ValueOf<T> = T[keyof T];

/**
 * Promise type extraction
 */
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

/**
 * Function type extraction
 */
export type FunctionType<T> = T extends (...args: infer A) => infer R ? (...args: A) => R : never; 