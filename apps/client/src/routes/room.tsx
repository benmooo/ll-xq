import { useParams } from '@solidjs/router';
import { XiangqiBoard } from '~/components/xq-board';
import { createSignal, onMount } from 'solid-js';
import { objToFen, START_POSITION, type PositionObject, type Square } from '../utils/xq-board';

export default function GameRoom() {
  // get room id from solid router
  const roomId = useParams().id;

  const [position, setPosition] = createSignal<PositionObject>(START_POSITION);
  const [orientation, setOrientation] = createSignal<'red' | 'black'>('red');
  const [fen, setFen] = createSignal(objToFen(START_POSITION));

  onMount(() => {
    // api.example.hello.query('fd');
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
      setPosition(newPos);
      setFen(objToFen(newPos));
    }
  };

  const resetBoard = () => {
    setPosition(START_POSITION);
    setFen(objToFen(START_POSITION));
  };

  const flipBoard = () => {
    setOrientation((o) => (o === 'red' ? 'black' : 'red'));
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
          onDragStart={(square, piece) => {
            console.log(`Drag started on ${square} with piece ${piece}`);
            // Example: only allow red pieces to be dragged
            // if (piece.startsWith('b')) {
            //   return false; // This would cancel the drag
            // }
          }}
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
