import Board from '../src/modules/board';
import AI from '../src/modules/AI';
import ScoreComputer from '../src/modules/score';
import { Color, Score } from '../src/modules/definition';

export default class TestUtil {
    board: Board;
    score: ScoreComputer;
    ai: AI;
    constructor(
        public MAX_CHESS_LENGTH: number,
        public MAX_DEPTH: number,
        public KILL_DEPTH: number
    ) {
        this.board = new Board(MAX_CHESS_LENGTH);
        this.score = new ScoreComputer(this.board);
        this.ai = new AI(this.board, this.score, MAX_DEPTH, KILL_DEPTH);
    }
    downChess(y: number, x: number, color = Color.BLACK) {
        this.board.downChess(y, x, color);
        this.score.downChess(y, x);
        return this.ai.think(y, x);
    }
    reset(map?: number[][]) {
        this.board.reset(map);
        this.ai.reset();
        this.score.reset();
    }
}
