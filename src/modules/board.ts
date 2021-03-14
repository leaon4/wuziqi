/**
 *  -  h  horizon
 *  |  p  portrait
 *  /  s  slash
 *  \  b  back slash
 */
import { Color, Rec } from './definition';

export default class Board {
    map: number[][] = [];
    hasInitialMap = false;
    constructor(public MAX_CHESS_LENGTH = 1, map?: number[][],) {
        this.reset(map);
    }
    reset(map?: number[][]) {
        if (map) {
            this.hasInitialMap = true;
            this.map = map;
        } else {
            this.hasInitialMap = false;
            this.map = [];
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
        this.map[y][x] = 0;
    }
    isFull() {
        // todo
        return false;
    }
    /* setCandidates(y: number, x: number, candidates: boolean[][]): void {
        const { map } = this;
        let key = y * 15 + x;
        if (candidates.hasOwnProperty(key)) {
            delete candidates[key];
        } else if (candidates[key]) {
            candidates[key] = false;
        }
        for (let i = 1; i <= this.MAX_CHESS_LENGTH; i++) {
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
                let key = y * 15 + x;
                if (!candidates[key]) {
                    candidates[key] = true;
                }
            }
        }
    } */
    setCandidatesFlat(y: number, x: number, candidatesMap: boolean[][]): void {
        const { map } = this;
        let key = y * 15 + x;
        candidatesMap[key][0] = false;
        for (let i = 1; i <= this.MAX_CHESS_LENGTH; i++) {
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
                let key = y * 15 + x;
                candidatesMap[key][0] = true;
            }
        }
    }
    setCandidates(y: number, x: number, candidatesMap: boolean[][]): void {
        const { map } = this;
        let key = y * 15 + x;
        candidatesMap[key].push(false);
        for (let i = 1; i <= this.MAX_CHESS_LENGTH; i++) {
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
                let key = y * 15 + x;
                candidatesMap[key].push(true);
            }
        }
    }
    restoreCandidates(y: number, x: number, candidatesMap: boolean[][]): void {
        const { map } = this;
        let key = y * 15 + x;
        candidatesMap[key].pop();
        for (let i = 1; i <= this.MAX_CHESS_LENGTH; i++) {
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
                let key = y * 15 + x;
                candidatesMap[key].pop();
            }
        }
    }
}