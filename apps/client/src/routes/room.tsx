import { useParams } from '@solidjs/router';
import { XiangqiBoard, type HighlightSquares } from '~/components/xq-board';
import { createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
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
  // highlight squares
  const [highlightSquares, setHighlightSquares] = createSignal<HighlightSquares>({
    r: null,
    b: null,
  });

  // active Piece
  const [active, setActive] = createSignal<Square | null>(null);

  // legal moves for the current piece
  const [legalMoves, { mutate: mutateLegalMoves }] = createResource(active, async (square) => {
    // check if is our turn
    if (playerSide() !== turn()) return [];

    const res = await trpc.game.legalMoves.query({
      roomId,
      playerId: playerId()!,
      square: square,
    });

    if (!res.success) {
      console.error(res.error);
      return [];
    }

    const moves = res.data.moves as string[];
    return moves.map((move) => move.slice(2)) as Square[];
  });

  createEffect(() => {
    localStorage.setItem('playerId', playerId() ?? '');
  });

  createEffect(() => {
    if (!active()) mutateLegalMoves(undefined);
  });

  onMount(async () => {
    document.body.style.overflow = 'hidden';
    const r = await trpc.game.joinRoom.mutate({
      roomId,
      playerName: `p-${uuidv4().slice(0, 8)}`,
      playerId: playerId() ?? undefined,
    });

    if (!r.success) return console.error(r.error);

    const {
      player: { id, side },
    } = r.data as { player: Player };

    if (id !== playerId()) setPlayerId(id);
    if (side !== playerSide()) setPlayerSide(side);

    // ------------- init ping-pong to keep alive
    const ping = setInterval(() => {
      trpc.game.ping.mutate({ roomId, playerId: id });
    }, 10 * 1000);
    onCleanup(() => clearInterval(ping));

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
            case 'joinError':
              console.log('join error', event.payload);
              break;
            case 'joinSuccess':
              console.log('player joined room: ', event.payload);
              break;
            case 'moveMade':
              // check if the move is made by the opponent, the turn in payload means next turn
              const { from, to, fen, turn, side } = event.payload;
              setTurn(turn);

              if (event.payload.turn === playerSide()) {
                // now it's my turn, but we should update the board first with piece animation, because the opponent's move is already made
                // animate the piece movement
                // animatePieceMovement(from, to);

                setFen(fen);
              } else {
              }

              updateHighlightSquare(side, from as Square, to as Square);
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

    // reload the game state
    const res = await trpc.game.roomState.query({
      roomId,
      playerId: id,
    });

    if (!res.success) return console.error(res.error);

    const { fen: f, turn: t } = res.data as {
      fen: string;
      turn: 'r' | 'b';
      players: { name: string; side: 'r' | 'b'; online: boolean };
    };

    if (t !== turn()) setTurn(t);

    if (f !== fen()) setFen(f);
  });

  const resetBoard = () => {
    setFen(START_FEN);
  };

  const flipBoard = () => {
    setPlayerSide((side) => (side === 'r' ? 'b' : 'r'));
  };

  const onClickPiece = async (s: Square) => {
    const currentActive = active();

    const currentPos = position();
    const piece = currentPos[s];
    if (!piece) return;

    const isOwnPiece = piece.startsWith(playerSide());

    if (!currentActive) {
      if (!isOwnPiece) return;
      return setActive(s);
    }

    if (currentActive === s) return setActive(null);

    // can not eat own piece, activate a new piece
    if (isOwnPiece) return setActive(s);

    // check if is our turn
    if (turn() !== playerSide()) return console.log('Not your turn');

    // leverage serve to validate move
    await makeMove(currentActive, s);
  };

  const updateHighlightSquare = (side: 'r' | 'b', from: Square, to: Square) => {
    const color = side === 'r' ? 'yellow' : 'indigo';
    setHighlightSquares((prev) => ({
      ...prev,
      [side]: [
        { square: from, color },
        { square: to, color },
      ],
    }));
  };

  const makeMove = async (from: Square, to: Square) => {
    const res = await trpc.game.move.mutate({
      roomId,
      playerId: playerId()!,
      move: { from, to },
    });

    if (!res.success) {
      console.error(res.error?.message);
      return false;
    }

    const currentPos = position();
    const piece = currentPos[from];

    const newPos = { ...currentPos };
    delete newPos[from];
    newPos[to] = piece;

    setFen(objToFen(newPos));
    setActive(null);

    return true;
  };

  const onClickSquare = async (to: Square) => {
    const from = active();
    if (!from) return;
    if (!legalMoves()?.includes(to)) return;

    await makeMove(from, to);
  };

  return (
    <main class="min-h-screen flex flex-col items-center justify-center bg-amber-100">
      <div class="w-full max-w-2xl p-4">
        <XiangqiBoard
          position={position()}
          orientation={orientation()}
          showNotation={false}
          // onPieceMove={onPieceMove}
          onClickPiece={onClickPiece}
          onClickSquare={onClickSquare}
          highlightSquares={highlightSquares()}
          legalMoves={legalMoves()}
          active={active()}
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
