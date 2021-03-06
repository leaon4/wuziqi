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
        public KILL_DEPTH = 1
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
            let {
                max: blackMax,
                total: blackTotal,
                killItems: blackKillItems
            } = scoreComputer.getTotalScore(Color.BLACK);
            let {
                max: whiteMax,
                total: whiteTotal,
                killItems: whiteKillItems
            } = scoreComputer.getTotalScore(Color.WHITE);


            if (depth >= MAX_DEPTH) {
                // 能直接判断输赢的分支其实都不存在，在剪枝里就处理了
                if (blackMax.type >= ChessType.DEAD_FOUR) {
                    result.value = Score.BLACK_WIN;
                    result.bestMove = blackMax.candidates![0];
                } else {
                    // 黑已有冲四           赢，和已有死四一样。
                    // 黑已有双活三         除非白有死四，否则赢，和已有活三一样，不用加分。
                    // 黑会有一个冲四       除非白有死四，否则赢，因此分值+死四的一半。
                    // 黑会同时有两个冲四   除非白有死四，否则赢，因此分值+活四。(太难判断了，先不做)
                    // 黑会有双活三         无法定输赢，分值+10**4*5（多加5个活二）

                    // 白已有冲四      除非黑有既能堵死四，又趁机形成自己的死四或活四的棋，否则输。不用加分了。
                    // 白已有双活三    除非自己更快（有死三以上），并且不能一个子堵俩，否则输。其实不用加分。
                    // 白会有冲四      除非自己更快，否则几乎是和死四一样的必防等级，因此分值+死四*0.8。
                    // 白会有双冲四    同上，因此不用特别处理
                    // 白会有双活三    无法定输赢，分值+10**4*5（多加3个活二）

                    let blackRushFourPoint = that.hasRushFour(blackMax, blackKillItems, Color.BLACK);
                    let whiteRushFourPoint = that.hasRushFour(whiteMax, whiteKillItems, Color.WHITE);
                    let blackDoubleThreePoint = that.hasDoubleThreePoint(blackMax, blackKillItems, Color.BLACK);
                    let whiteDoubleThreePoint = that.hasDoubleThreePoint(whiteMax, whiteKillItems, Color.WHITE);
                    if (blackRushFourPoint) {
                        blackTotal += 10 ** 6 / 2;
                    } else if (blackDoubleThreePoint) {
                        blackTotal += 10 ** 4 * 5;
                    }

                    if (blackMax.type < ChessType.DEAD_THREE
                        && that.alreadyHasRushFour(whiteMax, whiteKillItems, Color.WHITE)) {
                        result.value = Score.BLACK_LOSE;
                        result.bestMove = whiteMax.candidates![0];
                        return result;
                    } else if (whiteRushFourPoint) {
                        whiteTotal += 10 ** 6 * 0.8;
                    } else if (whiteDoubleThreePoint) {
                        whiteTotal += 10 ** 4 * 3;
                    }
                    result.value = blackTotal * 10 - whiteTotal;
                }
                return result;
            }

            result.value = Score.BLACK_LOSE;
            let newObj = Object.create(obj);
            board.setCandidates(lastMove[0], lastMove[1], newObj);

            const toTraversePoints = getToTraversePoints([], newObj);
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
                    result.value = res.value;
                    result.depth = res.depth;
                    result.bestMove = [y, x];
                    if (result.value >= beta) {
                        break;
                    }
                } else if (!result.bestMove.length) {
                    result.bestMove = res.bestMove;
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

            let {
                max: blackMax,
                total: blackTotal,
                killItems: blackKillItems
            } = scoreComputer.getTotalScore(Color.BLACK);
            let {
                max: whiteMax,
                total: whiteTotal,
                killItems: whiteKillItems
            } = scoreComputer.getTotalScore(Color.WHITE);


            if (depth >= MAX_DEPTH) {
                if (whiteMax.type >= ChessType.DEAD_FOUR) {
                    result.value = Score.BLACK_LOSE;
                    result.bestMove = whiteMax.candidates![0];
                } else {
                    let blackRushFourPoint = that.hasRushFour(blackMax, blackKillItems, Color.BLACK);
                    let whiteRushFourPoint = that.hasRushFour(whiteMax, whiteKillItems, Color.WHITE);
                    let blackDoubleThreePoint = that.hasDoubleThreePoint(blackMax, blackKillItems, Color.BLACK);
                    let whiteDoubleThreePoint = that.hasDoubleThreePoint(whiteMax, whiteKillItems, Color.WHITE);
                    if (whiteRushFourPoint) {
                        whiteTotal += 10 ** 6 / 2;
                    } else if (whiteDoubleThreePoint) {
                        whiteTotal += 10 ** 4 * 5;
                    }

                    if (whiteMax.type < ChessType.DEAD_THREE &&
                        that.alreadyHasRushFour(blackMax, blackKillItems, Color.BLACK)) {
                        result.value = Score.BLACK_WIN;
                        result.bestMove = blackMax.candidates![0];
                        return result;
                    } else if (blackRushFourPoint) {
                        blackTotal += 10 ** 6 * 0.8;
                    } else if (blackDoubleThreePoint) {
                        blackTotal += 10 ** 4 * 3;
                    }
                    let val = whiteTotal < 1000 ? 0 : whiteTotal;
                    result.value = blackTotal - val * 10;
                }
                // if (result.value===919957){
                //     debugger
                // }
                return result;
            }

            result.value = Score.BLACK_WIN;
            let newObj = Object.create(obj);
            board.setCandidates(lastMove[0], lastMove[1], newObj);

            const toTraversePoints = getToTraversePoints([], newObj);
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
                    result.value = res.value;
                    result.depth = res.depth;
                    result.bestMove = [y, x];
                    if (result.value <= alpha) {
                        break;
                    }
                } else if (!result.bestMove.length) {
                    result.bestMove = res.bestMove;
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
    private alreadyHasRushFour(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color
    ) {
        // 只要有双死四，死四活三存在，并且不能被一个子全堵上，为true;
        if (max.type < ChessType.DEAD_FOUR) {
            return false;
        }
        let deadFourItems = killItems[ChessType.DEAD_FOUR];
        let aliveThreeItems = killItems[ChessType.ALIVE_THREE];
        if (deadFourItems.length + aliveThreeItems.length < 2) {
            return false;
        }
        for (let i = 0; i < deadFourItems.length; i++) {
            let d4i = deadFourItems[i];
            for (let j = 0; j < deadFourItems.length; j++) {
                if (i === j) {
                    continue;
                }
                let d4j = deadFourItems[j];
                if (hasKillPoint(d4i, d4j)) {
                    return true;
                }
            }
            for (let j = 0; j < aliveThreeItems.length; j++) {
                let a3 = aliveThreeItems[j];
                if (hasKillPoint(d4i, a3)) {
                    return true;
                }
            }
        }
        function hasKillPoint(d4: BookkeepingItem, a3: BookkeepingItem): boolean {
            let keyPoint = d4.candidates![0];
            return a3.candidates!.every(p => {
                return p[0] !== keyPoint[0] || p[1] !== keyPoint[1];
            });
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