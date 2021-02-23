import Board from "./board";
import { Color, Score, Rec } from "./definition";

export type Pair = {
    value: Score,
    bestMove: number[]
}

const candidates = {};

export default class AI {
    MAX_DEPTH = 4;
    constructor(public board: Board) { }
    think(y: number, x: number) {
        let count = 0;
        const { board, MAX_DEPTH, getScore } = this;
        const result = whiteThink(0, [y, x], -Infinity, candidates);
        board.setCandidates(result.bestMove[0], result.bestMove[1], candidates);
        console.log('count: ', count)
        return result;

        function blackThink(depth: number, lastMove: number[], beta: number, obj: Rec): Pair {
            count++
            const result: Pair = {
                value: Score.DRAW,
                bestMove: []
            };
            if (board.isFull()) {
                return result;
            }
            const continuities = board.getContinuities(lastMove[0], lastMove[1], Color.WHITE);
            const score = getScore(continuities, Color.WHITE);
            if (score === Score.BLACK_LOSE) {
                result.value = Score.BLACK_LOSE;
                return result;
            }
            if (depth >= MAX_DEPTH) {
                result.value = score;
                return result;
            }
            result.value = Score.BLACK_LOSE - 1;
            board.setCandidates(lastMove[0], lastMove[1], obj);
            for (let i in obj) {
                let [y, x] = i.split(',').map(Number);
                board.downChess(y, x, Color.BLACK);
                let res = whiteThink(depth + 1, [y, x], result.value, { ...obj });
                board.restore(y, x);
                if (res.value > result.value) {
                    result.value = res.value;
                    result.bestMove = [y, x];
                    if (result.value >= beta) {
                        break;
                    }
                }
            }
            return result;
        }
        function whiteThink(depth: number, lastMove: number[], alpha: number, obj: Rec): Pair {
            count++
            const result: Pair = {
                value: Score.DRAW,
                bestMove: []
            };
            if (board.isFull()) {
                return result;
            }
            const continuities = board.getContinuities(lastMove[0], lastMove[1], Color.BLACK);
            const score = getScore(continuities, Color.BLACK);
            if (score === Score.BLACK_WIN) {
                result.value = Score.BLACK_WIN;
                return result;
            }
            if (depth >= MAX_DEPTH) {
                result.value = score;
                return result;
            }
            result.value = Score.BLACK_WIN + 1;
            board.setCandidates(lastMove[0], lastMove[1], obj);
            for (let i in obj) {
                let [y, x] = i.split(',').map(Number);
                board.downChess(y, x, Color.WHITE);
                let res = blackThink(depth + 1, [y, x], result.value, { ...obj });
                board.restore(y, x);
                if (res.value < result.value) {
                    result.value = res.value;
                    result.bestMove = [y, x];
                    if (result.value <= alpha) {
                        break;
                    }
                }
            }
            return result;
        }
    }
    private getScore(continuities: number[], color: Color): number {
        let max = Math.max.apply(null, continuities);
        if (color === Color.BLACK) {
            return max;
        }
        return 5 - max;
    }
}