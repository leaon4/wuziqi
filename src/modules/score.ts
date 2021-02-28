import Board from "./board";
import { Color } from "./definition";

type BookkeepingItem = {
    code: string;
    value: number;
    type?: string;
    candidates?: number[][];
    startPoint?: number[];
};

type Bookkeeping = {
    h: Record<string, BookkeepingItem[]>;
    p: Record<string, BookkeepingItem[]>;
    s: Record<string, BookkeepingItem[]>;
    b: Record<string, BookkeepingItem[]>;
}

export default class ScoreComputer {
    scoreMap: Record<string, {
        value: number,
        type?: string,
        candidates?: number[]
    }> = {};
    black: Bookkeeping = {
        h: {},
        p: {},
        s: {},
        b: {}
    };
    white: Bookkeeping = {
        h: {},
        p: {},
        s: {},
        b: {}
    };
    constructor(public borad: Board) {
        console.time('generateScoreMap')
        this.generateScoreMap();
        console.timeEnd('generateScoreMap')
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
                    for (let i = 0; i < code.length; i++) {
                        if (code[i] === '0') {
                            const left = this.getScore(code.slice(0, i));
                            const right = this.getScore(code.slice(i + 1));
                            if (left.value < score.value && right.value < score.value) {
                                candidates.push(i);
                            }
                        }
                    }
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
        const { scoreMap } = this;
        const { map } = this.borad;
        let max = {
            value: 0,
            code: '',
            type: ''
        };
        let code: string;
        // h -
        for (let y = 0; y < 15; y++) {
            code = '';
            for (let x = 0; x < 15; x++) {
                addCode(y, x);
            }
            if (code) {
                findMaxScore(code);
            }
        }
        // p |
        for (let x = 0; x < 15; x++) {
            code = '';
            for (let y = 0; y < 15; y++) {
                addCode(y, x);
            }
            if (code) {
                findMaxScore(code);
            }
        }

        // s /
        for (let i = 4; i <= 24; i++) {
            code = '';
            let y0 = Math.max(0, i - 14), x0 = Math.min(14, i);
            for (let y = y0, x = x0; x >= 0 && y <= 14; x--, y++) {
                addCode(y, x);
            }
            if (code) {
                findMaxScore(code);
            }
        }

        // b \
        for (let i = 4; i <= 24; i++) {
            code = '';
            let y0 = Math.max(0, 14 - i), x0 = Math.max(0, i - 14);
            for (let y = y0, x = x0; x <= 14 && y <= 14; x++, y++) {
                addCode(y, x);
            }
            if (code) {
                findMaxScore(code);
            }
        }

        return max;

        function addCode(y: number, x: number) {
            if (map[y][x] === 0) {
                code += '0';
            } else if (map[y][x] === color) {
                code += '1';
            } else if (code) {
                findMaxScore(code);
                code = '';
            }
        }
        function findMaxScore(code: string) {
            if (code.length < 5) {
                return;
            }
            let score = scoreMap[code];
            if (!score) {
                let revCode = code.split('').reverse().join('');
                score = scoreMap[revCode];
            }
            let value = score && score.value;
            if (value > max.value) {
                max.value = score.value;
                max.code = code;
                max.type = score.type as string;
            }
        }
    }
    private logBookkeeping(y0: number, x0: number, color: Color) {
        const { scoreMap, black, white } = this;
        const { map } = this.borad;
        const that = this;
        const bookkeeping = color === Color.BLACK ? black : white;
        let y: number, x: number;

        // h -
        let code = '';
        for (x = 0; x < 15; x++) {
            addCode(y0, x, 'h', bookkeeping);
        }
        if (code) {
            createItem(code, y0, x, 'h', bookkeeping);
        }

        // p |
        code = '';
        for (y = 0; y < 15; y++) {
            addCode(y, x0, 'p', bookkeeping);
        }
        if (code) {
            createItem(code, y, x0, 'p', bookkeeping);
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
            createItem(code, y, x, 's', bookkeeping);
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
            createItem(code, y, x, 'b', bookkeeping);
        }

        function addCode(y: number, x: number, dir: string, obj: Bookkeeping) {
            if (map[y][x] === 0) {
                code += '0';
            } else if (map[y][x] === color) {
                code += '1';
            } else if (code) {
                createItem(code, y, x, dir, obj);
                code = '';
            }
        }
        function createItem(code: string, yEnd: number, xEnd: number, dir: string, obj: Bookkeeping) {
            if (code.length < 5) {
                return;
            }
            if (!code.includes('1')) {
                return;
            }
            const score = that.getScore(code);
            const isRev = score !== scoreMap[code];
            const item: BookkeepingItem = {
                code,
                value: score.value,
            };
            if (score.type) {
                item.type = score.type;
            }

            let key = -1;
            let book: typeof black.h;
            switch (dir) {
                case 'h':
                    if (score.value === 5) {
                        item.candidates = score.candidates!.map(pos => {
                            if (isRev) {
                                pos = code.length - 1 - pos;
                            }
                            return [yEnd, xEnd - code.length + pos];
                        });
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
                    }
                    key = 14 - (yEnd - code.length) + (xEnd - code.length);
                    book = obj.b;
            }
            (book[key] || (book[key] = [])).push(item);
        }
    }
    downChess(y: number, x: number, color: Color) {
        this.clearScore(y, x);
        this.logBookkeeping(y, x, Color.BLACK);
        this.logBookkeeping(y, x, Color.WHITE);
    }
    private clearScore(y: number, x: number) {
        const { black, white } = this;
        let hKey = y,
            pKey = x,
            sKey = x + y,
            bKey = 14 - y + x
        delete black.h[hKey];
        delete black.p[pKey];
        delete black.s[sKey];
        delete black.b[bKey];
        delete white.h[hKey];
        delete white.p[pKey];
        delete white.s[sKey];
        delete white.b[bKey];
    }
}