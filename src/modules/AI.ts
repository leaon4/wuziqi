import Board from "./board";
import { Color, Score } from "./definition";
export type Pair = {
    value: Score,
    bestMove: number[]
}

export default class AI {
    MAX_DEPTH = 4;
    constructor(public board: Board) { }
    think(y: number, x: number) {
        const { board, MAX_DEPTH } = this;
        return whiteThink(0, [y, x]);
        function blackThink(depth: number, lastMove: number[]): Pair {
            const result: Pair = {
                value: Score.DRAW,
                bestMove: []
            };
            if (board.isFull()) {
                return result;
            }
            if (board.immediateWin(lastMove[0], lastMove[1], Color.WHITE)) {
                result.value = Score.BLACK_LOSE;
                return result;
            }
            if (depth >= MAX_DEPTH) {
                return result;
            }
            result.value = Score.BLACK_LOSE - 1;
            let cadidates = board.getCandidates();
            for (let i = 0, len = cadidates.length; i < len; i++) {
                let [y, x] = cadidates[i];
                board.downChess(y, x, Color.BLACK);
                let res = whiteThink(depth + 1, [y, x]);
                board.restore(y, x);
                if (res.value > result.value) {
                    result.value = res.value;
                    result.bestMove = [y, x];
                }
            }
            return result;
        }
        function whiteThink(depth: number, lastMove: number[]): Pair {
            const result: Pair = {
                value: Score.DRAW,
                bestMove: []
            };
            if (board.isFull()) {
                return result;
            }
            if (board.immediateWin(lastMove[0], lastMove[1], Color.BLACK)) {
                result.value = Score.BLACK_WIN;
                return result;
            }
            if (depth >= MAX_DEPTH) {
                return result;
            }
            result.value = Score.BLACK_WIN + 1;
            let cadidates = board.getCandidates();
            for (let i = 0, len = cadidates.length; i < len; i++) {
                let [y, x] = cadidates[i];
                board.downChess(y, x, Color.WHITE);
                let res = blackThink(depth + 1, [y, x]);
                board.restore(y, x);
                if (res.value < result.value) {
                    result.value = res.value;
                    result.bestMove = [y, x];
                }
            }
            return result;
        }
    }
}