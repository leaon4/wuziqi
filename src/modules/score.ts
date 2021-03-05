import Board from "./board";
import { Color, ChessType } from "./definition";

export type BookkeepingItem = {
    code: string;
    value: number;
    type: ChessType;
    level: number;
    candidates?: number[][];
    keyCandidates?: number[][];
};

type BookkeepingTable = Record<string, BookkeepingItem[] | null>;

type Bookkeeping = {
    h: BookkeepingTable;
    p: BookkeepingTable;
    s: BookkeepingTable;
    b: BookkeepingTable;
};

type ScoreMapItem = {
    value: number,
    type: ChessType,
    level: number,
    candidates?: number[],
    keyCandidates?: number[]
};

export default class ScoreComputer {
    scoreMap: Record<string, ScoreMapItem> = {};
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
    private generateScoreMap() {
        const { scoreMap } = this;
        const that = this;
        let arr: number[];
        for (let i = 15; i >= 5; i--) {
            arr = new Array(i).fill(1);
            for (let j = i; j >= 0; j--) {
                permutation(0, j);
            }
        }
        this.addCandidatesToScoreMap();
        console.log(Object.keys(scoreMap).length);
        // for (let code in scoreMap) {
        //     if (scoreMap[code].type === ChessType.ALIVE_TWO) {
        //         console.log(code, scoreMap[code].candidates);
        //     }
        // }
        function permutation(start: number, end: number) {
            if (end === arr.length) {
                logScore(arr);
                return;
            }
            for (let i = start; i <= end; i++) {
                arr[i] = 0;
                permutation(i + 1, end + 1);
                arr[i] = 1;
            }
        }
        function logScore(arr: number[]) {
            let codeArr = arr.slice();
            let code = codeArr.join('');
            let revCode = codeArr.reverse().join('');
            if (revCode in scoreMap) {
                return;
            }
            if (/11111/.test(code)) {
                return;
            }
            let log: ScoreMapItem & { count: number } = {
                value: 0,
                type: 0,
                level: 0,
                count: 0,
            };
            for (let i = 0; i < code.length; i++) {
                if (code[i] === '0') {
                    let newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                    let score = that.getScore(newCode);
                    if (score.level > log.level) {
                        log.level = score.level;
                        log.value = score.value;
                        log.type = score.type;
                        log.count = 1;
                    } else if (score.level === log.level) {
                        // tothink 以type还是value来比较
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
                            value: 12000,
                            type: ChessType.DEAD_THREE
                        };
                    } else {
                        scoreMap[code] = {
                            level: 4,
                            value: log.value / 100 - (log.count > 1 ? 0 : 2000),
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
                    break;
            }
        }
    }
    private addCandidatesToScoreMap() {
        const { scoreMap } = this;
        for (let code in scoreMap) {
            const score = scoreMap[code];
            const candidates = [];
            if (score.type === ChessType.ALIVE_FOUR) {
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0' && (code[i + 1] === '1' || code[i - 1] === '1')) {
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        if (/11111/.test(newCode)) {
                            candidates.push(i);
                        }
                    }
                }
            } else if (score.type === ChessType.DEAD_FOUR) {
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0' && (code[i + 1] === '1' || code[i - 1] === '1')) {
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        if (/11111/.test(newCode)) {
                            candidates.push(i);
                            break;
                        }
                    }
                }
            } else if (score.type === ChessType.ALIVE_THREE) {
                const keyCandidates = [];
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0') {
                        const left = this.getScore(code.slice(0, i));
                        const right = this.getScore(code.slice(i + 1));
                        if (left.level < score.level && right.level < score.level) {
                            candidates.push(i);
                        }
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        const newScore = this.getScore(newCode);
                        if (newScore.level > score.level) {
                            keyCandidates.push(i);
                        }
                    }
                }
                if (!keyCandidates.length) {
                    console.error('error')
                }
                // 遇上活三加死四类的情况，candidates为空，因此在这里赋值
                score.candidates = candidates;
                score.keyCandidates = keyCandidates;
            } else if (score.type === ChessType.DEAD_THREE) {
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0') {
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        if (this.getScore(newCode).type === ChessType.DEAD_FOUR) {
                            candidates.push(i);
                        }
                    }
                }
            } else if (score.type === ChessType.ALIVE_TWO) {
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0') {
                        const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        if (this.getScore(newCode).type === ChessType.ALIVE_THREE) {
                            candidates.push(i);
                        }
                    }
                }
            }
            if (candidates.length) {
                score.candidates = candidates;
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
        let revCode = code.split('').reverse().join('');
        return this.scoreMap[revCode];
    }
    computeTotalScore(color: Color) {
        const { scoreMap, black, white } = this;
        const { map } = this.board;
        let code: string;
        const bookkeeping = color === Color.BLACK ? black : white;
        const that = this;
        // h -
        let y: number, x: number;
        for (y = 0; y < 15; y++) {
            code = '';
            for (x = 0; x < 15; x++) {
                addCode(y, x, 'h', bookkeeping);
            }
            if (code) {
                this.logItem(code, y, x, 'h', bookkeeping);
            }
        }
        // p |
        for (x = 0; x < 15; x++) {
            code = '';
            for (y = 0; y < 15; y++) {
                addCode(y, x, 'p', bookkeeping);
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
                addCode(y, x, 's', bookkeeping);
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
                addCode(y, x, 'b', bookkeeping);
            }
            if (code) {
                this.logItem(code, y, x, 'b', bookkeeping);
            }
        }
        function addCode(y: number, x: number, dir: string, obj: Bookkeeping) {
            if (map[y][x] === 0) {
                code += '0';
            } else if (map[y][x] === color) {
                code += '1';
            } else if (code) {
                that.logItem(code, y, x, dir, obj);
                code = '';
            }
        }
    }
    private logBookkeeping(y0: number, x0: number, color: Color): ChessType {
        const { black, white } = this;
        const { map } = this.board;
        const that = this;
        const bookkeeping = color === Color.BLACK ? black : white;
        let y: number, x: number;
        let maxTypeOfThisPoint = { type: ChessType.ZERO };

        // h -
        let code = '';
        for (x = 0; x < 15; x++) {
            addCode(y0, x, 'h', bookkeeping);
        }
        if (code) {
            this.logItem(code, y0, x, 'h', bookkeeping, maxTypeOfThisPoint);
        }

        // p |
        code = '';
        for (y = 0; y < 15; y++) {
            addCode(y, x0, 'p', bookkeeping);
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
            addCode(y, x, 's', bookkeeping);
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
            addCode(y, x, 'b', bookkeeping);
        }
        if (code) {
            this.logItem(code, y, x, 'b', bookkeeping, maxTypeOfThisPoint);
        }

        return maxTypeOfThisPoint.type;
        function addCode(y: number, x: number, dir: string, obj: Bookkeeping) {
            if (map[y][x] === 0) {
                code += '0';
            } else if (map[y][x] === color) {
                code += '1';
            } else if (code) {
                that.logItem(code, y, x, dir, obj, maxTypeOfThisPoint);
                code = '';
            }
        }
    }
    private logItem(code: string, yEnd: number, xEnd: number, dir: string, obj: Bookkeeping, maxTypeOfThisPoint?: { type: ChessType }) {
        const { scoreMap } = this;
        if (code.length < 5) {
            return;
        }
        if (!code.includes('1')) {
            return;
        }
        const score = this.getScore(code);
        const isRev = score !== scoreMap[code];
        const item: BookkeepingItem = {
            code,
            value: score.value,
            type: score.type,
            level: score.level
        };

        let key = -1;
        let book: BookkeepingTable;
        switch (dir) {
            case 'h':
                if (score.level >= 4 && score.level <= 8) {
                    item.candidates = score.candidates!.map(pos => {
                        if (isRev) {
                            pos = code.length - 1 - pos;
                        }
                        return [yEnd, xEnd - code.length + pos];
                    });
                    if (score.keyCandidates) {
                        item.keyCandidates = score.keyCandidates.map(pos => {
                            if (isRev) {
                                pos = code.length - 1 - pos;
                            }
                            return [yEnd, xEnd - code.length + pos];
                        });
                    }
                }
                key = yEnd;
                book = obj.h;
                break;
            case 'p':
                if (score.level >= 4 && score.level <= 8) {
                    item.candidates = score.candidates!.map(pos => {
                        if (isRev) {
                            pos = code.length - 1 - pos;
                        }
                        return [yEnd - code.length + pos, xEnd];
                    });
                    if (score.keyCandidates) {
                        item.keyCandidates = score.keyCandidates.map(pos => {
                            if (isRev) {
                                pos = code.length - 1 - pos;
                            }
                            return [yEnd - code.length + pos, xEnd];
                        });
                    }
                }
                key = xEnd;
                book = obj.p;
                break;
            case 's':
                if (score.level >= 4 && score.level <= 8) {
                    item.candidates = score.candidates!.map(pos => {
                        if (isRev) {
                            pos = code.length - 1 - pos;
                        }
                        return [yEnd - code.length + pos, xEnd + code.length - pos];
                    });
                    if (score.keyCandidates) {
                        item.keyCandidates = score.keyCandidates.map(pos => {
                            if (isRev) {
                                pos = code.length - 1 - pos;
                            }
                            return [yEnd - code.length + pos, xEnd + code.length - pos];
                        });
                    }
                }
                key = xEnd + code.length + yEnd - code.length;
                book = obj.s;
                break;
            default: // case: 'b'
                if (score.level >= 4 && score.level <= 8) {
                    item.candidates = score.candidates!.map(pos => {
                        if (isRev) {
                            pos = code.length - 1 - pos;
                        }
                        return [yEnd - code.length + pos, xEnd - code.length + pos];
                    });
                    if (score.keyCandidates) {
                        item.keyCandidates = score.keyCandidates.map(pos => {
                            if (isRev) {
                                pos = code.length - 1 - pos;
                            }
                            return [yEnd - code.length + pos, xEnd - code.length + pos];
                        });
                    }
                }
                key = 14 - (yEnd - code.length) + (xEnd - code.length);
                book = obj.b;
        }
        (book[key] || (book[key] = [])).push(item);
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
        let res = [
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
        let hKey = y,
            pKey = x,
            sKey = x + y,
            bKey = 14 - y + x;
        deleteKey(black.h, hKey);
        deleteKey(black.p, pKey);
        deleteKey(black.s, sKey);
        deleteKey(black.b, bKey);

        deleteKey(white.h, hKey);
        deleteKey(white.p, pKey);
        deleteKey(white.s, sKey);
        deleteKey(white.b, bKey);
        function deleteKey(table: BookkeepingTable, key: number) {
            delete table[key];
        }
    }
    private clearScoreFake(y: number, x: number) {
        const { black, white } = this;
        let hKey = y,
            pKey = x,
            sKey = x + y,
            bKey = 14 - y + x;
        deleteKey(black.h, hKey);
        deleteKey(black.p, pKey);
        deleteKey(black.s, sKey);
        deleteKey(black.b, bKey);

        deleteKey(white.h, hKey);
        deleteKey(white.p, pKey);
        deleteKey(white.s, sKey);
        deleteKey(white.b, bKey);
        function deleteKey(table: BookkeepingTable, key: number) {
            table[key] = null;
        }
    }
    getTotalScore(color: Color) {
        let book = color === Color.BLACK ? this.black : this.white;
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
                if (table[i]) {
                    table[i]!.forEach(item => {
                        // tothink value还是type
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
}