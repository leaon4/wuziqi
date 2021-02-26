import GobangInterface from './modules/interface';
import Board from './modules/board';
import AI from './modules/AI';
import ScoreComputer from './modules/score';

const board = new Board();
const score = (window as any).score = new ScoreComputer(board);
const ai = new AI(board, score);
const view = new GobangInterface(document.getElementById('canvas') as HTMLCanvasElement,
    document.getElementById('position') as HTMLDivElement, board, ai);
