class Peer {
  constructor() {}
  on() {}
  notify() { return Promise.resolve(); }
}
class WebSocketServer {
  constructor() {}
  on() {}
}
module.exports = { Peer, WebSocketServer };
