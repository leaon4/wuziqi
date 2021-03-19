import Board from "./board";
import { Color, Score, Rec, ChessType } from "./definition";
import ScoreComputer, { BookkeepingItem } from "./score";
import Zobrist from './zobrist';

export type Result = {
    value: Score,
    bestMove: number[],
    depth: number,
    path: string[]
};

export default class AI {
    zobrist = undefined as unknown as Zobrist;
    candidatesMap: boolean[][] = [];
    constructor(
        public board: Board,
        public scoreComputer: ScoreComputer,
        public MAX_DEPTH = 6,
        public KILL_DEPTH = 6,
        public zobristOpen = false
    ) {
        this.reset();
        if (this.zobristOpen) {
            this.zobrist = new Zobrist();
            (window as any).zobrist = this.zobrist;
        }
    }
    reset() {
        this.candidatesMap = this.createCandidatesMap();
        if (this.board.hasInitialMap) {
            this.initCandidates(this.board);
        }
    }
    private createCandidatesMap() {
        let map = []
        for (let i = 0; i < 255; i++) {
            map[i] = [false];
        }
        return map;
    }
    think(y: number, x: number, humanColor: Color) {
        if (this.zobristOpen) {
            this.zobrist.cache = {};
        }
        let count = 0;
        const {
            candidatesMap,
            board,
            MAX_DEPTH,
            KILL_DEPTH,
            scoreComputer,
            zobrist
        } = this;
        const that = this;
        // y为-1代表无初始子，也就是让电脑执黑先走的情况
        if (y > -1) {
            board.setCandidates(y, x, candidatesMap);
        }
        const result = humanColor === Color.BLACK
            ? whiteThink(0, [y, x], Score.BLACK_LOSE, candidatesMap, [])
            : blackThink(0, [y, x], Score.BLACK_WIN, candidatesMap, []);
        // const result = findShortestResult();
        board.setCandidates(result.bestMove[0], result.bestMove[1], candidatesMap);
        console.log('count: ', count)
        return result;

        function findShortestResult(): Result {
            if (humanColor === Color.BLACK) {
                /* let result = whiteThink(0, [y, x], Score.BLACK_LOSE, candidates, []);
                if (result.value === Score.BLACK_LOSE) {
                    result = whiteThink(0, [y, x], Score.BLACK_LOSE - 1, candidates, []);
                }
                return result; */

                // 此算法不完美，因为第一次的全深度搜索，仍可能找到最短路径的胜利方法
                // 有bug，因为killDepth还可能有延伸
                let lastResult;
                for (let depth = 0; depth < KILL_DEPTH; depth++) {
                    const result = whiteThink(depth, [y, x], Score.BLACK_LOSE, candidatesMap, []);
                    if (result.value !== Score.BLACK_LOSE) {
                        return lastResult || result;
                    }
                    lastResult = result;
                }
                return lastResult as Result;
            } else {
                /* let result = blackThink(0, [y, x], Score.BLACK_WIN, candidates, []);
                if (result.value === Score.BLACK_WIN) {
                    result = blackThink(0, [y, x], Score.BLACK_WIN + 1, candidates, []);
                }
                return result; */

                let lastResult;
                for (let depth = 0; depth < KILL_DEPTH; depth++) {
                    const result = blackThink(depth, [y, x], Score.BLACK_WIN, candidatesMap, []);
                    if (result.value !== Score.BLACK_WIN) {
                        return lastResult || result;
                    }
                    lastResult = result;
                }
                return lastResult as Result;
            }
        }

        function blackThink(depth: number, lastMove: number[], beta: number, obj: boolean[][], path: string[]): Result {
            path.push(lastMove.join(','))
            count++
            let result: Result = {
                value: Score.DRAW,
                bestMove: [],
                depth,
                path: path.slice()
            };
            if (board.isFull()) {
                return result;
            }
            if (that.zobristOpen) {
                if (zobrist.has(lastMove[0], lastMove[1], Color.WHITE)) {
                    return zobrist.get(lastMove[0], lastMove[1], Color.WHITE);
                }
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

            if (blackMax.type >= ChessType.DEAD_FOUR) {
                // 黑子先手有四连的，必赢
                result.value = Score.BLACK_WIN;
                result.bestMove = blackMax.degradeCandidates![0];
                return result;
            }
            if (whiteMax.type === ChessType.ALIVE_FOUR) {
                // 白子有活四，黑子无四连，则必输
                result.value = Score.BLACK_LOSE;
                result.bestMove = whiteMax.degradeCandidates![0];
                return result;
            }

            let blackRushFourPoint: number[] | undefined;
            let whiteRushFourPoint: number[] | undefined;
            let blackDoubleThreePoint: number[] | undefined;
            let whiteDoubleThreePoint: number[] | undefined;
            let killPoints: number[][] = [];
            if (whiteMax.type === ChessType.DEAD_FOUR) {
                // 白已有冲四，除非黑有既能堵死四，又趁机形成自己的死四或活四的棋，否则输。
                // todo 偷懒省略了"既能堵死四，又能趁机形成自己的死四或活四"
                // 而简单以blackMax.type < ChessType.DEAD_THREE来判断了
                if (blackMax.type < ChessType.DEAD_THREE
                    && that.alreadyHasRushFour(whiteMax, whiteKillItems, Color.WHITE)) {
                    result.value = Score.BLACK_LOSE;
                    result.bestMove = whiteMax.degradeCandidates![0];
                    return result;
                }
                // 快速退出
                if (depth === 0) {
                    result.bestMove = whiteMax.degradeCandidates![0];
                    return result;
                }
                // 白子有死四，这时只能先阻挡
                killPoints = whiteMax.degradeCandidates!;
            } else if (blackMax.type === ChessType.ALIVE_THREE) {
                // 黑子活三，且黑子先走，且白子已经没有死四，黑子必赢
                result.value = Score.BLACK_WIN;
                result.bestMove = blackMax.upgradeCandidates![0];
                return result;
            } else {
                // 先检查有无冲四的可能
                blackRushFourPoint = that.hasRushFour(blackMax, blackKillItems, Color.BLACK);
                if (blackRushFourPoint.length) {
                    result.value = Score.BLACK_WIN;
                    result.bestMove = blackRushFourPoint;
                    return result;
                }
                if (whiteMax.type === ChessType.ALIVE_THREE) {
                    if (!whiteMax.degradeCandidates) {
                        // todo 这里已经赢了。但平时这种情况应该是不会出现的
                        console.error('whiteMax.candidates is empty')
                    }
                    // 白子活三，黑子只能走自己的死三或堵
                    killPoints = that.unionPoints({
                        itemGroup: [
                            blackKillItems[ChessType.DEAD_THREE],
                            whiteKillItems[ChessType.ALIVE_THREE]
                        ]
                    });
                } else if (whiteMax.type === ChessType.DEAD_THREE) {
                    // 检查白子有无冲四的可能
                    whiteRushFourPoint = that.hasRushFour(whiteMax, whiteKillItems, Color.WHITE);
                    if (whiteRushFourPoint.length) {
                        // 如果有，黑子只能走自己的死三或堵
                        // 堵不一定非要堵whiteRushFourPoint，只要把任意一个位置堵了，仍有机会
                        // 但一定要去堵造成whiteRushFourPoint的两个code，这里偷懒省略了
                        // 将所有堵点全放了进去
                        killPoints = that.unionPoints({
                            point: whiteRushFourPoint,
                            itemGroup: [
                                blackKillItems[ChessType.DEAD_THREE],
                                whiteKillItems[ChessType.DEAD_THREE],
                                whiteKillItems[ChessType.ALIVE_TWO]
                            ]
                        });
                    }
                } else {
                    // 只有白子没有死三时，黑子双三才必赢，否则只能在全量计算中优先计算。
                    // 因此先只考虑白子没有死三时的双三情况（else这里就是了）
                    if (blackKillItems[ChessType.ALIVE_TWO].length > 1) {
                        blackDoubleThreePoint = that.hasDoubleThreePoint(blackMax, blackKillItems, Color.BLACK);
                        if (blackDoubleThreePoint.length) {
                            result.value = Score.BLACK_WIN;
                            result.bestMove = blackDoubleThreePoint;
                            return result;
                        }
                    }
                    // 同理，如果黑子没有死三和活二，则必防白子双三。
                    // 否则，则能下的点只有黑子的死三，活二和堵。
                    // todo 这里偷了懒，堵的点不精确，笼统的把白子活二堵点全部拿进去了
                    whiteDoubleThreePoint = that.hasDoubleThreePoint(whiteMax, whiteKillItems, Color.WHITE);
                    if (whiteDoubleThreePoint.length) {
                        killPoints = that.unionPoints({
                            point: whiteDoubleThreePoint,
                            itemGroup: [
                                blackKillItems[ChessType.DEAD_THREE],
                                whiteKillItems[ChessType.ALIVE_TWO]
                            ],
                            useUpgradeCandidates: blackKillItems[ChessType.ALIVE_TWO],
                        });
                    }
                }
            }

            // todo 应该再具体区分killPoints，比如如果只有一个的情况
            if (!killPoints.length && depth >= MAX_DEPTH || depth >= KILL_DEPTH) {
                // 黑已有冲四           赢，和已有死四一样。
                // 黑已有双活三         除非白有死四，否则赢，和已有活三一样，不用加分。
                // 黑会有一个冲四       除非白有死四，否则赢，因此分值+死四的一半。
                // 黑会同时有两个冲四    除非白有死四，否则赢，因此分值+活四。(太难判断了，先不做)
                // 黑会有双活三         无法定输赢，分值+10**4*5（多加5个活二）

                // 白已有冲四           除非黑有既能堵死四，又趁机形成自己的死四或活四的棋，否则输。不用加分了。
                // 白已有双活三         除非自己更快（有死三以上），并且不能一个子堵俩，否则输。其实不用加分。
                // 白会有冲四           除非自己更快，否则几乎是和死四一样的必防等级，因此分值+死四*0.8。
                // 白会有双冲四         同上，因此不用特别处理
                // 白会有双活三         无法定输赢，分值+10**4*5（多加3个活二）

                blackRushFourPoint = blackRushFourPoint || that.hasRushFour(blackMax, blackKillItems, Color.BLACK);
                whiteRushFourPoint = whiteRushFourPoint || that.hasRushFour(whiteMax, whiteKillItems, Color.WHITE);
                blackDoubleThreePoint = blackDoubleThreePoint || that.hasDoubleThreePoint(blackMax, blackKillItems, Color.BLACK);
                whiteDoubleThreePoint = whiteDoubleThreePoint || that.hasDoubleThreePoint(whiteMax, whiteKillItems, Color.WHITE);

                if (blackRushFourPoint.length) {
                    blackTotal += 10 ** 6 / 2;
                } else if (blackDoubleThreePoint.length) {
                    blackTotal += 10 ** 4 * 5;
                }

                if (whiteRushFourPoint.length) {
                    whiteTotal += 10 ** 6 * 0.8;
                } else if (whiteDoubleThreePoint.length) {
                    whiteTotal += 10 ** 4 * 3;
                }
                result.value = blackTotal * 10 - whiteTotal;
                return result;
            }

            result.value = Score.BLACK_LOSE;

            const toTraversePoints = that.getToTraversePoints(killPoints, obj, blackKillItems, whiteKillItems);
            for (let p of toTraversePoints) {
                let [y, x] = p;
                board.downChess(y, x, Color.BLACK);
                let maxType = scoreComputer.downChessFake(y, x, Color.BLACK);
                if (that.zobristOpen) {
                    zobrist.go(y, x, Color.BLACK);
                }
                if (maxType === ChessType.FIVE) {
                    result.value = Score.BLACK_WIN;
                    result.bestMove = [y, x];
                    board.restore(y, x);
                    scoreComputer.restore();
                    if (that.zobristOpen) {
                        zobrist.back(y, x, Color.BLACK);
                    }
                    return result;
                }
                board.setCandidatesFack(y, x, obj);
                let res = whiteThink(depth + 1, [y, x], result.value, obj, path);
                path.pop();
                board.restore(y, x);
                scoreComputer.restore();
                board.restoreCandidates(y, x, obj);
                if (that.zobristOpen) {
                    zobrist.back(y, x, Color.BLACK);
                }
                // todo 这个depth没有意义了。只有在非黑赢时，value相等，才会更新，但非赢点的depth更新没有意义
                if (res.value > result.value || (depth === 0 && res.value === result.value && res.depth < result.depth)) {
                    result.value = res.value;
                    result.depth = res.depth;
                    result.bestMove = [y, x];
                    result.path = res.path;
                    if (result.value >= beta) {
                        if (depth === 0 && result.value === Score.BLACK_WIN) {

                        } else {
                            return result;
                        }
                    }
                } else if (!result.bestMove.length) {
                    if (res.value === Score.BLACK_LOSE) {
                        // result.bestMove = res.bestMove;
                        result.bestMove = [y, x];
                    } else {
                        result.bestMove = res.bestMove;
                    }
                    result.depth = res.depth;
                    result.path = res.path;
                }
            }
            if (that.zobristOpen) {
                zobrist.set(result);
            }
            return result;
        }
        function whiteThink(depth: number, lastMove: number[], alpha: number, obj: boolean[][], path: string[]): Result {
            path.push(lastMove.join(','))
            count++
            let result: Result = {
                value: Score.DRAW,
                bestMove: [],
                depth,
                path: path.slice()
            };
            if (board.isFull()) {
                return result;
            }

            if (that.zobristOpen) {
                if (zobrist.has(lastMove[0], lastMove[1], Color.BLACK)) {
                    return zobrist.get(lastMove[0], lastMove[1], Color.BLACK);
                }
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

            if (whiteMax.type >= ChessType.DEAD_FOUR) {
                result.value = Score.BLACK_LOSE;
                result.bestMove = whiteMax.degradeCandidates![0];
                return result;
            }
            if (blackMax.type === ChessType.ALIVE_FOUR) {
                result.value = Score.BLACK_WIN;
                result.bestMove = blackMax.degradeCandidates![0];
                return result;
            }

            let blackRushFourPoint: number[] | undefined;
            let whiteRushFourPoint: number[] | undefined;
            let blackDoubleThreePoint: number[] | undefined;
            let whiteDoubleThreePoint: number[] | undefined;
            let killPoints: number[][] = [];

            if (blackMax.type === ChessType.DEAD_FOUR) {
                if (whiteMax.type < ChessType.DEAD_THREE
                    && that.alreadyHasRushFour(blackMax, blackKillItems, Color.BLACK)) {
                    result.value = Score.BLACK_WIN;
                    result.bestMove = blackMax.degradeCandidates![0];
                    return result;
                }
                // 快速退出
                if (depth === 0) {
                    result.bestMove = blackMax.degradeCandidates![0];
                    return result;
                }
                killPoints = blackMax.degradeCandidates!;
            } else if (whiteMax.type === ChessType.ALIVE_THREE) {
                result.value = Score.BLACK_LOSE;
                result.bestMove = whiteMax.upgradeCandidates![0];
                return result;
            } else {
                whiteRushFourPoint = that.hasRushFour(whiteMax, whiteKillItems, Color.WHITE);
                if (whiteRushFourPoint.length) {
                    result.value = Score.BLACK_LOSE;
                    result.bestMove = whiteRushFourPoint;
                    return result;
                }
                if (blackMax.type === ChessType.ALIVE_THREE) {
                    if (!blackMax.degradeCandidates) {
                        console.error('blackMax.candidates is empty')
                    }
                    killPoints = that.unionPoints({
                        itemGroup: [
                            whiteKillItems[ChessType.DEAD_THREE],
                            blackKillItems[ChessType.ALIVE_THREE]
                        ],
                    });
                } else if (blackMax.type === ChessType.DEAD_THREE) {
                    blackRushFourPoint = that.hasRushFour(blackMax, blackKillItems, Color.BLACK);
                    if (blackRushFourPoint.length) {
                        killPoints = that.unionPoints({
                            point: blackRushFourPoint,
                            itemGroup: [
                                whiteKillItems[ChessType.DEAD_THREE],
                                blackKillItems[ChessType.DEAD_THREE],
                                blackKillItems[ChessType.ALIVE_TWO]
                            ]
                        });
                    }
                } else {
                    if (whiteKillItems[ChessType.ALIVE_TWO].length > 1) {
                        whiteDoubleThreePoint = that.hasDoubleThreePoint(whiteMax, whiteKillItems, Color.WHITE);
                        if (whiteDoubleThreePoint.length) {
                            result.value = Score.BLACK_LOSE;
                            result.bestMove = whiteDoubleThreePoint;
                            return result;
                        }
                    }
                    blackDoubleThreePoint = that.hasDoubleThreePoint(blackMax, blackKillItems, Color.BLACK);
                    if (blackDoubleThreePoint.length) {
                        killPoints = that.unionPoints({
                            point: blackDoubleThreePoint,
                            itemGroup: [
                                whiteKillItems[ChessType.DEAD_THREE],
                                blackKillItems[ChessType.ALIVE_TWO]
                            ],
                            useUpgradeCandidates: whiteKillItems[ChessType.ALIVE_TWO],
                        });
                    }
                }
            }

            if (!killPoints.length && depth >= MAX_DEPTH || depth >= KILL_DEPTH) {
                blackRushFourPoint = blackRushFourPoint || that.hasRushFour(blackMax, blackKillItems, Color.BLACK);
                whiteRushFourPoint = whiteRushFourPoint || that.hasRushFour(whiteMax, whiteKillItems, Color.WHITE);
                blackDoubleThreePoint = blackDoubleThreePoint || that.hasDoubleThreePoint(blackMax, blackKillItems, Color.BLACK);
                whiteDoubleThreePoint = whiteDoubleThreePoint || that.hasDoubleThreePoint(whiteMax, whiteKillItems, Color.WHITE);

                if (whiteRushFourPoint.length) {
                    whiteTotal += 10 ** 6 / 2;
                } else if (whiteDoubleThreePoint.length) {
                    whiteTotal += 10 ** 4 * 5;
                }

                if (blackRushFourPoint.length) {
                    blackTotal += 10 ** 6 * 0.8;
                } else if (blackDoubleThreePoint.length) {
                    blackTotal += 10 ** 4 * 3;
                }

                if (whiteTotal < 1000) {
                    // 为了开局时能近身防守
                    whiteTotal = 0;
                } else if (whiteTotal < 30000) {
                    // 开局时白棋应以防守为主，以免局势因冒进而迅速恶化
                    whiteTotal *= 5;
                } else {
                    whiteTotal *= 10;
                }
                result.value = blackTotal - whiteTotal;
                return result;
            }

            result.value = Score.BLACK_WIN;

            const toTraversePoints = that.getToTraversePoints(killPoints, obj, whiteKillItems, blackKillItems);
            for (let p of toTraversePoints) {
                let [y, x] = p;
                board.downChess(y, x, Color.WHITE);
                let maxType = scoreComputer.downChessFake(y, x, Color.WHITE);
                if (that.zobristOpen) {
                    zobrist.go(y, x, Color.WHITE);
                }
                if (maxType === ChessType.FIVE) {
                    result.value = Score.BLACK_LOSE;
                    result.bestMove = [y, x];
                    board.restore(y, x);
                    scoreComputer.restore();
                    if (that.zobristOpen) {
                        zobrist.back(y, x, Color.WHITE);
                    }
                    return result;
                }
                board.setCandidatesFack(y, x, obj);
                let res = blackThink(depth + 1, [y, x], result.value, obj, path);
                path.pop();
                board.restore(y, x);
                scoreComputer.restore();
                board.restoreCandidates(y, x, obj);
                if (that.zobristOpen) {
                    zobrist.back(y, x, Color.WHITE);
                }
                if (res.value < result.value || (depth === 0 && res.value === result.value && res.depth < result.depth)) {
                    result.value = res.value;
                    result.depth = res.depth;
                    result.bestMove = [y, x];
                    result.path = res.path;
                    if (result.value <= alpha) {
                        if (depth === 0 && result.value === Score.BLACK_LOSE) {

                        } else {
                            return result;
                        }
                    }
                } else if (!result.bestMove.length) {
                    if (res.value === Score.BLACK_WIN) {
                        // result.bestMove = res.bestMove;
                        result.bestMove = [y, x];
                    } else {
                        result.bestMove = res.bestMove;
                    }
                    result.depth = res.depth;
                    result.path = res.path;
                }
            }
            if (that.zobristOpen) {
                zobrist.set(result);
            }
            return result;
        }
    }
    private hasRushFour(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color
    ): number[] {
        if (max.type !== ChessType.DEAD_THREE) {
            return [];
        }
        let deadThreeItems = killItems[ChessType.DEAD_THREE];
        let uniqObj: Record<number, BookkeepingItem> = {};
        for (let i = 0; i < deadThreeItems.length; i++) {
            let item = deadThreeItems[i];
            for (let j = 0; j < item.degradeCandidates!.length; j++) {
                let candidate = item.degradeCandidates![j];
                let key = candidate[0] * 15 + candidate[1];
                if (uniqObj[key]) {
                    // 有两个死三形成的冲四
                    return candidate;
                }
                uniqObj[key] = item;
            }
        }

        let aliveTwoItems = killItems[ChessType.ALIVE_TWO];
        if (!aliveTwoItems.length) {
            return [];
        }

        const { board, scoreComputer } = this;
        let oppsiteColor = color === Color.BLACK ? Color.WHITE : Color.BLACK;

        for (let j = 0; j < aliveTwoItems.length; j++) {
            let a2 = aliveTwoItems[j];
            for (let k = 0; k < a2.upgradeCandidates!.length; k++) {
                let p2 = a2.upgradeCandidates![k];
                let key = p2[0] * 15 + p2[1];
                if (uniqObj[key]) {
                    // 死三和活二的杀点有重合。但还需进一步检查对方堵死三时会不会形成自己的死四
                    // 能形成的话，也不构成冲四活三
                    let anotherPoint = uniqObj[key].degradeCandidates![0];
                    if (anotherPoint[0] * 15 + anotherPoint[1] === key) {
                        anotherPoint = uniqObj[key].degradeCandidates![1];
                    }
                    if (checkAnotherPoint(anotherPoint[0], anotherPoint[1], oppsiteColor)) {
                        return p2;
                    }
                }
            }
        }
        return [];

        // 这个检查另一个点是否会让对方形成死四的的方法，冗余量很大
        // 但因为冲四本来就是不常见的，因此应该也不会太耗性能，所以就这样吧
        function checkAnotherPoint(y: number, x: number, color: Color) {
            board.downChess(y, x, color);
            let maxType = scoreComputer.downChessFake(y, x, color);
            board.restore(y, x);
            scoreComputer.restore();
            return maxType < ChessType.DEAD_FOUR;
        }
    }
    // 冲四和双三是可以放在一起判断的，可减少对活二点的遍历次数
    private hasDoubleThreePoint(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color
    ): number[] {
        // 这里用小于，因为max.type有可能为DEAD_THREE，仍有可能是双三。
        if (max.type < ChessType.ALIVE_TWO) {
            return [];
        }
        let aliveTwoItems = killItems[ChessType.ALIVE_TWO];
        if (aliveTwoItems.length > 1) {
            let uniqObj: Rec = {};
            for (let i = 0; i < aliveTwoItems.length; i++) {
                let item = aliveTwoItems[i];
                for (let j = 0; j < item.upgradeCandidates!.length; j++) {
                    let candidate = item.upgradeCandidates![j];
                    let key = candidate[0] * 15 + candidate[1];
                    if (uniqObj[key]) {
                        return candidate;
                    }
                    // 不像hasRushFour一样，忽略了对另一个点的检验。但因为别的地方对双三也做了
                    // 很保守而安全的判定，因此也没有问题。
                    uniqObj[key] = true;
                }
            }
        }
        return [];
    }
    /**
     * 判定方法：只要有双死四，死四活三存在，
     * 并且不能被一个子全堵上（即杀点不能重合），为true;
     */
    private alreadyHasRushFour(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color
    ) {
        if (max.type < ChessType.DEAD_FOUR) {
            return false;
        }
        let deadFourItems = killItems[ChessType.DEAD_FOUR];
        let aliveThreeItems = killItems[ChessType.ALIVE_THREE];
        if (deadFourItems.length + aliveThreeItems.length < 2) {
            return false;
        }
        let uniqObj: Rec = {};
        for (let i = 0; i < deadFourItems.length; i++) {
            let d4i = deadFourItems[i];
            let [y, x] = d4i.degradeCandidates![0]
            let key = y * 15 + x;
            if (!uniqObj[key] && i > 0) {
                return true;
            }
            uniqObj[key] = true;
        }
        for (let j = 0; j < aliveThreeItems.length; j++) {
            let a3 = aliveThreeItems[j];
            if (a3.degradeCandidates!.every(p => !uniqObj[p[0] * 15 + p[1]])) {
                return true;
            }
        }
    }
    private getToTraversePoints(
        killPoints: number[][],
        candidatesMap: boolean[][],
        killItems1st: Record<number, BookkeepingItem[]>,
        killItems2nd: Record<number, BookkeepingItem[]>,
    ) {
        if (killPoints.length) {
            return killPoints;
        }
        const exists = new Array(255).fill(false);
        const points: number[][] = [];
        for (let t = ChessType.ALIVE_FOUR; t >= ChessType.ALIVE_TWO; t--) {
            killItems1st[t].forEach(item => {
                // tothink degradeCandidates?
                item.degradeCandidates!.forEach(p => this.checkPoint(p, exists, points));
            });
            killItems2nd[t].forEach(item => {
                item.degradeCandidates!.forEach(p => this.checkPoint(p, exists, points));
            });
        }
        for (let i = 0; i < candidatesMap.length; i++) {
            let stack = candidatesMap[i];
            if (stack[stack.length - 1]) {
                if (!exists[i]) {
                    let p = [~~(i / 15), i % 15];
                    exists[i] = true;
                    points.push(p);
                }
            }
        }
        return points;
    }
    private initCandidates(board: Board) {
        const { map } = board;
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 15; x++) {
                if (map[y][x]) {
                    board.setCandidates(y, x, this.candidatesMap);
                }
            }
        }
    }
    private unionPoints({
        itemGroup,
        point,
        useUpgradeCandidates: useKeyCandidates
    }: {
        itemGroup: BookkeepingItem[][],
        point?: number[],
        useUpgradeCandidates?: BookkeepingItem[]
    }): number[][] {
        const exists = new Array(255).fill(false);
        const points: number[][] = [];
        if (point) {
            this.checkPoint(point, exists, points);
        }
        itemGroup.forEach(items => {
            items.forEach(item => {
                item.degradeCandidates!.forEach(p => this.checkPoint(p, exists, points));
            });
        });
        useKeyCandidates && useKeyCandidates.forEach(item => {
            item.upgradeCandidates!.forEach(p => this.checkPoint(p, exists, points));
        });
        return points;
    }
    private checkPoint(p: number[], exists: boolean[], points: number[][]) {
        let key = p[0] * 15 + p[1];
        if (!exists[key]) {
            exists[key] = true;
            points.push(p);
        }
    }
}