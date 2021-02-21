import ViewInterface from './modules/interface';
import Board from './modules/board';

const board = new Board();
board.init();

const view = new ViewInterface();
view.init(board);
