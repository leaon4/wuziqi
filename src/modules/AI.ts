import Board from "./board";
import { Color, Score, Rec, ChessType } from "./definition";
import ScoreComputer, { BookkeepingItem } from "./score";

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
        readonly MAX_DEPTH = 1,
        readonly KILL_DEPTH = 4
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
        const { board, MAX_DEPTH, KILL_DEPTH, scoreComputer, getKillPoints } = this;
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
            const {
                max: blackMax,
                total: blackTotal,
                killItems: blackKillItems
            } = scoreComputer.getMaxScore(Color.BLACK);
            const {
                max: whiteMax,
                total: whiteTotal,
                killItems: whiteKillItems
            } = scoreComputer.getMaxScore(Color.WHITE);

            if (blackMax.type === ChessType.ALIVE_FOUR
                || blackMax.type === ChessType.DEAD_FOUR) {
                // 黑子先手有四连的，必赢
                result.value = Score.BLACK_WIN;
                result.bestMove = blackMax.candidates![0];
                return result;
            }
            if (whiteMax.type === ChessType.ALIVE_FOUR) {
                // 白子有活四，黑子无四连，则必输
                result.value = Score.BLACK_LOSE;
                result.bestMove = whiteMax.candidates![0];
                return result;
            }
            let killPoints: number[][] = [];
            if (whiteMax.type === ChessType.DEAD_FOUR) {
                // 白子有死四，这时只能先阻挡
                killPoints = whiteMax.candidates!;
            } else if (blackMax.type === ChessType.ALIVE_THREE) {
                // 黑子活三，且黑子先走，且白子已经没有死四，黑子必赢
                result.value = Score.BLACK_WIN;
                result.bestMove = blackMax.keyCandidates![0];
                return result;
            } else if (whiteMax.type === ChessType.ALIVE_THREE) {
                // 白子活三，黑子只能走自己的死三或堵
                killPoints = [
                    ...getKillPoints(blackKillItems[ChessType.DEAD_THREE]),
                    ...getKillPoints(whiteKillItems[ChessType.ALIVE_THREE])
                ];
            }

            if (!killPoints.length && depth >= MAX_DEPTH || depth >= KILL_DEPTH) {
                result.value = blackTotal * 10 - whiteTotal;
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

            const {
                max: blackMax,
                total: blackTotal,
                killItems: blackKillItems
            } = scoreComputer.getMaxScore(Color.BLACK);
            const {
                max: whiteMax,
                total: whiteTotal,
                killItems: whiteKillItems
            } = scoreComputer.getMaxScore(Color.WHITE);

            if (whiteMax.type === ChessType.ALIVE_FOUR
                || whiteMax.type === ChessType.DEAD_FOUR) {
                result.value = Score.BLACK_LOSE;
                result.bestMove = whiteMax.candidates![0];
                return result;
            }
            if (blackMax.type === ChessType.ALIVE_FOUR) {
                result.value = Score.BLACK_WIN;
                result.bestMove = blackMax.candidates![0];
                return result;
            }
            let killPoints: number[][] = [];
            if (blackMax.type === ChessType.DEAD_FOUR) {
                killPoints = blackMax.candidates!;
            } else if (whiteMax.type === ChessType.ALIVE_THREE) {
                result.value = Score.BLACK_LOSE;
                result.bestMove = whiteMax.keyCandidates![0];
                return result;
            } else if (blackMax.type === ChessType.ALIVE_THREE) {
                killPoints = [
                    ...getKillPoints(whiteKillItems[ChessType.DEAD_THREE]),
                    ...getKillPoints(blackKillItems[ChessType.ALIVE_THREE])
                ];
            }
            if (!killPoints.length && depth >= MAX_DEPTH || depth >= KILL_DEPTH) {
                result.value = blackTotal - whiteTotal * 10;
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
    private getKillPoints(items: BookkeepingItem[]): number[][] {
        if (!items.length) {
            return [];
        }
        if (items.length === 1) {
            return items[0].candidates!
        }
        let set = new Set<string>();
        items.forEach(item => {
            item.candidates!.forEach(p => {
                set.add(p.join(','));
            });
        });
        return [...set].map(item => item.split(',').map(Number));
    }
}