import { useParams } from '@solidjs/router';
import { XiangqiBoard } from '~/components/xq-board';
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { fenToObj, objToFen, START_FEN, type Piece, type Square } from '../utils/xq-board';
import { trpc } from '~/lib/core/trpc';
import { v4 as uuidv4 } from 'uuid';
import type { Player } from '@ll-xq/trpc/src/types';

export default function GameRoom() {
  // get room id from solid router
  const roomId = useParams().id;

  const [playerSide, setPlayerSide] = createSignal<'r' | 'b'>('r');
  const orientation = () => (playerSide() === 'r' ? 'red' : 'black');

  const [fen, setFen] = createSignal(START_FEN);
  const position = () => fenToObj(fen());
  // game state current turn
  const [turn, setTurn] = createSignal<'r' | 'b'>('r');

  const [playerId, setPlayerId] = createSignal<string | null>(localStorage.getItem('playerId'));

  createEffect(() => {
    // Anytime `playerId` changes, update localStorage
    localStorage.setItem('playerId', JSON.stringify(playerId()));
  });

  onMount(async () => {
    // when player joins the room we should
    // 1. try to join the room with the playerId?( which is stored in the localStorage), there are two cases
    //    - if success, fetch the game state and update the position
    //    - if not, display an error message
    const { success, error, data } = await trpc.game.joinRoom.mutate({
      roomId,
      playerName: `p-${uuidv4().slice(0, 8)}`,
      playerId: playerId() ?? undefined,
    });

    if (!success) return console.error(error);

    const {
      player: { id, side },
    } = data as { player: Player };

    // ------------- update player id
    if (id !== playerId()) {
      setPlayerId(id); // which will update the localStorage
    }

    // ------------- init ping-pong to keep alive
    const interval = setInterval(() => {
      trpc.game.ping.mutate({ roomId, playerId: id });
    }, 10 * 1000);
    onCleanup(() => clearInterval(interval));

    //------------------ subscribe to room events
    const sub = trpc.game.onRoomEvent.subscribe(
      {
        roomId,
        playerId: id,
      },
      {
        onData: (event) => {
          switch (event.type) {
            case 'error':
              console.log(event.payload.message);
              break;

            case 'gameStart':
              console.log('game start', event.payload);
              break;
            case 'gameOver':
              console.log('game over', event.payload);
              break;
            case 'roomCreated':
              console.log('room created', event.payload);
              break;

            case 'inCheck':
              console.log('in check', event.payload);
              break;
            case 'invalidMove':
              console.log('invalid move', event.payload);
              break;
            case 'joinError':
              console.log('join error', event.payload);
              break;

            case 'joinSuccess':
              console.log('player joined room: ', event.payload);
              break;

            case 'moveMade':
              console.log('move made', event.payload);
              break;

            default:
              console.log('unknown event', event);
          }
        },
        onError: (error) => {
          console.error('room event error', error);
        },
        onComplete: () => {
          console.log('room event subscription completed');
          sub.unsubscribe();
        },
      },
    );

    // ------------ reload game state
    if (side !== playerSide()) {
      setPlayerSide(side);
    }

    // reload the game state
    const res = await trpc.game.roomState.query({
      roomId,
      playerId: id,
    });

    if (!res.success) return console.error(res.error);

    const {
      fen: f,
      turn: t,
      // players,
    } = res.data as {
      fen: string;
      turn: 'r' | 'b';
      players: { name: string; side: 'r' | 'b'; online: boolean };
    };

    if (t !== turn()) setTurn(t);

    if (f !== fen()) setFen(f);
  });

  // --- Logic is handled by the Parent ---
  const handlePieceDrop = (source: Square, destination: Square) => {
    console.log(`User moved from ${source} to ${destination}`);

    //
    // HERE IS WHERE YOUR GAME LOGIC WOULD GO
    // - Check whose turn it is
    // - Use library `xiangqi.js` to validate the move
    // - If the move is legal, update the position.

    // For this example, we'll just allow any move.
    const currentPos = position();
    const piece = currentPos[source];

    if (piece) {
      const newPos = { ...currentPos };
      delete newPos[source];
      newPos[destination] = piece;

      // Update the state. The board will reactively re-render.
      setFen(objToFen(newPos));
    }
  };

  const resetBoard = () => {
    setFen(START_FEN);
  };

  const flipBoard = () => {
    setPlayerSide((side) => (side === 'r' ? 'b' : 'r'));
  };

  const onDragStart = (square: Square, piece: Piece) => {
    console.log(`Drag started on ${square} with piece ${piece}`);

    if (!piece.startsWith(playerSide())) return false;
    if (turn() !== playerSide()) return false;

    return true;
  };

  return (
    <main class="min-h-screen flex flex-col items-center justify-center bg-amber-100">
      <div class="w-full max-w-2xl p-4">
        <XiangqiBoard
          position={position()}
          orientation={orientation()}
          draggable={true}
          showNotation={true}
          onPieceDrop={handlePieceDrop}
          onDragStart={onDragStart}
        />
      </div>

      <div class="flex space-x-3">
        <button class="border p-2" onClick={resetBoard}>
          Reset Board
        </button>
        <button class="border p-2" onClick={flipBoard}>
          Flip Board
        </button>
      </div>
      <div>
        <strong>Current FEN:</strong>
        <div class="text-xs text-amber-700">{fen()}</div>
      </div>
    </main>
  );
}
