import Board from '../src/modules/board';
import AI from '../src/modules/AI';
import ScoreComputer from '../src/modules/score';
import { Color } from '../src/modules/definition';

const board = new Board();
const score = new ScoreComputer(board);
const ai = new AI(board, score);

function downChess(y: number, x: number, color = Color.BLACK) {
    board.downChess(y, x, color);
    score.downChess(y, x);
    const res = ai.think(y, x);
    return res;
}

test('init', () => {
    expect(board.map.length).toBe(15);
    downChess(7, 7, Color.BLACK)
    expect(board.map[7][7] === Color.BLACK);
    expect(score.getMaxScore(Color.BLACK).code).toBe('000000010000000')
});