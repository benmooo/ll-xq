# @ll-xq/game-core

### Message flow sequence diagram

```sh
Player0(浏览器)        WebSocket服务器             Player1(浏览器)
    |                        |                           |
    | 点击“创建房间”         |                           |
    |----------------------->| createRoom               |
    |                        | 创建roomId               |
    |                        | 保存room到Map             |
    |<-----------------------| roomCreated(roomId)       |
    | 显示roomId，等待       |                           |
    |                        |                           |
    |                        |                           | 点击链接进入
    |                        |                           | 提取roomId
    |                        |<--------------------------| joinRoom(roomId)
    |                        | 检查room存在且人数<2      |
    |                        | 将Player1加入room         |
    |<-----------------------| playerJoined              |
    | gameStart(初始FEN,先手) |-------------------------->| joinSuccess
    |<-----------------------| gameStart(初始FEN,先手)   |
    |                        |                           |
=== 游戏开始 =========================================================
    | 轮到Player0            |                           |
    | move(e3-e4) ---------->|                           |
    |                        | 校验合法                  |
    |<-----------------------| moveMade(e3-e4,新FEN,轮到黑)
    |                        |-------------------------->| moveMade
    |                        |                           |
    |                           ...                      |
    |                        |                           |
=== 游戏结束 =========================================================
    |                        | 广播gameOver              |
    |<-----------------------| gameOver(winner:red)      |
    |                        |-------------------------->| gameOver
```

### Data structure

Message

```json
{
  "type": "string",
  "payload": {}
}
```

```ts
type Player = {
  id: string; // socket.id
  color?: 'red' | 'black';
  ws: WebSocket;
};

type GameState = {
  fen: string;
  turn: 'red' | 'black';
  status: 'playing' | 'checkmate' | 'stalemate';
};

type Room = {
  id: string;
  players: Player[];
  gameState: GameState;
};

const rooms: Map<string, Room> = new Map();
```

### Events

1. 房间 & 玩家管理事件

| **事件类型 (type)** | **方向**                | **说明**                       | **payload 结构**                               |
| ------------------- | ----------------------- | ------------------------------ | ---------------------------------------------- |
| `createRoom`        | Client → Server         | 玩家请求创建房间               | `{}`                                           |
| `roomCreated`       | Server → Client         | 返回创建成功的房间ID           | `{ "roomId": "string" }`                       |
| `joinRoom`          | Client → Server         | 加入房间请求                   | `{ "roomId": "string" }`                       |
| `joinSuccess`       | Server → Client         | 加入成功                       | `{ "roomId": "string", "playerId": "string" }` |
| `joinError`         | Server → Client         | 加入失败（房间不存在、已满等） | `{ "reason": "string" }`                       |
| `playerJoined`      | Server → 房间内其他玩家 | 有新玩家加入                   | `{ "playerId": "string" }`                     |

2. 游戏开始 & 状态事件

| **事件类型 (type)** | **方向**          | **说明**             | **payload 结构**                                                                                   |
| ------------------- | ----------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `gameStart`         | Server → 房间全员 | 开局事件             | `{ "fen": "string", "turn": "red\|black", "players": { "red": "playerId", "black": "playerId" } }` |
| `gameState`         | Server → Client   | 全局状态同步（可选） | `{ "fen": "string", "turn": "red\|black", "status": "playing\|checkmate\|stalemate" }`             |

3. 游戏操作事件

| **事件类型 (type)** | **方向**          | **说明**     | **payload 结构**                                                      |
| ------------------- | ----------------- | ------------ | --------------------------------------------------------------------- |
| `move`              | Client → Server   | 玩家走棋请求 | `{ "from": "e3", "to": "e4" }`                                        |
| `invalidMove`       | Server → Client   | 走棋不合法   | `{ "reason": "string" }`                                              |
| `moveMade`          | Server → 房间全员 | 广播成功走棋 | `{ "from": "e3", "to": "e4", "fen": "string", "turn": "red\|black" }` |

4. 游戏结束事件

| **事件类型 (type)** | **方向**          | **说明** | **payload 结构**                                                             |
| ------------------- | ----------------- | -------- | ---------------------------------------------------------------------------- |
| `gameOver`          | Server → 房间全员 | 游戏结束 | `{ "winner": "red\|black\|draw", "reason": "checkmate\|stalemate\|resign" }` |

5. 服务器通用事件

| **事件类型 (type)** | **方向**        | **说明** | **payload 结构**          |
| ------------------- | --------------- | -------- | ------------------------- |
| `error`             | Server → Client | 错误提示 | `{ "message": "string" }` |
| `pong`              | Server → Client | 心跳回应 | `{}`                      |
| `ping`              | Client → Server | 心跳检测 | `{}`                      |

### Other

```ts
function broadcast(roomId: string, msg: GameEvent) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach((p) => p.ws.send(JSON.stringify(msg)));
}
```
