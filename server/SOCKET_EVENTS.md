# Socket.io Events Reference

## Client → Server Events

### Connection & Rooms
- `join:user` - Join user-specific room
  - Payload: `userId` (string)
  
- `join:pet` - Join pet-specific room to watch updates
  - Payload: `petId` (string)

### Pet State
- `pet:update` - Broadcast pet state changes
  - Payload: `{ petId, state }` where state includes position, stats, etc.
  
- `pet:reaction` - Trigger pet reaction visible to all watchers
  - Payload: `{ petId, reaction }`

### Location Sync
- `location:update` - Update pet location in real-time
  - Payload: `{ petId, x, y, scene }`

### Lobby Management
- `lobby:join` - Join the battle lobby
  - Payload: `{ petId, name, stats }`

- `lobby:leave` - Leave the battle lobby
  - Payload: none

### Battle/Interactions
- `battle:challenge` - Challenge another player
  - Payload: `{ challengerId, challengerName, opponentId }`

- `battle:accept` - Accept battle invitation
  - Payload: `{ battleId, accepterId }`

- `battle:decline` - Decline battle invitation
  - Payload: `{ battleId }`
  
- `battle:action` - Send battle action
  - Payload: `{ battleId, action }`

- `battle:end` - End battle with winner
  - Payload: `{ battleId, winner }`

## Server → Client Events

- `lobby:updated` - Lobby player list changed
  - Payload: `{ players: [{ socketId, petId, name, stats }] }`

- `battle:invited` - Received battle invitation
  - Payload: `{ battleId, challengerId, challengerName }`

- `battle:declined` - Battle invitation declined
  - Payload: `{ battleId }`

- `battle:started` - Battle initiated
  - Payload: `{ battleId, player1, player2 }`
  
- `battle:action` - Battle action occurred
  - Payload: `{ battleId, action }`

- `battle:ended` - Battle finished
  - Payload: `{ battleId, winner }`

- `pet:updated` - Pet state was updated
  - Payload: `{ petId, state, timestamp }`
  
- `pet:reaction` - Pet displayed a reaction
  - Payload: `{ petId, reaction, timestamp }`
  
- `location:updated` - Pet moved
  - Payload: `{ petId, x, y, scene, timestamp }`

- `error` - Error message
  - Payload: `{ message }`

## Usage Example (Client)

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:3000", {
  withCredentials: true, // sends session cookie
});

socket.on("connect", () => {
  // Join rooms to watch specific pets
  socket.emit("join:pet", myPetId);
});

socket.on("pet:updated", (data) => {
  console.log("Pet state updated:", data);
  // Update local game state
});

socket.emit("location:update", {
  petId: myPetId,
  x: 100,
  y: 200,
  scene: "ExploreScene",
});
```
