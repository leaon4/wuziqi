import { Pair } from "./AI";
import { Color, Score } from "./definition";

export default class Zobrist {
    black: number[][] = [];
    white: number[][] = [];
    code: number;
    cache: Record<number, { result: Pair, depthMark: number }> = {};
    constructor() {
        this.code = this.getRandom();
        for (let y = 0; y < 15; y++) {
            this.black[y] = [];
            this.white[y] = [];
            for (let x = 0; x < 15; x++) {
                this.black[y][x] = this.getRandom();
                this.white[y][x] = this.getRandom();
            }
        }
    }
    getRandom() {
        return ~~(Math.random() * 1000000000);
    }
    has(y: number, x: number, color: Color, depthMark: number): boolean {
        let res = this.cache[this.code]
        return res && (res.depthMark <= depthMark
            || res.result.value === Score.BLACK_WIN
            || res.result.value === Score.BLACK_LOSE);
        // return this.code in this.cache;
    }
    get(y: number, x: number, color: Color): Pair {
        // console.log(1)
        return this.cache[this.code].result;
    }
    set(result: Pair, depthMark: number) {
        this.cache[this.code] = { result, depthMark };
        return result;
    }
    go(y: number, x: number, color: Color) {
        const map = color === Color.BLACK ? this.black : this.white;
        this.code ^= map[y][x];
    }
    back(y: number, x: number, color: Color) {
        this.go(y, x, color);
    }
}