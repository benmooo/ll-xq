import { publicProcedure, router } from '../trpc';
import { EventEmitter, on } from 'events';
import z from 'zod';
import {
  createXiangqi,
  type Xiangqi,
  joinErrorEventSchema,
  joinSuccessEventSchema,
  roomCreatedEventSchema,
  gameStartEventSchema,
  moveInputSchema,
  mutationResponseSchema,
  gameOverEventSchema,
  type RoomBroadcastEvent,
  moveMadeEventSchema,
  inCheckEventSchema,
} from '@ll-xq/game-core';
import type { Context } from '../context';
import { ok, fail } from '../mutation-response';
import { pipe } from 'fp-ts/lib/function';
import * as E from 'fp-ts/Either';
import { TRPCError } from '@trpc/server';

type JoinRoomErrorEvent = z.infer<typeof joinErrorEventSchema>;
type JoinRoomSuccessEvent = z.infer<typeof joinSuccessEventSchema>;

type GameStartEvent = z.infer<typeof gameStartEventSchema>;
type GameOverEvent = z.infer<typeof gameOverEventSchema>;
type MoveInput = z.infer<typeof moveInputSchema>;

type RoomCreatedEvent = z.infer<typeof roomCreatedEventSchema>;
type MutationResponse = z.infer<typeof mutationResponseSchema>;
type MoveMadeEvent = z.infer<typeof moveMadeEventSchema>;
type InCheckEvent = z.infer<typeof inCheckEventSchema>;

