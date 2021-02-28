/**
 *  -  h  horizon
 *  |  p  portrait
 *  /  s  slash
 *  \  b  back slash
 */
import { Color, Rec } from './definition';

const MAX_CHESS_LENGTH = 1;
export default class Board {
    map: number[][] = [];
    hasInitialMap = false;
    constructor(map?: number[][]) {
        if (map) {
            this.hasInitialMap = true;
            this.map = map;
        } else {
            for (let y = 0; y < 15; y++) {
                this.map[y] = [];
                for (let x = 0; x < 15; x++) {
                    this.map[y][x] = 0;
                }
            }
        }
    }
    downChess(y: number, x: number, color: Color) {
        this.map[y][x] = color;
    }
    restore(y: number, x: number) {
        if (y === 7 && x === 6) {
            // debugger
            let a = y;
        }
        this.map[y][x] = 0;
    }
    isFull() {
        // todo
        return false;
    }
    getContinuities(y0: number, x0: number, color: Color): number[] {
        const { map } = this;
        // return h() >= 5 || p() >= 5 || s() >= 5 || b() >= 5;
        return [h(), p(), s(), b()];

        function h() {
            let continuities = 1;
            let x = x0;
            while (map[y0][--x] === color) {
                continuities++;
            }
            x = x0;
            while (map[y0][++x] === color) {
                continuities++;
            }
            return continuities;
        }
        function p() {
            let continuities = 1;
            let y = y0;
            while (map[--y] && map[y][x0] === color) {
                continuities++;
            }
            y = y0;
            while (map[++y] && map[y][x0] === color) {
                continuities++;
            }
            return continuities;
        }
        function s() {
            let continuities = 1;
            let y = y0, x = x0;
            while (map[--y] && map[y][++x] === color) {
                continuities++;
            }
            y = y0, x = x0;
            while (map[++y] && map[y][--x] === color) {
                continuities++;
            }
            return continuities;
        }
        function b() {
            let continuities = 1;
            let y = y0, x = x0;
            while (map[--y] && map[y][--x] === color) {
                continuities++;
            }
            y = y0, x = x0;
            while (map[++y] && map[y][++x] === color) {
                continuities++;
            }
            return continuities;
        }
    }
    getCandidates(): number[][] {
        const { map } = this;
        const candidates: Record<string, boolean> = {};
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 15; x++) {
                if (map[y][x]) {
                    for (let i = 1; i <= MAX_CHESS_LENGTH; i++) {
                        // h
                        setCandidates(y, x + i);
                        setCandidates(y, x - i);
                        // p
                        setCandidates(y + i, x);
                        setCandidates(y - i, x);
                        // s
                        setCandidates(y - i, x + i);
                        setCandidates(y + i, x - i);
                        // b
                        setCandidates(y + i, x + i);
                        setCandidates(y - i, x - i);
                    }
                }
            }
        }
        const points = Object.keys(candidates).map(item => item.split(',').map(Number));
        return points;
        function setCandidates(y: number, x: number) {
            if (y >= 0 && y < 15 && map[y][x] === 0) {
                let key = y + ',' + x;
                candidates[key] = true;
            }
        }
    }
    setCandidates(y: number, x: number, obj: Rec): void {
        const { map } = this;
        let key = y + ',' + x;
        if (obj.hasOwnProperty(key)) {
            delete obj[key];
        } else if (obj[key]) {
            obj[key] = false;
        }
        for (let i = 1; i <= MAX_CHESS_LENGTH; i++) {
            // h
            setCandidates(y, x + i);
            setCandidates(y, x - i);
            // p
            setCandidates(y + i, x);
            setCandidates(y - i, x);
            // s
            setCandidates(y - i, x + i);
            setCandidates(y + i, x - i);
            // b
            setCandidates(y + i, x + i);
            setCandidates(y - i, x - i);
        }
        function setCandidates(y: number, x: number) {
            if (y >= 0 && y < 15 && map[y][x] === 0) {
                let key = y + ',' + x;
                if (!obj[key]) {
                    obj[key] = true;
                }
            }
        }
    }
}