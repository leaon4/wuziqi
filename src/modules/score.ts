import Board from "./board";
import { Color, ChessType } from "./definition";

type ScoreMapItem = {
    value: number;
    type: ChessType;
    level: number;
    degradeCandidates?: number[];// 能使此code降级的点，用于堵。例'00101100'，1,3,6都可堵
    upgradeCandidates?: number[];// 能使此code升级的点，用于攻。例'00101100'，只有3才可攻
};

export type BookkeepingItem = {
    code: string;
    value: number;
    type: ChessType;
    level: number;
    degradeCandidates?: number[][];
    upgradeCandidates?: number[][];
};

type BookkeepingTable = Record<string, BookkeepingItem[] | null>;

type Bookkeeping = {
    h: BookkeepingTable;
    p: BookkeepingTable;
    s: BookkeepingTable;
    b: BookkeepingTable;
};

export default class ScoreComputer {
    scoreMap: Record<string, ScoreMapItem> = {};// 记录所有的原始棋型，便于快速哈希检索

    /**
     * 下面两个Bookkeeping记录当前棋盘上四个方向的分值
     * 分值实时跟进棋盘的变化，以便能快速统计出战场形势，或者得到杀点
     */
    black: Bookkeeping = {
        h: {},
        p: {},
        s: {},
        b: {},
    };
    white: Bookkeeping = {
        h: {},
        p: {},
        s: {},
        b: {},
    };
    constructor(public board: Board) {
        console.time('generateScoreMap')
        this.generateScoreMap();
        console.timeEnd('generateScoreMap')
        if (board.hasInitialMap) {
            this.computeTotalScore(Color.BLACK);
            this.computeTotalScore(Color.WHITE);
        }
    }
    reset() {
        this.black = {
            h: {},
            p: {},
            s: {},
            b: {},
        };
        this.white = {
            h: {},
            p: {},
            s: {},
            b: {},
        };
        if (this.board.hasInitialMap) {
            this.computeTotalScore(Color.BLACK);
            this.computeTotalScore(Color.WHITE);
        }
    }
    /**
     * 算法：
     * 先进行全排列，生成一个个的code。
     * code从长到短，每个code含'1'的个数由多到少，依次去进行logScore
     * 这样，生成的codes的顺序，ChessType正好是由大到小
     * logScore中，依次将code的一个'0'位设为'1'，看它能不能升级，
     * 由此来决定当前code的等级
     */
    private generateScoreMap() {
        let arr: number[];
        const permutation = (start: number, end: number) => {
            if (end === arr.length) {
                this.logScore(arr);
                return;
            }
            for (let i = start; i <= end; i++) {
                arr[i] = 0;
                permutation(i + 1, end + 1);
                arr[i] = 1;
            }
        };

        // i代表code的长度，由长到短进行permutation
        // 当长度不足5时，没有意义再统计，都计分值为0
        // 因此迭代顺序为15 -> 5
        for (let i = 15; i >= 5; i--) {
            arr = new Array(i).fill(1);
            for (let j = i; j >= 0; j--) {
                permutation(0, j);
            }
        }

        this.addCandidatesToScoreMap();

        console.log(Object.keys(this.scoreMap).length);
    }
    private logScore(arr: number[]) {
        const { scoreMap } = this;
        const codeArr = arr.slice();
        const code = codeArr.join('');

        // 为节省空间，scoreMap不记录有镜像的code
        const revCode = codeArr.reverse().join('');
        if (revCode in scoreMap) {
            return;
        }

        // 成五比较好判断，也不记录了
        if (/11111/.test(code)) {
            return;
        }

        // count记录能使当前code升级的位置的数量，这是个重要的评分标识
        // 比如count为2的'000111000'，明显好于count为1的'000101100'
        const log: ScoreMapItem & { count: number } = {
            value: 0,
            type: 0,
            level: 0,
            count: 0,
        };
        for (let i = 0; i < code.length; i++) {
            if (code[i] === '0') {
                const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                const score = this.getScore(newCode);
                if (score.level > log.level) {
                    log.level = score.level;
                    log.value = score.value;
                    log.type = score.type;
                    log.count = 1;
                } else if (score.level === log.level) {
                    // tothink 以type还是value来比较?
                    if (score.type > log.type || score.value > log.value) {
                        log.type = score.type;
                        log.value = score.value;
                    }
                    log.count++;
                }
            }
        }

        /**
         * 有两处成五，是活四
         * 只有一处成五，是死四
         * 只要有一处活四，是活三
         * 只要能成死四，是死三
         * 只要能成活三，是活二
         * 有没有既能成活三又能成死四的？有'000010101'，应该优先算成死三
         * 忽略对双活三，死四活三的处理
         */
        switch (log.level) {
            case 10:
                if (log.count > 1) {
                    scoreMap[code] = {
                        level: 8,
                        value: 10 ** 8,
                        type: ChessType.ALIVE_FOUR,
                    };
                } else {
                    scoreMap[code] = {
                        level: 6,
                        value: 10 ** 6 + 500,
                        type: ChessType.DEAD_FOUR
                    };
                }
                break;
            case 8:
                scoreMap[code] = {
                    level: 6,
                    value: 10 ** 6 - (log.count > 1 ? 0 : 200000),
                    type: ChessType.ALIVE_THREE,
                };
                break;
            case 6:
                if (log.type === ChessType.DEAD_FOUR) {
                    scoreMap[code] = {
                        level: 4,
                        value: 13000,
                        type: ChessType.DEAD_THREE
                    };
                } else {
                    scoreMap[code] = {
                        level: 4,
                        value: Math.min(13000, log.value / 100 - (2 - log.count) * 1000),
                        type: ChessType.ALIVE_TWO
                    };
                }
                break;
            case 0:
                scoreMap[code] = {
                    level: 0,
                    value: 0,
                    type: ChessType.ZERO
                };
                break;
            default:
                scoreMap[code] = {
                    level: log.level - 2,
                    value: ~~(log.value / 100 - (log.count > 1 ? 0 : 20)),
                    type: log.type - 2 // 省略细分
                };
        }
    }
    private addCandidatesToScoreMap() {
        const { scoreMap } = this;
        for (let code in scoreMap) {
            const score = scoreMap[code];
            const degradeCandidates = [];
            if (score.type === ChessType.ALIVE_FOUR) {
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0' && (code[i + 1] === '1' || code[i - 1] === '1')) {
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        if (/11111/.test(newCode)) {
                            degradeCandidates.push(i);
                        }
                    }
                }
            } else if (score.type === ChessType.DEAD_FOUR) {
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0' && (code[i + 1] === '1' || code[i - 1] === '1')) {
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        if (/11111/.test(newCode)) {
                            degradeCandidates.push(i);
                            break;
                        }
                    }
                }
            } else if (score.type === ChessType.ALIVE_THREE || score.type === ChessType.ALIVE_TWO) {
                const upgradeCandidates = [];
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0') {
                        const left = this.getScore(code.slice(0, i));
                        const right = this.getScore(code.slice(i + 1));
                        if (left.level < score.level && right.level < score.level) {
                            degradeCandidates.push(i);
                        }
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        const newScore = this.getScore(newCode);
                        if (newScore.level > score.level) {
                            upgradeCandidates.push(i);
                        }
                    }
                }
                // 遇上活三加死四类的情况，degradeCandidates为空，因此在这里赋值
                score.degradeCandidates = degradeCandidates;
                score.upgradeCandidates = upgradeCandidates;
            } else if (score.type === ChessType.DEAD_THREE) {
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0') {
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        if (this.getScore(newCode).type === ChessType.DEAD_FOUR) {
                            degradeCandidates.push(i);
                        }
                    }
                }
            }
            if (degradeCandidates.length) {
                score.degradeCandidates = degradeCandidates;
            }
        }
    }
    private getScore(code: string): ScoreMapItem {
        if (code.length < 5) {
            return {
                value: 0,
                level: 0,
                type: 0
            };
        }
        if (/11111/.test(code)) {
            return {
                value: 10 ** 10,
                level: 10,
                type: ChessType.FIVE
            }
        }
        if (this.scoreMap[code]) {
            return this.scoreMap[code];
        }
        const revCode = code.split('').reverse().join('');
        return this.scoreMap[revCode];
    }
    /**
     * 算法：
     * 扫描四个方向，将指定颜色的棋子提取成只有0和1的code
     * 再执行logItem
     */
    computeTotalScore(color: Color) {
        const { black, white } = this;
        const { map } = this.board;
        let code: string;
        const bookkeeping = color === Color.BLACK ? black : white;
        const that = this;

        // h -
        let y: number, x: number;
        for (y = 0; y < 15; y++) {
            code = '';
            for (x = 0; x < 15; x++) {
                addCode(y, x, 'h');
            }
            if (code) {
                this.logItem(code, y, x, 'h', bookkeeping);
            }
        }

        // p |
        for (x = 0; x < 15; x++) {
            code = '';
            for (y = 0; y < 15; y++) {
                addCode(y, x, 'p');
            }
            if (code) {
                this.logItem(code, y, x, 'p', bookkeeping);
            }
        }

        // s /
        for (let i = 4; i <= 24; i++) {
            code = '';
            let y0 = Math.max(0, i - 14), x0 = Math.min(14, i);
            for (y = y0, x = x0; x >= 0 && y <= 14; x--, y++) {
                addCode(y, x, 's');
            }
            if (code) {
                this.logItem(code, y, x, 's', bookkeeping);
            }
        }

        // b \
        for (let i = 4; i <= 24; i++) {
            code = '';
            let y0 = Math.max(0, 14 - i), x0 = Math.max(0, i - 14);
            for (y = y0, x = x0; x <= 14 && y <= 14; x++, y++) {
                addCode(y, x, 'b');
            }
            if (code) {
                this.logItem(code, y, x, 'b', bookkeeping);
            }
        }
        function addCode(y: number, x: number, dir: string) {
            if (map[y][x] === 0) {
                code += '0';
            } else if (map[y][x] === color) {
                code += '1';
            } else if (code) {
                that.logItem(code, y, x, dir, bookkeeping);
                code = '';
            }
        }
    }
    /**
     * 算法和computeTotalScore一样，只是只对单独一点的四个方向做统计
     */
    private logBookkeeping(y0: number, x0: number, color: Color): ChessType {
        const { black, white } = this;
        const { map } = this.board;
        const that = this;
        const bookkeeping = color === Color.BLACK ? black : white;
        let y: number, x: number;
        const maxTypeOfThisPoint = { type: ChessType.ZERO };

        // h -
        let code = '';
        for (x = 0; x < 15; x++) {
            addCode(y0, x, 'h');
        }
        if (code) {
            this.logItem(code, y0, x, 'h', bookkeeping, maxTypeOfThisPoint);
        }

        // p |
        code = '';
        for (y = 0; y < 15; y++) {
            addCode(y, x0, 'p');
        }
        if (code) {
            this.logItem(code, y, x0, 'p', bookkeeping, maxTypeOfThisPoint);
        }

        // s /
        code = '';
        for (
            x = Math.min(x0 + y0, 14), y = Math.max(x0 + y0 - 14, 0);
            x >= 0 && y <= 14;
            x--, y++
        ) {
            addCode(y, x, 's');
        }
        if (code) {
            this.logItem(code, y, x, 's', bookkeeping, maxTypeOfThisPoint);
        }

        // b \
        code = '';
        for (
            x = Math.max(0, x0 - y0), y = Math.max(0, y0 - x0);
            x <= 14 && y <= 14;
            x++, y++
        ) {
            addCode(y, x, 'b');
        }
        if (code) {
            this.logItem(code, y, x, 'b', bookkeeping, maxTypeOfThisPoint);
        }

        return maxTypeOfThisPoint.type;
        function addCode(y: number, x: number, dir: string) {
            if (map[y][x] === 0) {
                code += '0';
            } else if (map[y][x] === color) {
                code += '1';
            } else if (code) {
                that.logItem(code, y, x, dir, bookkeeping, maxTypeOfThisPoint);
                code = '';
            }
        }
    }
    /**
     * 根据code生成BookkeepingItem，根据xEnd和yEnd生成存储位置key
     * 还要将scoreMap中的原始candidates转换为具体在棋盘上的点
     * 最后做记录
     * 如果有maxTypeOfThisPoint，顺便做一下收集最大ChessType的操作
     */
    private logItem(
        code: string,
        yEnd: number,
        xEnd: number,
        dir: string,
        book: Bookkeeping,
        maxTypeOfThisPoint?: { type: ChessType }
    ) {
        if (code.length < 5 || !code.includes('1')) {
            return;
        }
        const { scoreMap } = this;
        const score = this.getScore(code);
        const isRev = score !== scoreMap[code];
        const item: BookkeepingItem = {
            code,
            value: score.value,
            type: score.type,
            level: score.level
        };
        let key = -1;
        const table = book[dir as 'h'];
        let genPoint: ((_: number) => number[]);
        switch (dir) {
            case 'h':
                genPoint = (pos: number) => [yEnd, xEnd - code.length + pos];
                key = yEnd;
                break;
            case 'p':
                genPoint = (pos: number) => [yEnd - code.length + pos, xEnd];
                key = xEnd;
                break;
            case 's':
                genPoint = (pos: number) => [yEnd - code.length + pos, xEnd + code.length - pos];
                key = xEnd + code.length + yEnd - code.length;
                break;
            default: // case: 'b'
                genPoint = (pos: number) => [yEnd - code.length + pos, xEnd - code.length + pos];
                key = 14 - (yEnd - code.length) + (xEnd - code.length);
        }

        if (score.level >= 4 && score.level <= 8) {
            const getCandidatesPoint = (candidates: number[], fn: (_: number) => number[]) => {
                return candidates.map(pos => {
                    if (isRev) {
                        pos = code.length - 1 - pos;
                    }
                    return fn(pos);
                });
            };
            item.degradeCandidates = getCandidatesPoint(
                score.degradeCandidates!,
                genPoint
            );
            score.upgradeCandidates && (item.upgradeCandidates = getCandidatesPoint(
                score.upgradeCandidates!,
                genPoint
            ));
        }

        (table[key] || (table[key] = [])).push(item);

        if (maxTypeOfThisPoint && score.type > maxTypeOfThisPoint.type) {
            maxTypeOfThisPoint.type = score.type;
        }
    }
    downChess(y: number, x: number) {
        this.clearScore(y, x);
        this.logBookkeeping(y, x, Color.BLACK);
        this.logBookkeeping(y, x, Color.WHITE);
    }
    downChessFake(y: number, x: number, color: Color): ChessType {
        this.black.h = Object.create(this.black.h);
        this.black.p = Object.create(this.black.p);
        this.black.s = Object.create(this.black.s);
        this.black.b = Object.create(this.black.b);

        this.white.h = Object.create(this.white.h);
        this.white.p = Object.create(this.white.p);
        this.white.s = Object.create(this.white.s);
        this.white.b = Object.create(this.white.b);

        this.clearScoreFake(y, x);
        const res = [
            this.logBookkeeping(y, x, Color.BLACK),
            this.logBookkeeping(y, x, Color.WHITE)
        ];
        return color === Color.BLACK ? res[0] : res[1];
    }
    restore() {
        this.black.h = Object.getPrototypeOf(this.black.h);
        this.black.p = Object.getPrototypeOf(this.black.p);
        this.black.s = Object.getPrototypeOf(this.black.s);
        this.black.b = Object.getPrototypeOf(this.black.b);

        this.white.h = Object.getPrototypeOf(this.white.h);
        this.white.p = Object.getPrototypeOf(this.white.p);
        this.white.s = Object.getPrototypeOf(this.white.s);
        this.white.b = Object.getPrototypeOf(this.white.b);
    }
    private clearScore(y: number, x: number) {
        const { black, white } = this;
        const hKey = y,
            pKey = x,
            sKey = x + y,
            bKey = 14 - y + x;
        delete black.h[hKey];
        delete black.p[pKey];
        delete black.s[sKey];
        delete black.b[bKey];

        delete white.h[hKey];
        delete white.p[pKey];
        delete white.s[sKey];
        delete white.b[bKey];
    }
    private clearScoreFake(y: number, x: number) {
        const { black, white } = this;
        const hKey = y,
            pKey = x,
            sKey = x + y,
            bKey = 14 - y + x;
        black.h[hKey] = null;
        black.p[pKey] = null;
        black.s[sKey] = null;
        black.b[bKey] = null;

        white.h[hKey] = null;
        white.p[pKey] = null;
        white.s[sKey] = null;
        white.b[bKey] = null;
    }
    getTotalScore(color: Color) {
        const book = color === Color.BLACK ? this.black : this.white;
        let max = {
            type: -1,
        } as BookkeepingItem;
        let total = 0;
        const killItems: Record<number, BookkeepingItem[]> = {
            [ChessType.ALIVE_FOUR]: [],
            [ChessType.DEAD_FOUR]: [],
            [ChessType.ALIVE_THREE]: [],
            [ChessType.DEAD_THREE]: [],
            [ChessType.ALIVE_TWO]: [],
        };
        traverse(book.h);
        traverse(book.p);
        traverse(book.s);
        traverse(book.b);
        return {
            max,
            total,
            killItems
        };
        function traverse(table: BookkeepingTable) {
            for (let i in table) {
                table[i] && table[i]!.forEach(item => {
                    // 取最大type问题
                    if (item.type > max.type) {
                        max = item;
                    }
                    total += item.value;
                    if (item.type >= ChessType.ALIVE_TWO) {
                        killItems[item.type].push(item);
                    }
                });
            }
        }
    }
}