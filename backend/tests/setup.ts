// Mock environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests
process.env.LOG_LEVEL = 'silent';

// Mediasoup environment variables
process.env.MEDIASOUP_LISTEN_IP = '127.0.0.1';
process.env.MEDIASOUP_ANNOUNCED_IP = '127.0.0.1';
process.env.MEDIASOUP_MIN_PORT = '40000';
process.env.MEDIASOUP_MAX_PORT = '49999';
process.env.MEDIASOUP_NUM_WORKERS = '1';

// Protoo environment variables
process.env.PROTOO_LISTEN_PORT = '4443';
process.env.PROTOO_LISTEN_IP = '0.0.0.0';
process.env.PROTOO_MAX_RECEIVED_FRAME_SIZE = '65536';
process.env.PROTOO_MAX_RECEIVED_MESSAGE_SIZE = '65536';
process.env.PROTOO_FRAGMENT_OUTGOING_MESSAGES = 'false';
process.env.PROTOO_FRAGMENTATION_THRESHOLD = '65536';
process.env.PROTOO_PING_INTERVAL = '30000';

// Additional environment variables that might be required
process.env.DATABASE_URL = 'memory://test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
