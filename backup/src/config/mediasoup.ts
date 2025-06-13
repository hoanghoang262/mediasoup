// Import types from mediasoup library
import { env } from './env';

import type { types } from 'mediasoup';

// Interface defining the structure of mediasoup configuration
export interface MediasoupConfigInterface {
  // Worker configuration for handling media processing
  worker: {
    logLevel: 'debug' | 'warn' | 'error' | 'none'; // Logging verbosity level
    logTags: types.WorkerLogTag[]; // Types of events to log
    rtcMinPort: number; // Minimum port for RTC connections
    rtcMaxPort: number; // Maximum port for RTC connections
  };
  // Router configuration for media routing
  router: {
    mediaCodecs: types.RtpCodecCapability[]; // Supported media codecs
  };
  // WebRTC transport configuration
  webRtcTransport: {
    listenIps: Array<{
      // IP addresses to listen on
      ip: string; // IP address
      announcedIp: string | null; // Public IP address (if different)
    }>;
    enableUdp: boolean; // Enable UDP for WebRTC
    enableTcp: boolean; // Enable TCP for WebRTC
    preferUdp: boolean; // Prefer UDP over TCP
    initialAvailableOutgoingBitrate: number; // Initial bandwidth allocation
    minimumAvailableOutgoingBitrate: number; // Minimum guaranteed bandwidth
    maxSctpMessageSize: number; // Maximum SCTP message size
    maxIncomingBitrate: number; // Maximum incoming bandwidth
  };
}

// Actual mediasoup configuration implementation
export const mediasoupConfig: MediasoupConfigInterface = {
  worker: {
    logLevel: 'debug', // Set logging to most verbose level
    logTags: [
      'info', // General information about the worker
      'ice', // ICE (Interactive Connectivity Establishment) protocol events
      'dtls', // DTLS (Datagram Transport Layer Security) protocol events
      'rtp', // RTP (Real-time Transport Protocol) packet events
      'srtp', // SRTP (Secure Real-time Transport Protocol) events
      'rtcp', // RTCP (RTP Control Protocol) events
      'rtx', // RTX (Retransmission) events
      'bwe', // Bandwidth Estimation events
      'score', // Connection quality score events
      'simulcast', // Simulcast events
      'svc', // Scalable Video Coding events
    ],
    rtcMinPort: 50000, // Match the new port range
    rtcMaxPort: 51000, // Match the new port range
  },
  router: {
    mediaCodecs: [
      // Audio codec configuration
      {
        kind: 'audio',
        mimeType: 'audio/opus', // Opus audio codec
        clockRate: 48000, // Sample rate in Hz
        channels: 2, // Stereo audio
      },
      // Video codec configurations
      {
        kind: 'video',
        mimeType: 'video/VP8', // VP8 video codec
        clockRate: 90000, // Clock rate for video
        parameters: {
          'x-google-start-bitrate': 1000, // Initial bitrate in kbps
        },
      },
      {
        kind: 'video',
        mimeType: 'video/VP9', // VP9 video codec
        clockRate: 90000,
        parameters: {
          'profile-id': 2, // VP9 profile
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/h264', // H.264 video codec
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1, // H.264 packetization mode
          'profile-level-id': '4d0032', // H.264 profile and level
          'level-asymmetry-allowed': 1, // Allow asymmetric levels
          'x-google-start-bitrate': 1000,
        },
      },
    ] as types.RtpCodecCapability[],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: env.MEDIASOUP_LISTEN_IP, // Listen on all interfaces by default
        announcedIp: env.MEDIASOUP_ANNOUNCED_IP, // Public IP if different
      },
    ],
    enableUdp: true, // Enable UDP for WebRTC
    enableTcp: true, // Enable TCP for WebRTC fallback
    preferUdp: true, // Prefer UDP over TCP for better performance
    initialAvailableOutgoingBitrate: 1000000, // 1 Mbps initial bandwidth
    minimumAvailableOutgoingBitrate: 600000, // 600 kbps minimum bandwidth
    maxSctpMessageSize: 262144, // 256 KB max message size
    maxIncomingBitrate: 1500000, // 1.5 Mbps max incoming bandwidth
  },
};
