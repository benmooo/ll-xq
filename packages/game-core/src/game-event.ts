import { z } from 'zod';

export const playerIdSchema = z.string();
export const roomIdSchema = z.string();
export const fenStringSchema = z.string();
export const gameStatusSchema = z.enum(['playing', 'checkmate', 'stalemate']);
export const winnerSchema = z.enum(['r', 'b', 'draw']);
export const gameOverReasonSchema = z.enum(['checkmate', 'stalemate', 'resign']);
export const sideSchema = z.enum(['r', 'b']);

// --- Mutation 输入 Schema ---
// 这些是客户端调用 tRPC mutation 时用的输入参数
export const createRoomInputSchema = z.object({
  creatorName: z.string(),
});

export const joinRoomInputSchema = z.object({
  roomId: roomIdSchema,
  playerName: z.string(),
});

export const moveInputSchema = z.object({
  roomId: roomIdSchema,
  playerId: z.string(),
  move: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

// --- 房间广播事件 Schema ---
const baseEventSchema = z.object({
  type: z.string(),
});

// 房间创建成功（用于大厅广播）
export const roomCreatedEventSchema = baseEventSchema.extend({
  type: z.literal('roomCreated'),
  payload: z.object({
    roomId: roomIdSchema,
    creatorName: z.string(),
  }),
});

// 玩家成功加入
export const joinSuccessEventSchema = baseEventSchema.extend({
  type: z.literal('joinSuccess'),
  payload: z.object({
    roomId: roomIdSchema,
    playerName: z.string(),
    side: sideSchema,
  }),
});

// 加入失败
export const joinErrorEventSchema = baseEventSchema.extend({
  type: z.literal('joinError'),
  payload: z.object({
    reason: z.string(),
  }),
});

// 游戏开始
export const gameStartEventSchema = baseEventSchema.extend({
  type: z.literal('gameStart'),
  payload: z.object({
    fen: fenStringSchema,
    turn: sideSchema,
    players: z.array(
      z.object({
        name: z.string(),
        side: sideSchema,
      }),
    ),
  }),
});

// 下棋动作完成
export const moveMadeEventSchema = baseEventSchema.extend({
  type: z.literal('moveMade'),
  payload: z.object({
    side: sideSchema,
    from: z.string(),
    to: z.string(),
    fen: fenStringSchema,
    turn: sideSchema,
  }),
});

// 无效走棋
export const invalidMoveEventSchema = baseEventSchema.extend({
  type: z.literal('invalidMove'),
  payload: z.object({
    reason: z.string(),
  }),
});

// 游戏结束
export const gameOverEventSchema = baseEventSchema.extend({
  type: z.literal('gameOver'),
  payload: z.object({
    winner: winnerSchema,
    reason: gameOverReasonSchema,
  }),
});

// checkmate
export const inCheckEventSchema = baseEventSchema.extend({
  type: z.literal('inCheck'),
  payload: z.object({
    sideInCheck: sideSchema,
  }),
});

// 错误消息
export const errorEventSchema = baseEventSchema.extend({
  type: z.literal('error'),
  payload: z.object({
    message: z.string(),
  }),
});

// --- 广播事件统一定义 ---
export const roomBroadcastEventSchema = z.discriminatedUnion('type', [
  roomCreatedEventSchema,
  joinSuccessEventSchema,
  joinErrorEventSchema,
  gameStartEventSchema,
  moveMadeEventSchema,
  invalidMoveEventSchema,
  gameOverEventSchema,
  errorEventSchema,
  inCheckEventSchema,
]);

export type RoomBroadcastEvent = z.infer<typeof roomBroadcastEventSchema>;

export const mutationResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z
    .object({
      message: z.string(),
    })
    .optional(),
});
