import { strict as assert } from 'node:assert';
import test from 'node:test';

import { ProtooService } from '../src/infrastructure/services/protoo/ProtooService';
import type { RoomServiceInterface } from '../src/domain/services/RoomServiceInterface';

class FakeTransport {
  public id = `t-${Math.random()}`;
  public iceParameters = {};
  public iceCandidates: unknown[] = [];
  public dtlsParameters = {};
  public connected = false;
  async connect(): Promise<void> { this.connected = true; }
  async produce(opts: any): Promise<any> { return { id: `p-${Math.random()}`, kind: opts.kind, rtpParameters: opts.rtpParameters, appData: opts.appData, close: () => {} }; }
  async consume(opts: any): Promise<any> { return { id: `c-${Math.random()}`, producerId: opts.producerId, kind: 'video', rtpParameters: {}, resume: async () => {} }; }
}

class FakeRouter {
  public rtpCapabilities = { codecs: [] };
  async createWebRtcTransport(): Promise<any> { return new FakeTransport(); }
  canConsume(): boolean { return true; }
}

class MockRoomService implements RoomServiceInterface {
  public participants = new Set<string>();
  public router = { id: 'r1', roomId: 'room1', internal: new FakeRouter() };
  async createRoom(): Promise<any> { return {}; }
  async getOrCreateRoom(): Promise<any> { return {}; }
  getRouter(): any { return this.router; }
  async addParticipant(_: string, peerId: string): Promise<void> { this.participants.add(peerId); }
  async removeParticipant(_: string, peerId: string): Promise<void> { this.participants.delete(peerId); }
  async closeRoom(): Promise<void> {}
  async getRoomParticipants(): Promise<string[]> { return Array.from(this.participants); }
}

function createService() {
  const roomService = new MockRoomService();
  const service = new ProtooService(roomService);
  (service as any)._peers.set('room1', new Map([
    ['peer1', { peer: {} as any, transports: new Map(), producers: new Map(), consumers: new Map() }]
  ]));
  return { service, roomService };
}

async function request(service: ProtooService, method: string, data?: any) {
  let res: any; let err: any;
  await (service as any).handleRequest('room1', 'peer1', { method, data }, (d?: any) => { res = d; }, (e?: any) => { err = e; });
  if (err) throw err;
  return res;
}

test('getRouterRtpCapabilities', async () => {
  const { service } = createService();
  const resp = await request(service, 'getRouterRtpCapabilities');
  assert.deepEqual(resp, { rtpCapabilities: { codecs: [] } });
});

test('create/connect transport and produce/consume', async () => {
  const { service } = createService();
  const tResp = await request(service, 'createWebRtcTransport');
  assert.ok(tResp.id);
  await request(service, 'connectWebRtcTransport', { transportId: tResp.id, dtlsParameters: {} });
  const pResp = await request(service, 'produce', { transportId: tResp.id, kind: 'video', rtpParameters: {}, appData: {} });
  assert.ok(pResp.id);
  const t2 = await request(service, 'createWebRtcTransport');
  const cResp = await request(service, 'consume', { transportId: t2.id, producerId: pResp.id, rtpCapabilities: {} });
  assert.ok(cResp.id);
  await request(service, 'resumeConsumer', { consumerId: cResp.id });
  await request(service, 'closeProducer', { producerId: pResp.id });
});

test('getParticipants', async () => {
  const { service, roomService } = createService();
  roomService.participants.add('peer1');
  const resp = await request(service, 'getParticipants');
  assert.deepEqual(resp, { participants: ['peer1'] });
});
