import { createMemo, createSignal, For } from 'solid-js';
import { cn } from '~/lib/utils';
import { pieceImages } from '~/utils/piece-images';
import { COLUMNS, type Square } from '~/utils/xq-board';

export default function Test() {
  const [orientation, setOrientation] = createSignal('red');
  const boardLayout = createMemo(() => {
    const rows = Array.from({ length: 10 }, (_, i) => (orientation() === 'red' ? 9 - i : i));
    const cols = Array.from({ length: 9 }, (_, i) => (orientation() === 'red' ? i : 8 - i));
    return rows.map((row) => cols.map((col) => `${COLUMNS[col]}${row}` as Square));
  });

  const isSelected = (square: Square) => square === selectedSquare();

  const [selectedSquare, setSelectedSquare] = createSignal<Square | null>(null);


  const onClickPiece = (square: Square) => {
    // check if already have an active piece
    if (!selectedSquare()) {
      return setSelectedSquare(square);
    }

    if (selectedSquare() === square) {
      return setSelectedSquare(null);
    }

    // now there is an active piece and we want to move it to the this place
    // otherwise

  };



  return (
    <div class="w-full aspect-[9/10] bg-amber-700 grid grid-cols-9 grid-rows-10 gap-0">
      <For each={boardLayout()}>
        {(row) => (
          <For each={row}>
            {(square) => (
              <div
                class={cn('w-full h-full bg-cover bg-no-repeat', {
                  'shadow-[inset_0_0_3px_3px_yellow]': isSelected(square),
                })}
                style={{
                  'background-color': mapSquareToColor(square),
                }}
                onClick={() => onClickPiece(square)}
              ></div>
            )}
          </For>
        )}
      </For>
    </div>
  );
}

const colors = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'brown',
  'gray',
  'black',
];

// map square to color
const mapSquareToColor = (square: Square) => {
  const row = parseInt(square.slice(1));
  const col = COLUMNS.indexOf(square[0]);
  return colors[(row + col) % colors.length];
};
