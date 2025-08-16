import { useParams } from '@solidjs/router';
import { XiangqiBoard, type HighlightSquares } from '~/components/xq-board';
import { createEffect, createResource, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { fenToObj, objToFen, START_FEN, type Piece, type Square } from '../utils/xq-board';
import { trpc } from '~/lib/core/trpc';
import { v4 as uuidv4 } from 'uuid';
import type { Player } from '@ll-xq/trpc/src/types';
import { VsDebugRestart } from 'solid-icons/vs';
import { VsLoading } from 'solid-icons/vs';

export default function GameRoom() {
  // get room id from solid router
  const roomId = useParams().id;

  const [gameStatus, setGameStatus] = createSignal<
    'loading' | 'playing' | 'incheck' | 'checkmate' | 'stalemate' | 'draw'
  >('loading');

  const gameOver = () => {
    const status = gameStatus();
    return status === 'checkmate' || status === 'stalemate' || status === 'draw';
  };

  const [winner, setWinner] = createSignal<'r' | 'b' | 'draw' | null>(null);

  const [turnNumber, setTurnNumber] = createSignal(0);
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);

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
              setErrorMsg(event.payload.message);
              break;
            case 'gameStart':
              const { fen: f, turn: t } = event.payload;
              setFen(f);
              setTurn(t);
              setGameStatus('playing');
              // remove highlight and legal moves
              setHighlightSquares({ r: null, b: null });
              mutateLegalMoves(undefined);
              break;
            case 'gameOver':
              console.log('game over', event.payload);
              const { winner, reason } = event.payload;
              setWinner(winner);

              if (reason === 'checkmate') setGameStatus('checkmate');
              if (reason === 'stalemate') setGameStatus('stalemate');
              if (winner === 'draw') setGameStatus('draw');
              break;
            case 'roomCreated':
              console.log('room created', event.payload);
              break;
            case 'inCheck':
              console.log('in check', event.payload);
              const { sideInCheck: _ } = event.payload;
              setGameStatus('incheck');
              break;
            case 'joinError':
              console.log('join error', event.payload);
              setErrorMsg(event.payload.reason);
              break;
            case 'joinSuccess':
              console.log('player joined room: ', event.payload);
              break;
            case 'moveMade':
              // check if the move is made by the opponent, the turn in payload means next turn
              const { from, to, fen, turn, side } = event.payload;
              setTurn(turn);
              setTurnNumber(Number(fen.slice(-1)));

              if (event.payload.turn === playerSide()) {
                // now it's my turn, but we should update the board first with piece animation, because the opponent's move is already made
                // animate the piece movement
                // animatePieceMovement(from, to);

                setFen(fen);
              } else {
              }
              setGameStatus('playing');

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

  const restartGame = async () => {
    const res = await trpc.game.restartGame.mutate({ roomId: roomId, playerId: playerId()! });
    if (!res.success) {
      return console.error(res.error);
    }
  };

  // const flipBoard = () => {
  //   setPlayerSide((side) => (side === 'r' ? 'b' : 'r'));
  // };

  const onClickPiece = async (s: Square) => {
    // check if is our turn
    if (turn() !== playerSide()) return;

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

  const redDot = () => <div class="w-3 h-3 bg-red-600 opacity-80 rounded-full"></div>;
  const blackDot = () => <div class="w-3 h-3 bg-black opacity-80 rounded-full"></div>;

  const gameStatusUI = () => {
    switch (gameStatus()) {
      case 'loading':
        return <VsLoading class="text-amber-900 animate-spin size-3" />;
      case 'playing':
        return (
          <span class="relative flex size-3">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75"></span>
            <span class="relative inline-flex size-3 rounded-full bg-lime-500"></span>
          </span>
        );

      case 'incheck':
        return <div class="text-red-600">将军</div>;
      case 'checkmate':
        return <div class="text-red-600">将死</div>;
      case 'stalemate':
        return <div class="text-red-600">穷途</div>;
      case 'draw':
        return <div class="text-amber-900">和棋</div>;
      default:
        return <div class="text-gray-600">?</div>;
    }
  };

  return (
    <main class="min-h-screen flex flex-col items-center justify-center bg-amber-200">
      <div class="text-4xl text-amber-900 mb-4">赖赖象棋</div>

      <div class="flex space-x-4 text-amber-900 font-semibold  px-4">
        {/* player side, turn, turn number, game status,  */}
        <div class="flex space-x-2 items-center">
          <span class="font-light text-xs text-amber-700">你是:</span>
          {playerSide() === 'r' ? redDot() : blackDot()}
        </div>
        <div class="flex space-x-2 items-center">
          <span class="font-light text-xs text-amber-700">轮到:</span>
          {turn() === 'r' ? redDot() : blackDot()}
        </div>
        <div class="flex space-x-2 items-center">
          <span class="font-light text-xs text-amber-700">轮次:</span>

          <div>{turnNumber()}</div>
        </div>
        <div class="flex space-x-2 items-center">
          <span class="font-light text-xs text-amber-700">状态:</span>
          <div>{gameStatusUI()}</div>
        </div>
      </div>

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

      <Show when={errorMsg()}>
        <div class="flex space-x-2 items-center w-full px-4">
          <span class="font-light text-xs text-amber-700">Error:</span>
          <div class="text-xs text-amber-800">{errorMsg()}</div>
        </div>
      </Show>

      <div class="flex space-x-3">
        <Show when={gameOver()}>
          <button
            class="border border-amber-900 p-2 rounded-xl flex items-center space-x-0.5"
            onClick={restartGame}
          >
            <VsDebugRestart />
            <div>RESTART</div>
          </button>
        </Show>
      </div>
    </main>
  );
}
