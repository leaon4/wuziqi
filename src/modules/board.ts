import { Color } from './definition';

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
    private _setCandidates(y: number, x: number, callBack: Function): void {
        const { map } = this;
        const key = y * 15 + x;
        callBack(key, false);
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
                const key = y * 15 + x;
                callBack(key, true);
            }
        }
    }
    /**
     * 每当有一个棋子落下时，它本身的位置不能再下，因此置为false
     * 它周围4个方向的棋子，根据MAX_CHESS_LENGTH的配置，只要还是空的，
     * 就都能下，都添加进candidates
     */
    setCandidates(y: number, x: number, candidatesMap: boolean[][]): void {
        this._setCandidates(y, x, (key: number, value: boolean) => {
            candidatesMap[key][0] = value;
        });
    }
    /**
     * 在假设性落子阶段调用
     * 以栈的方式记录candidatesMap，以便能快速恢复
     */
    setCandidatesFake(y: number, x: number, candidatesMap: boolean[][]): void {
        this._setCandidates(y, x, (key: number, value: boolean) => {
            candidatesMap[key].push(value);
        });
    }
    restoreCandidates(y: number, x: number, candidatesMap: boolean[][]): void {
        this._setCandidates(y, x, (key: number) => {
            candidatesMap[key].pop();
        });
    }
}