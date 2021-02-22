import GobangInterface from './modules/interface';
import Board from './modules/board';
import AI from './modules/AI';

const board = new Board();
const ai = new AI(board);
const view = new GobangInterface(document.getElementById('canvas') as HTMLCanvasElement,
    document.getElementById('position') as HTMLDivElement, board, ai);
