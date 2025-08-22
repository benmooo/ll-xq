export const COLUMNS = 'abcdefghi'.split('');
export const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR';

export type Square = `${(typeof COLUMNS)[number]}${number}`;
export type Piece = `${'b' | 'r'}${'K' | 'A' | 'B' | 'N' | 'R' | 'C' | 'P'}`;
export type PositionObject = { [square in Square]?: Piece };

// Helper function to check if a string is a valid square
export function isValidSquare(square: string): square is Square {
  return /^[a-i][0-9]$/.test(square);
}

// Convert FEN string to a position object
export function fenToObj(fen: string): PositionObject {
  const obj: PositionObject = {};
  fen = fen.replace(/ .+$/, ''); // remove extra info
  const rows = fen.split('/');
  let currentRow = 9;

  for (const row of rows) {
    let colIdx = 0;
    for (const char of row) {
      if (/[1-9]/.test(char)) {
        colIdx += parseInt(char, 10);
      } else {
        const square = `${COLUMNS[colIdx]}${currentRow}` as Square;
        const piece = (char.toLowerCase() === char ? 'b' : 'r') + char.toUpperCase();
        obj[square] = piece as Piece;
        colIdx++;
      }
    }
    currentRow--;
  }
  return obj;
}

// Convert a position object back to a FEN string
export function objToFen(obj: PositionObject): string {
  let fen = '';
  for (let row = 9; row >= 0; row--) {
    let empty = 0;
    let rowFen = '';
    for (let col = 0; col < COLUMNS.length; col++) {
      const square = `${COLUMNS[col]}${row}` as Square;
      const piece = obj[square];
      if (piece) {
        if (empty > 0) {
          rowFen += empty;
          empty = 0;
        }
        const color = piece.substring(0, 1);
        const type = piece.substring(1, 2);
        rowFen += color === 'r' ? type.toUpperCase() : type.toLowerCase();
      } else {
        empty++;
      }
    }
    if (empty > 0) {
      rowFen += empty;
    }
    if (fen !== '') {
      fen += '/';
    }
    fen += rowFen;
  }

  return fen;
}

export const START_POSITION = fenToObj(START_FEN);

// console.log(START_FEN);
// console.log(fenToObj(START_FEN));
// console.log(objToFen(START_POSITION));
// console.log('a == b', START_FEN === objToFen(START_POSITION));

export const COLUMN_MAP: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
  i: 8,
};