export const gameRouter = router({
  createRoom: publicProcedure
    .input(z.object({ creatorName: z.string() }))
    .mutation(({ input, ctx }): MutationResponse => {
      const room = ctx.roomManager.createRoom(input.creatorName);

      const event: RoomCreatedEvent = {
        type: 'roomCreated',
        payload: { roomId: room.id, creatorName: input.creatorName },
      };

      broadcastRoomEvent(ctx, room.id, event);
      return ok({ roomId: room.id });
    }),

  // join room
  joinRoom: publicProcedure
    .input(
      // playerId for player who leaved the room and re-join the room
      z.object({ roomId: z.string(), playerName: z.string(), playerId: z.string().optional() }),
    )
    .mutation(({ input, ctx }) => {
      const { roomId, playerName, playerId } = input;

      return pipe(
        ctx.roomManager.joinRoomPlayer(roomId, playerName, playerId),
        E.tap((player) => {
          const event: JoinRoomSuccessEvent = {
            type: 'joinSuccess',
            payload: {
              roomId: roomId,
              playerName: player.name,
              side: player.side,
            },
          };
          broadcastRoomEvent(ctx, roomId, event);

          return E.right(null);
        }),
        E.tap((player) => {
          // emit game start event if there are two players
          const room = ctx.roomManager.getRoom(roomId)!;
          if (room.players.size === 2) {
            const event: GameStartEvent = {
              type: 'gameStart',
              payload: {
                fen: room.state.fen(),
                turn: room.state.turn() as 'r' | 'b',
                players: room.players
                  .entries()
                  .map(([_, p]) => ({ name: p.name, side: p.side }))
                  .toArray(),
              },
            };
            broadcastRoomEvent(ctx, roomId, event);
          }

          return E.right(null);
        }),
        // map to MutationResponse
        E.fold(
          (err) => fail(err),
          (player) => ok({ roomId: roomId, player }),
        ),
      );
    }),

  move: publicProcedure.input(moveInputSchema).mutation(({ input, ctx }): MutationResponse => {
    const { roomId, playerId, move } = input;

    const room = ctx.roomManager.getRoom(roomId);
    if (!room) return fail('Room not found');

    const player = room.players.get(playerId);
    if (!player) return fail('Player not found');

    if (player.side !== room.state.turn()) return fail('Not your turn');

    const result = room.state.move({ ...move, promotion: 'q' });
    if (!result) return fail('Invalid move');

    const nextTurn = room.state.turn() as 'r' | 'b';

    // now move seems to be valid, we first broadcast the move event
    const event: MoveMadeEvent = {
      type: 'moveMade',
      payload: {
        side: player.side,
        from: move.from,
        to: move.to,
        fen: room.state.fen(),
        turn: nextTurn,
      },
    };
    broadcastRoomEvent(ctx, room.id, event);

    room.state.game_over();

    // and then we check game status
    if (room.state.in_checkmate()) {
      const event: GameOverEvent = {
        type: 'gameOver',
        payload: {
          winner: nextTurn,
          reason: 'checkmate',
        },
      };
      broadcastRoomEvent(ctx, room.id, event);
    } else if (room.state.in_stalemate()) {
      const event: GameOverEvent = {
        type: 'gameOver',
        payload: {
          winner: nextTurn,
          reason: 'stalemate',
        },
      };
      broadcastRoomEvent(ctx, room.id, event);
    } else if (room.state.in_draw()) {
      const event: GameOverEvent = {
        type: 'gameOver',
        payload: {
          winner: 'draw',
          reason: 'stalemate',
        },
      };
      broadcastRoomEvent(ctx, room.id, event);
    } else if (room.state.in_check()) {
      const event: InCheckEvent = {
        type: 'inCheck',
        payload: {
          sideInCheck: nextTurn,
        },
      };
      broadcastRoomEvent(ctx, room.id, event);
    }

    return ok(move);
  }),

  // undo -- TODO

  // subscriptions
  onRoomEvent: publicProcedure
    .input(z.object({ roomId: z.string(), playerId: z.string() }))
    .subscription(async function* ({ input, signal, ctx }) {
      const { roomId, playerId } = input;
      const room = ctx.roomManager.getRoom(roomId);
      if (!room) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
      }
      if (!room.players.get(playerId)) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Player not in room' });
      }

      ctx.roomManager.markPlayerOnline(input.roomId, input.playerId);

      signal?.addEventListener('abort', () => {
        ctx.roomManager.markPlayerOffline(roomId, playerId);
      });

      const iterator = on(ctx.eventBus, `roomEvent:${input.roomId}`, { signal });
      for await (const [data] of iterator) {
        yield data as RoomBroadcastEvent;
      }
    }),

  // ping - pong mechanism
  ping: publicProcedure
    .input(z.object({ roomId: z.string(), playerId: z.string() }))
    .mutation(({ input: { roomId, playerId }, ctx }) => {
      ctx.roomManager.ping(roomId, playerId);
      return { ok: true };
    }),

  roomState: publicProcedure
    .input(z.object({ roomId: z.string(), playerId: z.string() }))
    .query(({ input, ctx }) => {
      const { roomId, playerId } = input;
      const room = ctx.roomManager.getRoom(roomId);
      if (!room) {
        return fail('Room not found');
      }

      const player = room.players.get(playerId);
      if (!player) {
        return fail('Player not found in this room');
      }

      return ok({
        fen: room.state.fen(),
        turn: room.state.turn(),
        players: Array.from(room.players.values()).map(({ name, side, online }) => ({
          name,
          side,
          online,
        })),
        // more fields here
      });
    }),

  // query legal moves
  legalMoves: publicProcedure
    .input(z.object({ roomId: z.string(), playerId: z.string(), square: z.string() }))
    .query(({ input, ctx }) => {
      const { roomId, playerId, square } = input;
      const room = ctx.roomManager.getRoom(roomId);
      if (!room) {
        return fail('Room not found');
      }

      const player = room.players.get(playerId);
      if (!player) {
        return fail('Player not found in this room');
      }

      const moves = room.state.moves({ square });

      return ok({ moves });
    }),
});

function broadcastRoomEvent(ctx: Context, roomId: string, event: RoomBroadcastEvent) {
  ctx.eventBus.emit(`roomEvent:${roomId}`, event);
}
