import Board from "./board";
import { Color } from "./definition";

export default class ScoreComputer {
    scoreMap: Record<string, number> = {};
    constructor(public borad: Board) {
        this.generateScoreMap();
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
        // console.log((window as any).scoreMap = scoreMap);
        // console.log(Object.keys(scoreMap).length);
        // console.log(new Set(Object.values(scoreMap)));
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
                scoreMap[code] = 7;
            } else if (/011110/.test(code)) {
                scoreMap[code] = 6;
            } else if (/11110/.test(code) || /01111/.test(code)) {
                scoreMap[code] = 5;
            } else {
                let log = {
                    value: 0,
                    pos: 0
                };
                for (let i = 0; i < code.length; i++) {
                    if (code[i] === '0') {
                        let newCode = code.slice(0, i) + '1' + code.slice(i + 1);
                        let value = scoreMap[newCode];
                        if (value === undefined) {
                            let revCode = newCode.split('').reverse().join('');
                            value = scoreMap[revCode];
                        }
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
                    scoreMap[code] = log.value - 1;
                } else {
                    if (log.value === 6) {
                        scoreMap[code] = log.value - 1;
                    } else {
                        scoreMap[code] = log.value - 2;
                    }
                }
            }
        }
    }
    computeTotalScore(color: Color) {
        const { scoreMap } = this;
        const { map } = this.borad;
        let max = {
            value: -1,
            code: ''
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
            let value = scoreMap[code];
            if (typeof value !== 'number') {
                let revCode = code.split('').reverse().join('');
                value = scoreMap[revCode];
            }
            if (value > max.value) {
                max.value = value;
                max.code = code;
            }
        }
    }
}