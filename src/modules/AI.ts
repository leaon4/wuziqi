import Board from "./board";
import { Color, Score, Rec } from "./definition";
import ScoreComputer from "./score";

export type Pair = {
    value: Score,
    bestMove: number[],
    depth: number
}

const candidates = {};

export default class AI {
    MAX_DEPTH = 3;
    constructor(public board: Board, public scoreComputer: ScoreComputer) { }
    think(y: number, x: number) {
        let count = 0;
        const { board, MAX_DEPTH, scoreComputer, getScore } = this;
        board.setCandidates(y, x, candidates);
        const result = whiteThink(0, [y, x], -Infinity, candidates);
        board.setCandidates(result.bestMove[0], result.bestMove[1], candidates);
        console.log('count: ', count)
        return result;

        function blackThink(depth: number, lastMove: number[], beta: number, obj: Rec): Pair {
            if (depth >= 4) {
                let a = 1;
            }
            count++
            let result: Pair = {
                value: Score.DRAW,
                bestMove: [],
                depth
            };
            if (board.isFull()) {
                return result;
            }
            const continuities = board.getContinuities(lastMove[0], lastMove[1], Color.WHITE);
            // const score = getScore(continuities, Color.WHITE);
            // if (score === Score.BLACK_LOSE) {
            //     result.value = Score.BLACK_LOSE;
            //     return result;
            // }
            if (continuities.some(item => item >= 5)) {
                result.value = Score.BLACK_LOSE;
                return result;
            }
            if (depth >= MAX_DEPTH) {
                // result.value = score;
                let blackMax = scoreComputer.computeTotalScore(Color.BLACK);
                let whiteMax = scoreComputer.computeTotalScore(Color.WHITE);
                if (whiteMax.value > blackMax.value) {
                    result.value = -whiteMax.value;
                } else {
                    result.value = blackMax.value;
                }
                return result;
            }
            result.value = Score.BLACK_LOSE - 1;
            let newObj = Object.create(obj);
            board.setCandidates(lastMove[0], lastMove[1], newObj);
            for (let i in newObj) {
                if (newObj[i] === false) {
                    continue;
                }
                let [y, x] = i.split(',').map(Number);
                board.downChess(y, x, Color.BLACK);
                let res = whiteThink(depth + 1, [y, x], result.value, newObj);
                board.restore(y, x);
                if (res.value > result.value || (res.value === result.value && res.depth < result.depth)) {
                    result = res;
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
            let result: Pair = {
                value: Score.DRAW,
                bestMove: [],
                depth
            };
            if (board.isFull()) {
                return result;
            }
            const continuities = board.getContinuities(lastMove[0], lastMove[1], Color.BLACK);
            // const score = getScore(continuities, Color.BLACK);
            // if (score === Score.BLACK_WIN) {
            //     result.value = Score.BLACK_WIN;
            //     return result;
            // }
            if (continuities.some(item => item >= 5)) {
                result.value = Score.BLACK_WIN;
                return result;
            }
            if (depth >= MAX_DEPTH) {
                // result.value = score;
                let blackMax = scoreComputer.computeTotalScore(Color.BLACK);
                let whiteMax = scoreComputer.computeTotalScore(Color.WHITE);
                if (blackMax.value > whiteMax.value) {
                    result.value = blackMax.value;
                } else {
                    result.value = -whiteMax.value;
                }
                return result;
            }
            result.value = Score.BLACK_WIN + 1;
            let newObj = Object.create(obj);
            board.setCandidates(lastMove[0], lastMove[1], newObj);
            for (let i in newObj) {
                if (newObj[i] === false) {
                    continue;
                }
                let [y, x] = i.split(',').map(Number);
                board.downChess(y, x, Color.WHITE);
                let res = blackThink(depth + 1, [y, x], result.value, newObj);
                board.restore(y, x);
                if (res.value < result.value || (res.value === result.value && res.depth < result.depth)) {
                    result = res;
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