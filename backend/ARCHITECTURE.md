# Backend Architecture Documentation

## 🏛️ Clean Architecture Overview

This backend follows **Clean Architecture** principles with clear separation of concerns:

```
├── domain/              # Business logic (pure, no dependencies)
│   ├── entities/        # Core business entities
│   ├── services/        # Domain service interfaces
│   ├── repositories/    # Repository interfaces
│   └── value-objects/   # Immutable value objects
├── application/         # Use cases and application logic
│   ├── usecases/        # Business use cases
│   ├── dtos/           # Data transfer objects
│   ├── interfaces/     # Application service interfaces
│   └── validators/     # Input validation
├── infrastructure/     # External concerns (databases, APIs, etc.)
│   ├── config/         # Configuration
│   ├── repositories/   # Repository implementations
│   ├── services/       # External service implementations
│   └── http/          # HTTP server setup
└── interfaces/         # Controllers and external interfaces
    └── http/          # HTTP controllers and routes
```

---

## 🔄 Complete Protoo + MediaSoup Flow

### **Architecture Flow Overview**
```
Client WebSocket ──→ ProtooService ──→ RoomManager ──→ MediasoupService
                  ├─→ Request Handler ──→ Use Cases ──→ Domain Entities
                  └─→ Broadcast Manager ──→ All Room Peers
```

### **1. Client Connection Flow**

#### **Step 1: WebSocket Connection**
```
Client connects: ws://localhost:3000?roomId=abc-defg-hijk&peerId=user123
```

#### **Step 2: Connection Handling**
```typescript
// ProtooService.handleConnection()
1. Parse URL parameters (roomId, peerId)
2. Validate required parameters
3. Accept WebSocket transport
4. Get/Create Room via RoomManager
5. Create Protoo Peer
6. Create Infrastructure Participant
7. Setup ping/pong keepalive
8. Add participant to room
9. Broadcast 'participantJoined' to other peers
```

### **2. Complete Protoo Message Flow**

#### **Connection Messages**
```json
// Automatic ping from server every 30 seconds
→ Server: { "method": "ping", "data": { "timestamp": 1672531200000 } }
← Client: { "method": "pong", "data": { "timestamp": 1672531200000 } }

// Participant joined notification
→ Broadcast: { "method": "participantJoined", "data": { "peerId": "user123" } }
```

#### **Room Capability Messages**
```json
// 1. Get router RTP capabilities (required first)
← Client: { "method": "getRouterRtpCapabilities", "data": {} }
→ Server: { 
  "data": { 
    "rtpCapabilities": {
      "codecs": [...],
      "headerExtensions": [...],
      "fecMechanisms": [...]
    }
  }
}
```

#### **Transport Creation Messages**
```json
// 2. Create WebRTC Transport (for sending/receiving media)
← Client: { "method": "createWebRtcTransport", "data": {} }
→ Server: {
  "data": {
    "id": "transport-123",
    "iceParameters": {...},
    "iceCandidates": [...],
    "dtlsParameters": {...}
  }
}

// 3. Connect transport (establish DTLS)
← Client: { 
  "method": "connectWebRtcTransport", 
  "data": { 
    "transportId": "transport-123",
    "dtlsParameters": {...}
  }
}
→ Server: { "data": { "success": true } }
```

#### **Media Production Messages**
```json
// 4. Produce media (camera/microphone)
← Client: { 
  "method": "produce", 
  "data": { 
    "transportId": "transport-123",
    "kind": "video", // or "audio"
    "rtpParameters": {...},
    "appData": { "mediaType": "camera" }
  }
}
→ Server: { "data": { "id": "producer-456" } }

// 5. Screen sharing
← Client: { 
  "method": "produce", 
  "data": { 
    "transportId": "transport-123",
    "kind": "video",
    "rtpParameters": {...},
    "appData": { "mediaType": "screen" }
  }
}
→ Server: { "data": { "id": "producer-789" } }
→ Broadcast: { 
  "method": "screenSharingStarted", 
  "data": { "peerId": "user123", "producerId": "producer-789" }
}
```

