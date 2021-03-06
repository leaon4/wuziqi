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
        public MAX_DEPTH = 4,
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


            if (depth >= MAX_DEPTH) {
                if (blackMax.type >= ChessType.DEAD_FOUR) {
                    result.value = Score.BLACK_WIN;
                    result.bestMove = blackMax.candidates![0];
                } else {
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
                    result = res;
                    if (result.value !== Score.BLACK_WIN){
                        result.bestMove = [y, x];
                    }
                    if (result.value >= beta) {
                        break;
                    }
                } else if (res.value === result.value && !result.bestMove.length) {
                    // result.bestMove = [y, x];
                    result.bestMove = res.bestMove;

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


            if (depth >= MAX_DEPTH) {
                if (whiteMax.type >= ChessType.DEAD_FOUR) {
                    result.value = Score.BLACK_LOSE;
                    result.bestMove = whiteMax.candidates![0];
                } else {
                    let val = whiteTotal < 1000 ? 0 : whiteTotal;
                    result.value = blackTotal - val * 10;
                }
                return result;
            }

            result.value = Score.BLACK_WIN;
            let newObj = Object.create(obj);
            board.setCandidates(lastMove[0], lastMove[1], newObj);

            const toTraversePoints = getToTraversePoints([], newObj);
            for (let p of toTraversePoints) {
                let [y, x] = p;
                if (y === 5 && x === 9) {
                    // debugger
                }
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
                    if (result.value !== Score.BLACK_LOSE){
                        result.bestMove = [y, x];
                    }
                    if (result.value <= alpha) {
                        break;
                    }
                } else if (res.value === result.value && !result.bestMove.length) {
                    // result.bestMove = [y, x];
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