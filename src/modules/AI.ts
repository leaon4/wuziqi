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
        public MAX_DEPTH = 5,
        public KILL_DEPTH = 5,
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

        function blackThink(depth: number, lastMove: number[], beta: number, candidatesMap: boolean[][], path: string[]): Result {
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
            if (blackMax.type >= ChessType.DEAD_FOUR) {
                // 黑子先手有四连的，必赢
                result.value = Score.BLACK_WIN;
                result.bestMove = blackMax.degradeCandidates![0];
                return result;
            }

            let {
                max: whiteMax,
                total: whiteTotal,
                killItems: whiteKillItems
            } = scoreComputer.getTotalScore(Color.WHITE);
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
                // -2已经是无法防御的冲四了
                let key = that.alreadyHasRushFour(whiteMax, whiteKillItems, Color.WHITE, blackMax);
                if (key === -2) {
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
                [blackRushFourPoint] = that.checkRushFour(blackMax, blackKillItems, Color.BLACK);
                if (blackRushFourPoint.length) {
                    result.value = Score.BLACK_WIN;
                    result.bestMove = blackRushFourPoint;
                    return result;
                }
                if (whiteMax.type === ChessType.ALIVE_THREE) {
                    if (!whiteMax.degradeCandidates) {
                        // todo 伪活三（code为奇怪的双活三）这里已经赢了。但平时这种情况应该是不会出现的
                        console.error('whiteMax.candidates is empty')
                    }
                    let key = that.alreadyHasDoubleThree(whiteMax, whiteKillItems);
                    let point;
                    let itemGroup = [
                        blackKillItems[ChessType.DEAD_THREE]
                    ];
                    if (key === -2) {
                        // 白子有双活三时，黑子若无死三，必输
                        // 有死三时，也只能走死三去拼杀
                        if (blackMax.type < ChessType.DEAD_THREE) {
                            result.value = Score.BLACK_LOSE;
                            // 这个bestMove不精确，比如如果对方是三活三
                            result.bestMove = whiteMax.degradeCandidates![0];
                            return result;
                        }
                    } else if (key === -1) {
                        // 白子只有一个活三，黑子只能走自己的死三或堵
                        itemGroup.push(whiteKillItems[ChessType.ALIVE_THREE]);
                    } else {
                        // 白子有双活三，但能被一个子同时堵住
                        point = [~~(key / 15), key % 15];
                    }
                    killPoints = that.unionPoints({
                        point,
                        itemGroup
                    });
                } else if (whiteMax.type === ChessType.DEAD_THREE) {
                    // 检查白子有无冲四的可能
                    let items: BookkeepingItem[];
                    [whiteRushFourPoint, items] = that.checkRushFour(whiteMax, whiteKillItems, Color.WHITE);
                    if (whiteRushFourPoint.length) {
                        // 如果有，黑子只能走自己的死三或堵
                        // 堵不一定非要堵whiteRushFourPoint，只要把任意一个位置堵了，仍有机会
                        // 但一定要去堵造成whiteRushFourPoint的两个code
                        killPoints = that.unionPoints({
                            point: whiteRushFourPoint,
                            itemGroup: [
                                blackKillItems[ChessType.DEAD_THREE],
                                items
                            ]
                        });
                    }
                } else {
                    // 只有白子没有死三时，黑子双三才必赢，否则只能在全量计算中优先计算。
                    // 因此先只考虑白子没有死三时的双三情况（此处else就是了）
                    [blackDoubleThreePoint] = that.checkDoubleThree(blackMax, blackKillItems, Color.BLACK);
                    if (blackDoubleThreePoint.length) {
                        result.value = Score.BLACK_WIN;
                        result.bestMove = blackDoubleThreePoint;
                        return result;
                    }
                }
                // 同理，如果黑子没有死三，白子会有活三，能下的点只有黑子的活二和堵。
                // 但如果有死三，情况很复杂，活一、死二也是能下的，因此排除这种情况。
                if (!killPoints.length && blackMax.type < ChessType.DEAD_THREE) {
                    let items: BookkeepingItem[];
                    [whiteDoubleThreePoint, items] = that.checkDoubleThree(whiteMax, whiteKillItems, Color.WHITE);
                    if (whiteDoubleThreePoint.length) {
                        killPoints = that.unionPoints({
                            point: whiteDoubleThreePoint,
                            itemGroup: [
                                items
                            ],
                            useUpgradeCandidates: blackKillItems[ChessType.ALIVE_TWO],
                        });
                    }
                }
            }

            // todo 应该再具体区分killPoints，比如如果只有一个的情况
            if (!killPoints.length && depth >= MAX_DEPTH || depth >= KILL_DEPTH) {
                // 黑已有冲四           赢，和已有死四一样，前面已经退出了，这里不处理。
                // 黑已有双活三         除非白有死四，否则赢，和已有一个活三威力几乎一样，不用加分。
                // 黑会有一个冲四       除非白有死四，否则赢，因此分值+死四的一半。
                // 黑会同时有两个冲四    除非白有死四，否则赢，因此分值+活四。(太难判断了，先不做)
                // 黑会有双活三         无法定输赢，分值+10**4*5（多加5个活二）

                // 白已有冲四           除非黑有既能堵死四，又趁机形成自己的死四或活四的棋，否则输。前面已处理，这里不加分。
                // 白已有双活三         除非自己更快（有死三以上），并且不能一个子堵俩，否则输（前面会处理这种情况）。其实不用加分，因为双活三分值已经很高了。
                // 白会有冲四           除非自己更快，否则几乎是和死四一样的必防等级，因此分值+死四*0.8。
                // 白会有双活三         无法定输赢，分值+10**4*3（多加3个活二）

                // 此种评分有个缺陷，例如：当一方有活三，然而对方在堵这一方时，还能形成他的活三的情况。
                // 这种情况使这个活三价值大减

                blackRushFourPoint = blackRushFourPoint || that.checkRushFour(blackMax, blackKillItems, Color.BLACK)[0];
                whiteRushFourPoint = whiteRushFourPoint || that.checkRushFour(whiteMax, whiteKillItems, Color.WHITE)[0];
                blackDoubleThreePoint = blackDoubleThreePoint || that.checkDoubleThree(blackMax, blackKillItems, Color.BLACK)[0];
                whiteDoubleThreePoint = whiteDoubleThreePoint || that.checkDoubleThree(whiteMax, whiteKillItems, Color.WHITE)[0];

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

            const toTraversePoints = that.getToTraversePoints(killPoints, candidatesMap, blackKillItems, whiteKillItems);
            for (let p of toTraversePoints) {
                let [y, x] = p;
                board.downChess(y, x, Color.BLACK);
                scoreComputer.downChessFake(y, x, Color.BLACK);
                if (that.zobristOpen) {
                    zobrist.go(y, x, Color.BLACK);
                }
                board.setCandidatesFake(y, x, candidatesMap);
                let res = whiteThink(depth + 1, [y, x], result.value, candidatesMap, path);
                path.pop();
                board.restore(y, x);
                scoreComputer.restore();
                board.restoreCandidates(y, x, candidatesMap);
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
                            console.error('eeeeeeeeeeeeeeeeeeeee')
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
        function whiteThink(depth: number, lastMove: number[], alpha: number, candidatesMap: boolean[][], path: string[]): Result {
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
                max: whiteMax,
                total: whiteTotal,
                killItems: whiteKillItems
            } = scoreComputer.getTotalScore(Color.WHITE);
            if (whiteMax.type >= ChessType.DEAD_FOUR) {
                result.value = Score.BLACK_LOSE;
                result.bestMove = whiteMax.degradeCandidates![0];
                return result;
            }

            let {
                max: blackMax,
                total: blackTotal,
                killItems: blackKillItems
            } = scoreComputer.getTotalScore(Color.BLACK);
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
                let key = that.alreadyHasRushFour(blackMax, blackKillItems, Color.BLACK, whiteMax);
                if (key === -2) {
                    result.value = Score.BLACK_WIN;
                    result.bestMove = blackMax.degradeCandidates![0];
                    return result;
                }
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
                [whiteRushFourPoint] = that.checkRushFour(whiteMax, whiteKillItems, Color.WHITE);
                if (whiteRushFourPoint.length) {
                    result.value = Score.BLACK_LOSE;
                    result.bestMove = whiteRushFourPoint;
                    return result;
                }
                if (blackMax.type === ChessType.ALIVE_THREE) {
                    if (!blackMax.degradeCandidates) {
                        console.error('blackMax.candidates is empty')
                    }
                    let key = that.alreadyHasDoubleThree(blackMax, blackKillItems);
                    let point;
                    let itemGroup = [
                        whiteKillItems[ChessType.DEAD_THREE]
                    ];
                    if (key === -2) {
                        if (whiteMax.type < ChessType.DEAD_THREE) {
                            result.value = Score.BLACK_WIN;
                            result.bestMove = blackMax.degradeCandidates![0];
                            return result;
                        }
                    } else if (key === -1) {
                        itemGroup.push(blackKillItems[ChessType.ALIVE_THREE]);
                    } else {
                        point = [~~(key / 15), key % 15];
                    }
                    killPoints = that.unionPoints({
                        point,
                        itemGroup
                    });
                } else if (blackMax.type === ChessType.DEAD_THREE) {
                    let items: BookkeepingItem[];
                    [blackRushFourPoint, items] = that.checkRushFour(blackMax, blackKillItems, Color.BLACK);
                    if (blackRushFourPoint.length) {
                        killPoints = that.unionPoints({
                            point: blackRushFourPoint,
                            itemGroup: [
                                whiteKillItems[ChessType.DEAD_THREE],
                                items
                            ]
                        });
                    }
                } else {
                    [whiteDoubleThreePoint] = that.checkDoubleThree(whiteMax, whiteKillItems, Color.WHITE);
                    if (whiteDoubleThreePoint.length) {
                        result.value = Score.BLACK_LOSE;
                        result.bestMove = whiteDoubleThreePoint;
                        return result;
                    }
                }
                if (!killPoints.length && whiteMax.type < ChessType.DEAD_THREE) {
                    let items: BookkeepingItem[];
                    [blackDoubleThreePoint, items] = that.checkDoubleThree(blackMax, blackKillItems, Color.BLACK);
                    if (blackDoubleThreePoint.length) {
                        killPoints = that.unionPoints({
                            point: blackDoubleThreePoint,
                            itemGroup: [
                                items
                            ],
                            useUpgradeCandidates: whiteKillItems[ChessType.ALIVE_TWO],
                        });
                    }
                }
            }

            if (!killPoints.length && depth >= MAX_DEPTH || depth >= KILL_DEPTH) {
                blackRushFourPoint = blackRushFourPoint || that.checkRushFour(blackMax, blackKillItems, Color.BLACK)[0];
                whiteRushFourPoint = whiteRushFourPoint || that.checkRushFour(whiteMax, whiteKillItems, Color.WHITE)[0];
                blackDoubleThreePoint = blackDoubleThreePoint || that.checkDoubleThree(blackMax, blackKillItems, Color.BLACK)[0];
                whiteDoubleThreePoint = whiteDoubleThreePoint || that.checkDoubleThree(whiteMax, whiteKillItems, Color.WHITE)[0];

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

            const toTraversePoints = that.getToTraversePoints(killPoints, candidatesMap, whiteKillItems, blackKillItems);
            for (let p of toTraversePoints) {
                let [y, x] = p;
                board.downChess(y, x, Color.WHITE);
                scoreComputer.downChessFake(y, x, Color.WHITE);
                if (that.zobristOpen) {
                    zobrist.go(y, x, Color.WHITE);
                }
                board.setCandidatesFake(y, x, candidatesMap);
                let res = blackThink(depth + 1, [y, x], result.value, candidatesMap, path);
                path.pop();
                board.restore(y, x);
                scoreComputer.restore();
                board.restoreCandidates(y, x, candidatesMap);
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
                            console.error('ffffffffffffffff')
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
    /**
     * 返回值第一个为堵点，第二个为形成冲四的两个items
     */
    private checkRushFour(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color
    ): [number[], BookkeepingItem[]] {
        if (max.type !== ChessType.DEAD_THREE
            || killItems[ChessType.DEAD_THREE].length + killItems[ChessType.ALIVE_TWO].length < 2) {
            return [[], []];
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
                    return [candidate, [uniqObj[key], item]];
                }
                uniqObj[key] = item;
            }
        }

        let aliveTwoItems = killItems[ChessType.ALIVE_TWO];
        if (!aliveTwoItems.length) {
            return [[], []];
        }

        let oppsiteColor = 3 - color;

        for (let j = 0; j < aliveTwoItems.length; j++) {
            let a2 = aliveTwoItems[j];
            for (let k = 0; k < a2.upgradeCandidates!.length; k++) {
                let p2 = a2.upgradeCandidates![k];
                let key = p2[0] * 15 + p2[1];
                if (uniqObj[key]) {
                    // 死三和活二的杀点有重合，则很可能满足。
                    // 但还需进一步检查对方堵死三（堵时已成死四）时会不会形成自己的死四
                    // 能形成的话，也不构成冲四活三
                    let anotherPoint = uniqObj[key].degradeCandidates![0];
                    if (anotherPoint[0] * 15 + anotherPoint[1] === key) {
                        anotherPoint = uniqObj[key].degradeCandidates![1];
                    }
                    if (this.checkAnotherPoint(anotherPoint[0], anotherPoint[1], oppsiteColor)) {
                        return [p2, [uniqObj[key], a2]];
                    }
                }
            }
        }
        return [[], []];
    }
    /**
     * 这个检查另一个点是否会让对方形成死四的的方法，冗余量很大
     * 但因为冲四本来就是不常见的，因此应该也不会太耗性能，所以就这样吧
     */
    private checkAnotherPoint(y: number, x: number, color: Color) {
        const { board, scoreComputer } = this;
        board.downChess(y, x, color);
        let maxType = scoreComputer.downChessFake(y, x, color);
        board.restore(y, x);
        scoreComputer.restore();
        return maxType < ChessType.DEAD_FOUR;
    }
    /**
     * 要在对方没有死三时使用才准确
     */
    private checkDoubleThree(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color
    ): [number[], BookkeepingItem[]] {
        if (max.type < ChessType.ALIVE_TWO || killItems[ChessType.ALIVE_TWO].length < 2) {
            return [[], []];
        }
        let aliveTwoItems = killItems[ChessType.ALIVE_TWO];
        if (aliveTwoItems.length > 1) {
            let uniqObj: Record<number, BookkeepingItem> = {};
            for (let i = 0; i < aliveTwoItems.length; i++) {
                let item = aliveTwoItems[i];
                for (let j = 0; j < item.upgradeCandidates!.length; j++) {
                    let candidate = item.upgradeCandidates![j];
                    let key = candidate[0] * 15 + candidate[1];
                    if (uniqObj[key]) {
                        return [candidate, [uniqObj[key], item]];
                    }
                    // 不像hasRushFour一样，忽略了对另一个点的检验。但因为使用方会保证对方没有死三
                    // 因此也没有问题。
                    uniqObj[key] = item;
                }
            }
        }
        return [[], []];
    }
    /**
     * 判定方法：只要有双死四，死四活三存在，
     * 并且不能被一个子全堵上（即杀点不能重合），为true;
     * -1:非冲四, -2:是纯正的冲四，比如双死四的冲四, 或不能被对方形成四连的冲四
     */
    private alreadyHasRushFour(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
        color: Color,
        otherMax: BookkeepingItem
    ): number {
        if (max.type < ChessType.DEAD_FOUR) {
            return -1;
        }
        let deadFourItems = killItems[ChessType.DEAD_FOUR];
        let aliveThreeItems = killItems[ChessType.ALIVE_THREE];
        if (deadFourItems.length + aliveThreeItems.length < 2) {
            return -1;
        }
        let uniqObj: Rec = {};
        for (let i = 0; i < deadFourItems.length; i++) {
            let d4i = deadFourItems[i];
            let [y, x] = d4i.degradeCandidates![0]
            let key = y * 15 + x;
            if (!uniqObj[key] && i > 0) {
                return -2;
            }
            uniqObj[key] = true;
        }
        if (!aliveThreeItems.length) {
            return -1;
        }
        if (otherMax.type >= ChessType.DEAD_THREE) {
            let [y, x] = max.degradeCandidates![0];
            let oppsiteColor = 3 - color;
            let canNotMakeFour = this.checkAnotherPoint(y, x, oppsiteColor);
            if (!canNotMakeFour) {
                return -1;
            }
        }
        for (let i = 0; i < aliveThreeItems.length; i++) {
            let a3i = aliveThreeItems[i];
            if (a3i.degradeCandidates!.every(p => !uniqObj[p[0] * 15 + p[1]])) {
                return -2;
            }
        }
        return -1;
    }
    /**
     * 返回值：-2代表是双活三，-1代表不是双活三，其他（>=0）代表是双活三，但能被一个点同时堵上。
     * 返回值即是这个点的key
     * 
     * 判定方法：活三数量要不少于2个，
     * 并且不能被一个子全堵上（即杀点不能重合），为-2。
     * 对方有没有死三可破的问题这里不管。
     * 算法：前两个活三code的堵点存哈希，如果没有发现重合，则返回-2
     * 如果发现重合，记录此点，继续遍历后续的活三。如果后续只要有一个活三，
     * 所有堵点都不与这个堵点重合，则返回-2
     */
    private alreadyHasDoubleThree(
        max: BookkeepingItem,
        killItems: Record<number, BookkeepingItem[]>,
    ): number {
        if (max.type < ChessType.ALIVE_THREE) {
            return -1;
        }
        let aliveThreeItems = killItems[ChessType.ALIVE_THREE];
        if (aliveThreeItems.length < 2) {
            return -1;
        }
        let uniqObj: Rec = {};
        let sameDefendPoint = -1;
        for (let i = 0; i < 2; i++) {
            let a3i = aliveThreeItems[i];
            for (let item of a3i.degradeCandidates!) {
                let [y, x] = item;
                let key = y * 15 + x;
                if (!uniqObj[key]) {
                    uniqObj[key] = true;
                } else {
                    sameDefendPoint = key;
                    break;
                }
            }
        }
        if (sameDefendPoint < 0) {
            return -2;
        }
        for (let i = 2; i < aliveThreeItems.length; i++) {
            let a3i = aliveThreeItems[i];
            if (a3i.degradeCandidates!.every(p => (p[0] * 15 + p[1]) !== sameDefendPoint)) {
                return -2;
            }
        }
        return sameDefendPoint;
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
                // degradeCandidates和upgradeCandidates并不完全一样
                // 先手方，应该关注自己的upgradeCandidates，
                // 而对手，则只用关注degradeCandidates。这样在多数场景性能稍微有些提升
                if (item.upgradeCandidates) {
                    item.upgradeCandidates.forEach(p => this.checkPoint(p, exists, points));
                } else {
                    item.degradeCandidates!.forEach(p => this.checkPoint(p, exists, points));
                }
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
        useUpgradeCandidates
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
        useUpgradeCandidates && useUpgradeCandidates.forEach(item => {
            item.upgradeCandidates!.forEach(p => this.checkPoint(p, exists, points));
        });
        itemGroup.forEach(items => {
            items.forEach(item => {
                item.degradeCandidates!.forEach(p => this.checkPoint(p, exists, points));
            });
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