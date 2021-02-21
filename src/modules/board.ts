import { Color } from './definition';
import AI from './AI';

const ai = new AI();

export default class Board {
    map: number[][] = [];
    constructor() {
        for (let y = 0; y < 15; y++) {
            this.map[y] = [];
            for (let x = 0; x < 15; x++) {
                this.map[y][x] = 0;
            }
        }
    }
    init() {


    }
    downChess(color: Color, y: number, x: number) {
        this.map[y][x] = color;
        if (color === Color.black) {
            ai.think()
        }
    }
}