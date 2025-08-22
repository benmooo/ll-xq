import { createSignal, createMemo, For, Show, onMount, createEffect, onCleanup } from 'solid-js';
import {
  type PositionObject,
  type Piece,
  type Square,
  COLUMNS,
  COLUMN_MAP,
} from '../utils/xq-board';
import '../assets/style/xq-board.css';
import defaultBoardTheme from '~/assets/img/xiangqiboards/wikimedia/xiangqiboard.svg';
import { pieceImages } from '~/utils/piece-images';
import { cn } from '~/lib/utils';
// import { usePreviousEffect } from '~/lib/hooks/usePreviousEffect';

// --- Component Props ---
export interface XiangqiBoardProps {
  // Appearance & Behavior
  position: PositionObject;
  orientation?: 'red' | 'black';
  showNotation?: boolean;
  draggable?: boolean;

  highlightSquares?: HighlightSquares;
  legalMoves?: Square[];

  // Theming
  pieceTheme?: (piece: Piece) => string;
  boardTheme?: string;
  // current selected piece
  active?: Square | null;

  // Callbacks for Parent Interaction
  // onPieceMove: (source: Square, destination: Square) => void;
  onClickPiece: (source: Square) => void;
  onClickSquare: (square: Square) => void;
  movement?: Movement | null;
}

// --- Default Props ---
const defaultPieceTheme = (piece: Piece) => pieceImages[piece];

// --- The Component ---
export function XiangqiBoard(props: XiangqiBoardProps) {
  // --- Internal State for Dragging ---
  const [pieceMovement, setPieceMovement] = createSignal<{
    piece: Piece;
    from: Square;
    to: Square;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // --- Memoized Values for Rendering ---
  const orientation = createMemo(() => props.orientation ?? 'red');
  const pieceTheme = createMemo(() => props.pieceTheme ?? defaultPieceTheme);

  // const side = createMemo(() => (orientation() === 'red' ? 'r' : 'b'));

  const boardLayout = createMemo(() => {
    const rows = Array.from({ length: 10 }, (_, i) => (orientation() === 'red' ? 9 - i : i));
    const cols = Array.from({ length: 9 }, (_, i) => (orientation() === 'red' ? i : 8 - i));
    return rows.map((row) => cols.map((col) => `${COLUMNS[col]}${row}` as Square));
  });

  let boardRef: HTMLDivElement | undefined;
  const [pieceWidth, setPieceWidth] = createSignal(0);

  // when movement changes, animate the piece movement
  createEffect(() => {
    if (!props.movement) return;

    // animate the piece movement
    animatePiece(props.movement);
  });

  const animatePiece = (movement: Movement) => {
    const { from, to, side, piece } = movement;

    const [fromX, fromY] = from.split('').map((n, i) => (i === 0 ? COLUMN_MAP[n] : Number(n)));
    const [toX, toY] = to.split('').map((n, i) => (i === 0 ? COLUMN_MAP[n] : Number(n)));

    // animate the piece movement

    let start = performance.now();

    const animate = (t: number) => {
      const progress = Math.min((t - start) / 200, 1);

      const unit = pieceWidth();
      const directionY = orientation() === 'red' ? -1 : 1;
      const directionX = orientation() === 'red' ? 1 : -1;
      const pieceMovement = {
        piece,
        from,
        to,
        offsetX: progress * (directionX * (toX - fromX)) * unit,
        offsetY: progress * (directionY * (toY - fromY)) * unit,
      };
      setPieceMovement(pieceMovement);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPieceMovement(null);
      }
    };

    requestAnimationFrame(animate);
  };

  onMount(() => {});

  createEffect(() => {
    if (!boardRef) return;

    // 初始测量
    setPieceWidth(boardRef.offsetWidth / 9);

    // 使用 ResizeObserver 监听尺寸变化
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPieceWidth(entry.contentRect.width / 9);
      }
    });

    observer.observe(boardRef);

    // 清理函数
    onCleanup(() => observer.disconnect());
  });

  const highlightSquareStyle = (square: Square) => {
    const highlightArrays = [props.highlightSquares?.r, props.highlightSquares?.b];

    for (const arr of highlightArrays) {
      if (arr) {
        const highlight = arr.find((s) => s.square === square);
        if (highlight) {
          return {
            'box-shadow': `inset 0 0 3px 3px ${highlight.color}`,
          };
        }
      }
    }

    return {};
  };

  return (
    <div ref={boardRef} class="relative aspect-[9/10] w-full grid grid-cols-9 grid-rows-10">
      <div
        class="absolute inset-0 bg-cover bg-no-repeat filter saturate-90 hue-rotate-[10deg] rounded-lg"
        style={{
          'background-image': `url(${props.boardTheme ?? defaultBoardTheme})`,
        }}
      ></div>
      <For each={boardLayout()}>
        {(row) => (
          <For each={row}>
            {(square) => (
              <div
                class={cn('w-full h-full relative', {
                  '!shadow-[inset_0_0_3px_3px_lime]': props.legalMoves?.includes(square),
                })}
                data-square={square}
                onClick={() => props.onClickSquare(square)}
                style={highlightSquareStyle(square)}
              >
                {/*<Show when={props.showNotation}>*/}
                <Show when={false}>
                  <div class="absolute transform translate-x-1/2 translate-y-1/2 text-amber-100 text-xs">
                    {square}
                  </div>
                </Show>

                <Show
                  when={
                    props.position[square] &&
                    pieceMovement()?.from !== square &&
                    pieceMovement()?.to !== square
                  }
                >
                  <div
                    style={{ 'background-image': `url(${pieceTheme()(props.position[square]!)})` }}
                    class={cn('w-full h-full', {
                      'animate-bounce': square === props.active,
                    })}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onClickPiece(square);
                    }}
                  ></div>
                </Show>

                {/* --- Render the piece being animated --- */}
                <Show when={pieceMovement()?.from === square && pieceMovement()}>
                  {(info) => (
                    <img
                      src={pieceTheme()(info().piece)}
                      style={{
                        // transform: `translate(${info().x}px, ${info().y}px)`,
                        transform: `translate(${info().offsetX}px, ${info().offsetY}px)`,
                      }}
                      draggable={false}
                    />
                  )}
                </Show>
              </div>
            )}
          </For>
        )}
      </For>
    </div>
  );
}

export type HighlightSquare = { square: Square; color: string };
export type HighlightSquares = {
  r: [HighlightSquare, HighlightSquare] | null;
  b: [HighlightSquare, HighlightSquare] | null;
};

export type Movement = {
  side: 'r' | 'b';
  piece: Piece;
  from: Square;
  to: Square;
};