#### **Media Consumption Messages**
```json
// 6. Consume other participant's media
← Client: { 
  "method": "consume", 
  "data": { 
    "transportId": "transport-456",
    "producerId": "producer-123",
    "rtpCapabilities": {...}
  }
}
→ Server: {
  "data": {
    "id": "consumer-789",
    "producerId": "producer-123",
    "kind": "video",
    "rtpParameters": {...}
  }
}

// 7. Resume consumer (start receiving media)
← Client: { 
  "method": "resumeConsumer", 
  "data": { "consumerId": "consumer-789" }
}
→ Server: { "data": { "success": true } }
```

#### **Room Management Messages**
```json
// Get current participants
← Client: { "method": "getParticipants", "data": {} }
→ Server: { "data": { "participants": ["user123", "user456"] } }

// Close producer (stop sharing)
← Client: { 
  "method": "closeProducer", 
  "data": { "producerId": "producer-789" }
}
→ Server: { "data": { "success": true } }
→ Broadcast: { 
  "method": "screenSharingStopped", 
  "data": { "peerId": "user123", "producerId": "producer-789" }
}
```

#### **Disconnect Messages**
```json
// Participant left (automatic on connection close)
→ Broadcast: { "method": "participantLeft", "data": { "peerId": "user123" } }
```

---

## 🔧 Infrastructure Components

### **RoomManager (Infrastructure Layer)**
- Manages both domain Room entities and infrastructure concerns
- Handles mediasoup routers and protoo rooms
- Coordinates participant lifecycle
- Cleans up resources on room closure

### **ProtooService (Infrastructure Layer)**
- Handles WebSocket connections via protoo-server
- Processes all protoo messages
- Manages peer lifecycle and keepalive
- Delegates to RoomManager for room operations

### **MediasoupService (Infrastructure Layer)**
- Manages mediasoup workers and routers
- Handles WebRTC transport creation
- Manages media production/consumption
- Provides load balancing across workers

---

## 🚀 Complete Client Integration Example

### **JavaScript Client Connection Flow**
```javascript
// 1. Connect to protoo server
const protooUrl = `ws://localhost:3000?roomId=${roomId}&peerId=${peerId}`;
const peer = new protoo.Peer(protooUrl);

// 2. Get router capabilities
const routerRtpCapabilities = await peer.request('getRouterRtpCapabilities');

// 3. Load device with capabilities
await device.load({ routerRtpCapabilities });

// 4. Create send transport
const sendTransport = await peer.request('createWebRtcTransport');
const transport = device.createSendTransport(sendTransport);

// 5. Connect transport
transport.on('connect', async ({ dtlsParameters }, callback) => {
  await peer.request('connectWebRtcTransport', {
    transportId: transport.id,
    dtlsParameters
  });
  callback();
});

// 6. Produce camera
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
const track = stream.getVideoTracks()[0];
const producer = await transport.produce({ track });

await peer.request('produce', {
  transportId: transport.id,
  kind: producer.kind,
  rtpParameters: producer.rtpParameters
});

// 7. Listen for participants
peer.on('notification', (notification) => {
  switch (notification.method) {
    case 'participantJoined':
      console.log('New participant:', notification.data.peerId);
      break;
    case 'participantLeft':
      console.log('Participant left:', notification.data.peerId);
      break;
    case 'screenSharingStarted':
      console.log('Screen sharing started by:', notification.data.peerId);
      break;
  }
});
```

---

## 📊 Architecture Benefits

✅ **Clean Separation**: Domain logic isolated from infrastructure  
✅ **Testability**: Easy to unit test business logic  
✅ **Scalability**: Infrastructure can be swapped without affecting domain  
✅ **Maintainability**: Clear boundaries and responsibilities  
✅ **Type Safety**: Full TypeScript coverage with proper interfaces  
✅ **Resource Management**: Automatic cleanup of media resources  
✅ **Real-time Communication**: Efficient protoo messaging system  

---

## 🔍 Key Design Decisions

1. **RoomManager as Bridge**: Handles both domain and infrastructure concerns
2. **Infrastructure Participants**: Separate from domain participants for media concerns
3. **Protoo Message Handling**: Centralized in ProtooService with proper error handling
4. **Resource Cleanup**: Automatic cleanup on participant disconnect
5. **Ping/Pong Keepalive**: Ensures connection stability
6. **Broadcast System**: Efficient notification to all room participants 