import Board from "./board";
import { Color, Score, Rec } from "./definition";
import ScoreComputer from "./score";

export type Pair = {
    value: Score,
    bestMove: number[],
    depth: number
}

let candidates = {};

export default class AI {
    constructor(
        public board: Board,
        public scoreComputer: ScoreComputer,
        readonly MAX_DEPTH = 1
    ) {
        this.reset();
    }
    reset() {
        candidates = {};
        if (this.board.hasInitialMap) {
            this.initCandidates(this.board);
        }
    }
    think(y: number, x: number) {
        let count = 0;
        const { board, MAX_DEPTH, scoreComputer, getScore } = this;
        board.setCandidates(y, x, candidates);
        const result = whiteThink(0, [y, x], -Infinity, candidates);
        board.setCandidates(result.bestMove[0], result.bestMove[1], candidates);
        console.log('count: ', count)
        return result;

        function blackThink(depth: number, lastMove: number[], beta: number, obj: Rec): Pair {
            count++
            let result: Pair = {
                value: Score.DRAW,
                bestMove: [],
                depth
            };
            if (board.isFull()) {
                return result;
            }
            let blackMax = scoreComputer.getMaxScore(Color.BLACK);
            let whiteMax = scoreComputer.getMaxScore(Color.WHITE);
            if (blackMax.value === 6
                || blackMax.value === 5 && blackMax.type === 'DeadFour') {
                result.value = Score.BLACK_WIN;
                // todo 活四bestMove
                result.bestMove = blackMax.candidates![0];
                return result;
            }
            if (whiteMax.value === 6) {
                // 白子有活四，黑子无四连，则必输
                result.value = Score.BLACK_LOSE;
                // todo 活四bestMove
                return result;
            }
            let killPoints: number[][] = [];
            if (whiteMax.type === 'DeadFour') {
                // 白子有死四，这时只能先阻挡
                killPoints = whiteMax.candidates!;
            } else if (blackMax.value === 5) {
                // 黑子活三，且黑子先走，且白子已经没有死四，黑子必赢
                result.value = Score.BLACK_WIN;
                result.bestMove = blackMax.keyCandidates![0];
                return result;
            } else if (whiteMax.value === 5) {
                // 白子活三，黑没有更优的选择，则应该优先堵
                killPoints = Object.keys(scoreComputer.white.killPoints)
                    .map(item => item.split(',').map(Number));
            }

            if (!killPoints.length && depth >= MAX_DEPTH) {
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
            if (killPoints.length) {
                for (let p of killPoints) {
                    let [y, x] = p;
                    board.downChess(y, x, Color.BLACK);
                    let isWin = scoreComputer.downChessFake(y, x, Color.BLACK);
                    if (isWin) {
                        board.restore(y, x);
                        scoreComputer.restore();
                        result.value = Score.BLACK_WIN;
                        result.bestMove = [y, x];
                        return result;
                    }
                    let res = whiteThink(depth + 1, [y, x], result.value, newObj);
                    board.restore(y, x);
                    scoreComputer.restore();
                    if (res.value > result.value || (res.value === result.value && res.depth < result.depth)) {
                        result = res;
                        result.bestMove = [y, x];
                        if (result.value >= beta) {
                            break;
                        }
                    }
                }
            } else {
                for (let i in newObj) {
                    if (newObj[i] === false) {
                        continue;
                    }
                    let [y, x] = i.split(',').map(Number);
                    board.downChess(y, x, Color.BLACK);
                    let isWin = scoreComputer.downChessFake(y, x, Color.BLACK);
                    if (isWin) {
                        board.restore(y, x);
                        scoreComputer.restore();
                        result.value = Score.BLACK_WIN;
                        result.bestMove = [y, x];
                        return result;
                    }
                    let res = whiteThink(depth + 1, [y, x], result.value, newObj);
                    board.restore(y, x);
                    scoreComputer.restore();
                    if (res.value > result.value || (res.value === result.value && res.depth < result.depth)) {
                        result = res;
                        result.bestMove = [y, x];
                        if (result.value >= beta) {
                            break;
                        }
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
            let blackMax = scoreComputer.getMaxScore(Color.BLACK);
            let whiteMax = scoreComputer.getMaxScore(Color.WHITE);

            if (whiteMax.value === 6
                || whiteMax.value === 5 && whiteMax.type === 'DeadFour') {
                result.value = Score.BLACK_LOSE;
                // todo 活四bestMove
                result.bestMove = whiteMax.candidates![0];
                return result;
            }
            if (blackMax.value === 6) {
                result.value = Score.BLACK_WIN;
                // todo 活四bestMove
                return result;
            }
            let killPoints: number[][] = [];
            if (blackMax.type === 'DeadFour') {
                killPoints = blackMax.candidates!;
            } else if (whiteMax.value === 5) {
                result.value = Score.BLACK_LOSE;
                result.bestMove = whiteMax.keyCandidates![0];
                return result;
            } else if (blackMax.value === 5) {
                killPoints = Object.keys(scoreComputer.black.killPoints)
                    .map(item => item.split(',').map(Number));
            }

            if (!killPoints.length && depth >= MAX_DEPTH) {
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

            if (killPoints.length) {
                for (let p of killPoints) {
                    let [y, x] = p;
                    board.downChess(y, x, Color.WHITE);
                    let isWin = scoreComputer.downChessFake(y, x, Color.WHITE);
                    if (isWin) {
                        board.restore(y, x);
                        scoreComputer.restore();
                        result.value = Score.BLACK_LOSE;
                        result.bestMove = [y, x];
                        return result;
                    }
                    let res = blackThink(depth + 1, [y, x], result.value, newObj);
                    board.restore(y, x);
                    scoreComputer.restore();
                    if (res.value < result.value || (res.value === result.value && res.depth < result.depth)) {
                        result = res;
                        result.bestMove = [y, x];
                        if (result.value <= alpha) {
                            break;
                        }
                    }
                }
            } else {
                for (let i in newObj) {
                    if (newObj[i] === false) {
                        continue;
                    }
                    let [y, x] = i.split(',').map(Number);
                    board.downChess(y, x, Color.WHITE);
                    let isWin = scoreComputer.downChessFake(y, x, Color.WHITE);
                    if (isWin) {
                        board.restore(y, x);
                        scoreComputer.restore();
                        result.value = Score.BLACK_LOSE;
                        result.bestMove = [y, x];
                        return result;
                    }
                    let res = blackThink(depth + 1, [y, x], result.value, newObj);
                    board.restore(y, x);
                    scoreComputer.restore();
                    if (res.value < result.value || (res.value === result.value && res.depth < result.depth)) {
                        result = res;
                        result.bestMove = [y, x];
                        if (result.value <= alpha) {
                            break;
                        }
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
    private initCandidates(board: Board) {
        const { map } = board;
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 15; x++) {
                if (map[y][x]) {
                    board.setCandidates(y, x, candidates);
                }
            }
        }
    }
}