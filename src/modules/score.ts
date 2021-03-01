import Board from "./board";
import { Color } from "./definition";

type BookkeepingItem = {
    code: string;
    value: number;
    type?: string;
    candidates?: number[][];
    // startPoint?: number[];
    keyCandidates?: number[][];
};

type BookkeepingTable = Record<string, BookkeepingItem[] | null>;

type Bookkeeping = {
    h: BookkeepingTable;
    p: BookkeepingTable;
    s: BookkeepingTable;
    b: BookkeepingTable;
    killPoints: Record<string, BookkeepingItem[]>;
}

export default class ScoreComputer {
    scoreMap: Record<string, {
        value: number,
        type?: string,
        candidates?: number[],
        keyCandidates?: number[]
    }> = {};
    black: Bookkeeping = {
        h: {},
        p: {},
        s: {},
        b: {},
        killPoints: {}
    };
    white: Bookkeeping = {
        h: {},
        p: {},
        s: {},
        b: {},
        killPoints: {}
    };
    constructor(public borad: Board) {
        console.time('generateScoreMap')
        this.generateScoreMap();
        console.timeEnd('generateScoreMap')
        // todo board.hasInitialMap
        if (borad.hasInitialMap) {
            this.computeTotalScore(Color.BLACK);
            this.computeTotalScore(Color.WHITE);
        }
    }
    private generateScoreMap() {
        const { scoreMap } = this;
        let arr: number[];
        for (let i = 15; i >= 5; i--) {
            arr = new Array(i).fill(1);
            for (let j = i; j >= 0; j--) {
                permutation(0, j);
            }
        }
        this.addCandidatesToScoreMap();
        // console.log((window as any).scoreMap = scoreMap);
        // console.log(Object.keys(scoreMap).length);
        // console.log(new Set(Object.values(scoreMap)));
        // for (let code in scoreMap) {
        //     if (scoreMap[code].value === 5) {
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
                scoreMap[code] = {
                    value: 7,
                };
            } else if (/011110/.test(code)) {
                scoreMap[code] = { value: 6 };
            } else if (/11110/.test(code) || /01111/.test(code)) {
                scoreMap[code] = { value: 5, type: 'DeadFour' };
            } else {
                let log = {
                    value: 0,
                    pos: 0
                };
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0') {
                        let newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        let score = scoreMap[newCode];
                        if (score === undefined) {
                            let revCode = newCode.split('').reverse().join('');
                            score = scoreMap[revCode];
                        }
                        let value = score && score.value;
                        if (value) {
                            if (value > log.value) {
                                log.value = value;
                                log.pos = 1;
                            } else if (value === log.value) {
                                log.pos++;
                            }
                        }
                    }
                }
                if (log.pos > 1) {
                    scoreMap[code] = {
                        value: log.value - 1
                    };
                } else {
                    if (log.value === 7) {
                        // 死四
                        scoreMap[code] = {
                            value: 5,
                            type: 'DeadFour'
                        };
                    } else if (log.value === 6) {
                        // 某些子，如'010110'，尽管没有两处子下，构成活四，
                        // 但只要有一处能构成，威胁等级依然等同于活三，是必防的
                        scoreMap[code] = { value: log.value - 1 };
                    } else {
                        scoreMap[code] = { value: log.value - 2 };
                    }
                }
            }
        }
    }
    private addCandidatesToScoreMap() {
        const { scoreMap } = this;
        for (let code in scoreMap) {
            const score = scoreMap[code];
            if (score.value === 5) {
                const candidates = [];
                if (score.type === 'DeadFour') {
                    for (let i = 0; i < code.length; i++) {
                        if (code[i] === '0' && (code[i + 1] === '1' || code[i - 1] === '1')) {
                            const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                            if (/11111/.test(newCode)) {
                                candidates.push(i);
                            }
                        }
                    }
                } else {
                    const keyCandidates = [];
                    for (let i = 0; i < code.length; i++) {
                        if (code[i] === '0') {
                            const left = this.getScore(code.slice(0, i));
                            const right = this.getScore(code.slice(i + 1));
                            if (left.value < score.value && right.value < score.value) {
                                candidates.push(i);
                            }
                            const newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                            const newScore = this.getScore(newCode);
                            if (newScore.value === 6) {
                                keyCandidates.push(i);
                            }
                        }
                    }
                    if (!keyCandidates.length) {
                        console.error('error')
                    }
                    score.keyCandidates = keyCandidates;
                }
                score.candidates = candidates;
            }
        }
    }
    private getScore(code: string) {
        if (code.length < 5) {
            return {
                value: 0
            };
        }
        if (this.scoreMap[code]) {
            return this.scoreMap[code];
        }
        let revCode = code.split('').reverse().join('');
        return this.scoreMap[revCode];
    }
    computeTotalScore(color: Color) {
        const { scoreMap, black, white } = this;
        const { map } = this.borad;
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
    private logBookkeeping(y0: number, x0: number, color: Color): boolean {
        const { black, white } = this;
        const { map } = this.borad;
        const that = this;
        const bookkeeping = color === Color.BLACK ? black : white;
        let y: number, x: number;
        let isWin = { flag: false };

        // h -
        let code = '';
        for (x = 0; x < 15; x++) {
            addCode(y0, x, 'h', bookkeeping);
        }
        if (code) {
            this.logItem(code, y0, x, 'h', bookkeeping, isWin);
        }

        // p |
        code = '';
        for (y = 0; y < 15; y++) {
            addCode(y, x0, 'p', bookkeeping);
        }
        if (code) {
            this.logItem(code, y, x0, 'p', bookkeeping, isWin);
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
            this.logItem(code, y, x, 's', bookkeeping, isWin);
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
            this.logItem(code, y, x, 'b', bookkeeping, isWin);
        }

        return isWin.flag;
        function addCode(y: number, x: number, dir: string, obj: Bookkeeping) {
            if (map[y][x] === 0) {
                code += '0';
            } else if (map[y][x] === color) {
                code += '1';
            } else if (code) {
                that.logItem(code, y, x, dir, obj, isWin);
                code = '';
            }
        }
    }
    private logItem(code: string, yEnd: number, xEnd: number, dir: string, obj: Bookkeeping, res?: { flag: boolean }) {
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
        };
        if (score.type) {
            item.type = score.type;
        }

        let key = -1;
        let book: BookkeepingTable;
        switch (dir) {
            case 'h':
                if (score.value === 5) {
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
                if (score.value === 5) {
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
                if (score.value === 5) {
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
                if (score.value === 5) {
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
        if (score.value === 5) {
            item.candidates!.forEach(p => {
                let key = p[0] + ',' + p[1];
                (obj.killPoints[key] || (obj.killPoints[key] = [])).push(item);
            });
        } else if (score.value === 7) {
            res && (res.flag = true);
        }
    }
    downChess(y: number, x: number) {
        this.clearScore(y, x);
        this.logBookkeeping(y, x, Color.BLACK);
        this.logBookkeeping(y, x, Color.WHITE);
    }
    downChessFake(y: number, x: number, color: Color): boolean {
        this.black.h = Object.create(this.black.h);
        this.black.p = Object.create(this.black.p);
        this.black.s = Object.create(this.black.s);
        this.black.b = Object.create(this.black.b);
        this.black.killPoints = Object.create(this.black.killPoints);

        this.white.h = Object.create(this.white.h);
        this.white.p = Object.create(this.white.p);
        this.white.s = Object.create(this.white.s);
        this.white.b = Object.create(this.white.b);
        this.white.killPoints = Object.create(this.white.killPoints);

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
        this.black.killPoints = Object.getPrototypeOf(this.black.killPoints);

        this.white.h = Object.getPrototypeOf(this.white.h);
        this.white.p = Object.getPrototypeOf(this.white.p);
        this.white.s = Object.getPrototypeOf(this.white.s);
        this.white.b = Object.getPrototypeOf(this.white.b);
        this.white.killPoints = Object.getPrototypeOf(this.white.killPoints);
    }
    private clearScore(y: number, x: number) {
        const { black, white } = this;
        let hKey = y,
            pKey = x,
            sKey = x + y,
            bKey = 14 - y + x;
        deleteKey(black.h, hKey, black.killPoints);
        deleteKey(black.p, pKey, black.killPoints);
        deleteKey(black.s, sKey, black.killPoints);
        deleteKey(black.b, bKey, black.killPoints);

        deleteKey(white.h, hKey, white.killPoints);
        deleteKey(white.p, pKey, white.killPoints);
        deleteKey(white.s, sKey, white.killPoints);
        deleteKey(white.b, bKey, white.killPoints);
        function deleteKey(table: BookkeepingTable, key: number, killPoints: typeof black.killPoints) {
            if (table[key]) {
                table[key]!.forEach(item => {
                    // 有candidates说明是活三死四
                    if (item.candidates) {
                        item.candidates.forEach(p => {
                            let key = p[0] + ',' + p[1];
                            if (killPoints[key]) {
                                let idx = killPoints[key].findIndex(item2 => {
                                    return item2.code === item.code;
                                });
                                if (idx > -1) {
                                    killPoints[key].splice(idx, 1);
                                    if (!killPoints[key].length) {
                                        delete killPoints[key]
                                    }
                                }
                            }
                        })
                    }
                })
            }
            delete table[key];
        }
    }
    private clearScoreFake(y: number, x: number) {
        const { black, white } = this;
        let hKey = y,
            pKey = x,
            sKey = x + y,
            bKey = 14 - y + x;
        deleteKey(black.h, hKey, black.killPoints);
        deleteKey(black.p, pKey, black.killPoints);
        deleteKey(black.s, sKey, black.killPoints);
        deleteKey(black.b, bKey, black.killPoints);

        deleteKey(white.h, hKey, white.killPoints);
        deleteKey(white.p, pKey, white.killPoints);
        deleteKey(white.s, sKey, white.killPoints);
        deleteKey(white.b, bKey, white.killPoints);
        function deleteKey(table: BookkeepingTable, key: number, killPoints: typeof black.killPoints) {
            if (table[key]) {
                table[key]!.forEach(item => {
                    // 有candidates说明是活三死四
                    if (item.candidates) {
                        item.candidates.forEach(p => {
                            let key = p[0] + ',' + p[1];
                            if (!killPoints.hasOwnProperty(key)) {
                                // 从原型上复制
                                killPoints[key] = killPoints[key].slice();
                            }
                            let idx = killPoints[key].findIndex(item2 => {
                                return item2.code === item.code;
                            });
                            if (idx > -1) {
                                killPoints[key].splice(idx, 1);
                            }
                        })
                    }
                })
            }
            table[key] = null;
        }
    }
    getMaxScore(color: Color) {
        let book = color === Color.BLACK ? this.black : this.white;
        let max: BookkeepingItem = {
            value: -1,
            code: ''
        }
        findMax(book.h);
        findMax(book.p);
        findMax(book.s);
        findMax(book.b);
        return max;
        function findMax(table: BookkeepingTable) {
            for (let i in table) {
                if (table[i]) {
                    table[i]!.forEach(item => {
                        if (item.value > max.value) {
                            max = item;
                        }
                    });
                }
            }
        }
    }
    findKeyPointOfAliveThree(item: BookkeepingItem) {
        //assert
        if (item.value !== 5 || item.type) {
            console.error('findKeyPointOfAliveThree');
            return;
        }
    }
}