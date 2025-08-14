import { createSignal, createMemo, For, Show, onCleanup, onMount } from 'solid-js';
import {
  type PositionObject,
  type Piece,
  type Square,
  COLUMNS,
  isValidSquare,
} from '../utils/xq-board';
import '../assets/style/xq-board.css';
import defaultBoardTheme from '~/assets/img/xiangqiboards/wikimedia/xiangqiboard.svg';
import { pieceImages } from '~/utils/piece-images';

// --- Component Props ---
export interface XiangqiBoardProps {
  // Appearance & Behavior
  position: PositionObject;
  orientation?: 'red' | 'black';
  showNotation?: boolean;
  draggable?: boolean;

  // Theming
  pieceTheme?: (piece: Piece) => string;
  boardTheme?: string;

  // Callbacks for Parent Interaction
  onPieceDrop: (source: Square, destination: Square) => void;
  onMouseoverSquare?: (square: Square, piece?: Piece) => void;
  onMouseoutSquare?: (square: Square, piece?: Piece) => void;
  onDragStart?: (source: Square, piece: Piece) => boolean | void; // Return false to cancel drag
}

// --- Default Props ---
const defaultPieceTheme = (piece: Piece) => pieceImages[piece];

// --- The Component ---
export function XiangqiBoard(props: XiangqiBoardProps) {
  // --- Internal State for Dragging ---
  const [dragInfo, setDragInfo] = createSignal<{
    piece: Piece;
    source: Square;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [boardRef, setBoardRef] = createSignal<HTMLDivElement>();
  const [squareSize, setSquareSize] = createSignal(50);

  // --- Memoized Values for Rendering ---
  const orientation = createMemo(() => props.orientation ?? 'red');
  const pieceTheme = createMemo(() => props.pieceTheme ?? defaultPieceTheme);

  const boardLayout = createMemo(() => {
    const rows = Array.from({ length: 10 }, (_, i) => (orientation() === 'red' ? 9 - i : i));
    const cols = Array.from({ length: 9 }, (_, i) => (orientation() === 'red' ? i : 8 - i));
    return rows.map((row) => cols.map((col) => `${COLUMNS[col]}${row}` as Square));
  });

  // --- Board Sizing ---
  const calculateSquareSize = () => {
    const board = boardRef();
    if (board) {
      // Board is 9 columns wide
      const newSize = Math.floor(board.clientWidth / 9);
      setSquareSize(newSize);
    }
  };

  onMount(() => {
    calculateSquareSize();
    window.addEventListener('resize', calculateSquareSize);
    onCleanup(() => window.removeEventListener('resize', calculateSquareSize));
  });

  // --- Event Handlers ---
  // 结合鼠标和触控事件的类型
  type MouseOrTouchEvent = MouseEvent | TouchEvent;

  const handleDragStart = (e: MouseOrTouchEvent, sourceSquare: Square) => {
    if (!props.draggable) return;

    const piece = props.position[sourceSquare];
    if (!piece) return;

    if (props.onDragStart && props.onDragStart(sourceSquare, piece) === false) {
      return;
    }

    // 阻止默认行为，这在移动设备上尤其重要，可以防止页面滚动
    e.preventDefault();

    // 获取事件的坐标和目标元素
    let clientX: number, clientY: number;
    let target: HTMLElement;

    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
      target = e.target as HTMLElement;
    } else {
      // TouchEvent
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      target = touch.target as HTMLElement;
    }

    const rect = target.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    setDragInfo({
      piece,
      source: sourceSquare,
      x: clientX,
      y: clientY,
      offsetX,
      offsetY,
    });

    // 在全局 window 上同时监听鼠标和触控事件
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove);
    window.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e: MouseOrTouchEvent) => {
    if (!dragInfo()) return;

    let clientX: number, clientY: number;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      // TouchEvent
      const touch = e.touches[0];
      if (!touch) return; // 没有触控点，退出
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    setDragInfo((prev) => (prev ? { ...prev, x: clientX, y: clientY } : null));
  };

  const handleDragEnd = (e: MouseOrTouchEvent) => {
    const info = dragInfo();
    if (!info) return;

    let clientX: number;
    let clientY: number;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      // TouchEvent
      const touch = e.changedTouches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    const board = boardRef();
    if (board) {
      const rect = board.getBoundingClientRect();
      const colWidth = rect.width / 9;
      const rowHeight = rect.height / 10;

      let col = Math.floor((clientX - rect.left) / colWidth);
      let row = Math.floor((clientY - rect.top) / rowHeight);

      // Adjust for orientation
      if (orientation() === 'black') {
        col = 8 - col;
        // row = 9 - row;
      } else {
        row = 9 - row;
      }

      const destinationSquare = `${COLUMNS[col]}${row}`;

      if (isValidSquare(destinationSquare)) {
        props.onPieceDrop(info.source, destinationSquare as Square);
      }
    }

    setDragInfo(null);
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('touchend', handleDragEnd);
  };

  return (
    <div
      class="xq-board-container"
      ref={setBoardRef}
      style={{
        'background-image': `url(${props.boardTheme ?? defaultBoardTheme})`,
        width: '100%',
        'aspect-ratio': '9 / 10',
      }}
    >
      <div class="xq-board-grid">
        <For each={boardLayout()}>
          {(row) => (
            <div class="xq-row">
              <For each={row}>
                {(square) => (
                  <div
                    class="xq-square"
                    data-square={square}
                    onMouseOver={() => props.onMouseoverSquare?.(square, props.position[square])}
                    onMouseOut={() => props.onMouseoutSquare?.(square, props.position[square])}
                    style={{
                      width: `${squareSize()}px`,
                      height: `${squareSize()}px`,
                    }}
                  >
                    <Show when={props.showNotation}>
                      {/* Simplified notation rendering */}
                      <div
                        class="xq-notation select-none pointer-events-none"
                        style={{
                          top: `${squareSize() / 2 - 5}px`,
                          left: `${squareSize() / 2 - 5}px`,
                        }}
                      >
                        {square}
                      </div>
                    </Show>

                    <Show when={props.position[square] && !(dragInfo()?.source === square)}>
                      <img
                        src={pieceTheme()(props.position[square]!)}
                        class="xq-piece"
                        style={{ cursor: props.draggable ? 'grab' : 'default' }}
                        onMouseDown={(e) => handleDragStart(e, square)}
                        onTouchStart={(e) => handleDragStart(e, square)}
                        draggable={false}
                      />
                    </Show>
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>

      {/* --- Render the piece being dragged --- */}
      <Show when={dragInfo()}>
        {(info) => (
          <img
            src={pieceTheme()(info().piece)}
            class="xq-piece xq-dragging-piece"
            style={{
              // transform: `translate(${info().x}px, ${info().y}px)`,
              transform: `translate(${info().x - info().offsetX}px, ${info().y - info().offsetY}px)`,
              width: `${squareSize()}px`,
              height: `${squareSize()}px`,
            }}
            draggable={false}
          />
        )}
      </Show>
    </div>
  );
}
