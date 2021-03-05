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
        public MAX_DEPTH = 3,
        public KILL_DEPTH = 8
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
        const {
            board,
            MAX_DEPTH, KILL_DEPTH,
            scoreComputer,
            getKillPoints,
            getToTraversePoints,
        } = this;
        const that = this;
        board.setCandidates(y, x, candidates);
        const result = whiteThink(0, [y, x], Score.BLACK_LOSE, candidates);
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
            } = scoreComputer.getTotalScore(Color.BLACK);
            const {
                max: whiteMax,
                total: whiteTotal,
                killItems: whiteKillItems
            } = scoreComputer.getTotalScore(Color.WHITE);

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
            } else {
                // 先检查有无冲四的可能
                let blackRushFourPoint = that.hasRushFour(blackMax, blackKillItems, Color.BLACK);
                if (blackRushFourPoint) {
                    result.value = Score.BLACK_WIN;
                    result.bestMove = blackRushFourPoint;
                    return result;
                }
                if (whiteMax.type === ChessType.ALIVE_THREE) {
                    if (!whiteMax.candidates) {
                        console.error('whiteMax.candidates is empty')
                    }
                    // 白子活三，黑子只能走自己的死三或堵
                    // todo 这种写法会有重复点，下面也相同，需要处理
                    killPoints = [
                        ...getKillPoints(blackKillItems[ChessType.DEAD_THREE]),
                        ...getKillPoints(whiteKillItems[ChessType.ALIVE_THREE])
                    ];
                } else if (whiteMax.type === ChessType.DEAD_THREE) {
                    // 检查白子有无冲四的可能
                    let whiteRushFourPoint = that.hasRushFour(whiteMax, whiteKillItems, Color.WHITE);
                    if (whiteRushFourPoint) {
                        // 如果有，黑子只能走自己的死三或堵
                        killPoints = [
                            ...getKillPoints(blackKillItems[ChessType.DEAD_THREE]),
                            whiteRushFourPoint
                        ];
                    }
                } else {
                    // 只有白子没有死三时，黑子双三才必赢，否则只能在全量计算中优先计算。
                    // 因此先只考虑黑子没有死三时的双三情况
                    if (blackKillItems[ChessType.ALIVE_TWO].length > 1) {
                        let blackDoubleThreePoint = that.hasDoubleThreePoint(blackMax, blackKillItems, Color.BLACK);
                        if (blackDoubleThreePoint) {
                            result.value = Score.BLACK_WIN;
                            result.bestMove = blackDoubleThreePoint;
                            return result;
                        }
                    }
                    // 同理，如果黑子没有死三和活二，则必防白子双三。
                    // 否则，则能下的点只有黑子的死三，活二和堵。
                    // todo 这里偷了懒，堵的点不精确，笼统的把白子活二堵点全部拿进去了
                    let whiteDoubleThreePoint = that.hasDoubleThreePoint(whiteMax, whiteKillItems, Color.WHITE);
                    if (whiteDoubleThreePoint) {
                        killPoints = [
                            ...getKillPoints(blackKillItems[ChessType.DEAD_THREE]),
                            ...getKillPoints(blackKillItems[ChessType.ALIVE_TWO]),
                            ...getKillPoints(whiteKillItems[ChessType.ALIVE_TWO]),
                        ];
                    }
                }
            }

            // todo 应该再具体区分killPoints，比如如果只有一个的情况
            if (!killPoints.length && depth >= MAX_DEPTH || depth >= KILL_DEPTH) {
                result.value = blackTotal * 10 - whiteTotal;
                return result;
            }

            result.value = Score.BLACK_LOSE;
            let newObj = Object.create(obj);
            board.setCandidates(lastMove[0], lastMove[1], newObj);

            const toTraversePoints = getToTraversePoints(killPoints, newObj);
            for (let p of toTraversePoints) {
                let [y, x] = p;
                board.downChess(y, x, Color.BLACK);
                let maxType = scoreComputer.downChessFake(y, x, Color.BLACK);
                if (maxType === ChessType.FIVE) {
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
                } else if (res.value === result.value && !result.bestMove.length) {
                    // result.bestMove = res.bestMove;
                    result.bestMove = [y, x];
                    // tothink
                    // 这里如果res.value === BLACK_LOSE，好像可以跳出break
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
            } = scoreComputer.getTotalScore(Color.BLACK);
            const {
                max: whiteMax,
                total: whiteTotal,
                killItems: whiteKillItems
            } = scoreComputer.getTotalScore(Color.WHITE);

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
            } else {
                let whiteRushFourPoint = that.hasRushFour(whiteMax, whiteKillItems, Color.WHITE);
                if (whiteRushFourPoint) {
                    result.value = Score.BLACK_LOSE;
                    result.bestMove = whiteRushFourPoint;
                    return result;
                }
                if (blackMax.type === ChessType.ALIVE_THREE) {
                    if (!blackMax.candidates) {
                        console.error('blackMax.candidates is empty')
                    }
                    killPoints = [
                        ...getKillPoints(whiteKillItems[ChessType.DEAD_THREE]),
                        ...getKillPoints(blackKillItems[ChessType.ALIVE_THREE])
                    ];
                } else if (blackMax.type === ChessType.DEAD_THREE) {
                    let blackRushFourPoint = that.hasRushFour(blackMax, blackKillItems, Color.BLACK);
                    if (blackRushFourPoint) {
                        killPoints = [
                            ...getKillPoints(whiteKillItems[ChessType.DEAD_THREE]),
                            blackRushFourPoint
                        ];
                    }
                } else {
                    if (whiteKillItems[ChessType.ALIVE_TWO].length > 1) {
                        let whiteDoubleThreePoint = that.hasDoubleThreePoint(whiteMax, whiteKillItems, Color.WHITE);
                        if (whiteDoubleThreePoint) {
                            result.value = Score.BLACK_LOSE;
                            result.bestMove = whiteDoubleThreePoint;
                            return result;
                        }
                    }
                    let blackDoubleThreePoint = that.hasDoubleThreePoint(blackMax, blackKillItems, Color.BLACK);
                    if (blackDoubleThreePoint) {
                        killPoints = [
                            ...getKillPoints(whiteKillItems[ChessType.DEAD_THREE]),
                            ...getKillPoints(whiteKillItems[ChessType.ALIVE_TWO]),
                            ...getKillPoints(blackKillItems[ChessType.ALIVE_TWO]),
                        ];
                    }
                }
            }

            if (!killPoints.length && depth >= MAX_DEPTH || depth >= KILL_DEPTH) {
                result.value = blackTotal - whiteTotal * 10;
                return result;
            }

            result.value = Score.BLACK_WIN;
            let newObj = Object.create(obj);
            board.setCandidates(lastMove[0], lastMove[1], newObj);

            const toTraversePoints = getToTraversePoints(killPoints, newObj);
            for (let p of toTraversePoints) {
                let [y, x] = p;
                board.downChess(y, x, Color.WHITE);
                let maxType = scoreComputer.downChessFake(y, x, Color.WHITE);
                if (maxType === ChessType.FIVE) {
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
                } else if (res.value === result.value && !result.bestMove.length) {
                    result.bestMove = [y, x];
                    // result.bestMove = res.bestMove;
                }
            }
            return result;
        }
    }
    private hasRushFour(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color
    ): number[] | undefined {
        if (max.type !== ChessType.DEAD_THREE) {
            return;
        }
        let deadThreeItems = killItems[ChessType.DEAD_THREE];
        if (deadThreeItems.length > 1) {
            let uniqObj: Rec = {};
            for (let i = 0; i < deadThreeItems.length; i++) {
                let item = deadThreeItems[i];
                for (let j = 0; j < item.candidates!.length; j++) {
                    let candidate = item.candidates![j];
                    let key = candidate.join(',');
                    if (uniqObj[key]) {
                        return candidate;
                    }
                    uniqObj[key] = true;
                }
            }
        }
        const { board, scoreComputer } = this;
        let aliveTwoItems = killItems[ChessType.ALIVE_TWO];
        let oppsiteColor = color === Color.BLACK ? Color.WHITE : Color.BLACK;
        // todo，这里复杂度过高，应该是能优化的
        if (aliveTwoItems.length) {
            for (let i = 0; i < deadThreeItems.length; i++) {
                let d3 = deadThreeItems[i];
                let p0 = d3.candidates![0];
                let p1 = d3.candidates![1];
                for (let j = 0; j < aliveTwoItems.length; j++) {
                    let a2 = aliveTwoItems[j];
                    for (let k = 0; k < a2.candidates!.length; k++) {
                        let p2 = a2.candidates![k];
                        if (isSamePoint(p0, p2) && checkAnotherPoint(p1[0], p1[1], oppsiteColor)) {
                            return p2;
                        }
                        if (isSamePoint(p1, p2) && checkAnotherPoint(p0[0], p0[1], oppsiteColor)) {
                            return p2;
                        }
                    }
                }
            }
        }
        function isSamePoint(p1: number[], p2: number[]) {
            return p1[0] === p2[0] && p1[1] === p2[1];
        }
        function checkAnotherPoint(y: number, x: number, color: Color) {
            board.downChess(y, x, color);
            let maxType = scoreComputer.downChessFake(y, x, color);
            board.restore(y, x);
            scoreComputer.restore();
            return maxType < ChessType.DEAD_FOUR;
        }
    }
    private hasDoubleThreePoint(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color
    ): number[] | undefined {
        // 这里用小于，因为max.type有可能为DEAD_THREE，仍有可能是双三。
        if (max.type < ChessType.ALIVE_TWO) {
            return;
        }
        let aliveTwoItems = killItems[ChessType.ALIVE_TWO];
        if (aliveTwoItems.length > 1) {
            let uniqObj: Rec = {};
            for (let i = 0; i < aliveTwoItems.length; i++) {
                let item = aliveTwoItems[i];
                for (let j = 0; j < item.candidates!.length; j++) {
                    let candidate = item.candidates![j];
                    let key = candidate.join(',');
                    if (uniqObj[key]) {
                        return candidate;
                    }
                    uniqObj[key] = true;
                }
            }
        }
    }
    private getToTraversePoints(killPoints: number[][], candidates: any) {
        if (killPoints.length) {
            return killPoints;
        }
        let points = [];
        for (let i in candidates) {
            if (candidates[i] === false) {
                continue;
            }
            points.push(i.split(',').map(Number));
        }
        return points;
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