import * as mediasoupClient from 'mediasoup-client';

/**
 * MediaSoup server transport response
 */
export interface MediasoupTransportResponse {
  id: string;
  iceParameters: mediasoupClient.types.IceParameters;
  iceCandidates: mediasoupClient.types.IceCandidate[];
  dtlsParameters: mediasoupClient.types.DtlsParameters;
}

/**
 * MediaSoup router capabilities response
 */
export interface MediasoupRouterCapabilitiesResponse {
  rtpCapabilities: mediasoupClient.types.RtpCapabilities;
}

/**
 * MediaSoup produce response
 */
export interface MediasoupProduceResponse {
  id: string;
} 