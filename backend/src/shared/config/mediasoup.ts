import { types as MediasoupTypes } from 'mediasoup';

import { env } from './env';

/**
 * Get the announced IP for MediaSoup WebRTC transport
 * Falls back to auto-detection if not provided
 */
const getAnnouncedIp = (): string => {
  if (env.MEDIASOUP_ANNOUNCED_IP) {
    return env.MEDIASOUP_ANNOUNCED_IP;
  }

  // Auto-detect local IP in development
  if (env.NODE_ENV === 'development') {
    console.warn(
      '⚠️  MEDIASOUP_ANNOUNCED_IP not set, using 127.0.0.1 for development',
    );
    return '127.0.0.1';
  }

  throw new Error(
    'MEDIASOUP_ANNOUNCED_IP must be set in production environment',
  );
};

export const mediasoupConfig = {
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 59999,
    logLevel: env.NODE_ENV === 'development' ? 'debug' : 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
      'rtx',
      'bwe',
      'score',
      'simulcast',
      'svc',
      'sctp',
    ],
  } as MediasoupTypes.WorkerSettings,
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      } as MediasoupTypes.RtpCodecCapability,
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      } as MediasoupTypes.RtpCodecCapability,
      {
        kind: 'video',
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      } as MediasoupTypes.RtpCodecCapability,
    ],
  } as MediasoupTypes.RouterOptions,
  webRtcTransport: {
    listenIps: [
      {
        ip: '0.0.0.0', // Listen on all interfaces
        announcedIp: getAnnouncedIp(), // IP that clients will connect to
      },
    ],
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    maxIncomingBitrate: 1500000,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    enableSctp: true,
  } as MediasoupTypes.WebRtcTransportOptions,
};

/**
 * Log MediaSoup configuration on startup
 */
export const logMediasoupConfig = (): void => {
  console.log('🎥 MediaSoup Configuration:');
  console.log(`   📡 Announced IP: ${getAnnouncedIp()}`);
  console.log(
    `   🔌 RTC Ports: ${mediasoupConfig.worker.rtcMinPort}-${mediasoupConfig.worker.rtcMaxPort}`,
  );
  console.log(`   🎬 Video Codecs: VP8, H264`);
  console.log(`   🎵 Audio Codecs: Opus`);
  console.log(`   🌐 Environment: ${env.NODE_ENV}`);
};
