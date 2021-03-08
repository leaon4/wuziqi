import { Pair } from "./AI";
import { Color } from "./definition";

export default class Zobrist {
    black: number[][] = [];
    white: number[][] = [];
    code: number;
    cache: Record<number, Pair> = {};
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
    has(y: number, x: number, color: Color): boolean {
        return false;
        return this.code in this.cache;
    }
    get(y: number, x: number, color: Color): Pair {
        // console.log(1)
        return this.cache[this.code];
    }
    set(result: Pair) {
        // this.cache[this.code] = result;
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