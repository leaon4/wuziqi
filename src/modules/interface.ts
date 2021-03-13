import { Color } from './definition';
import Board from './board';
import AI from './AI';
import ScoreComputer from './score';

export default class GobangInterface {
    private GRID_WIDTH = 30;
    ctx = null as unknown as CanvasRenderingContext2D;
    currentColor = Color.WHITE;
    constructor(
        public canvas: HTMLCanvasElement,
        public position: HTMLDivElement,
        board: Board,
        ai: AI,
        score: ScoreComputer,
        public useToDrawMap = false
    ) {
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.init(board, ai, score);
    }
    private init(board: Board, ai: AI, score: ScoreComputer) {
        const { canvas } = this;
        canvas.width = 450;
        canvas.height = 450;

        this.drawMap();
        this.addPositionTip();
        this.addBtnEvent();
        if (this.useToDrawMap) {
            this.addDrawMapEvent(board)
        } else {
            this.addDownChessEvent(board, ai, score);
        }
        if (board.hasInitialMap) {
            this.downInitialChess(board);
        }
    }
    private addBtnEvent() {
        const btn = document.getElementById('color-change-btn') as HTMLButtonElement;
        btn.addEventListener('click', () => {
            this.currentColor = this.currentColor === Color.BLACK
                ? Color.WHITE
                : Color.BLACK;
            const text = document.getElementById('current-color') as HTMLElement;
            text.textContent = this.currentColor === Color.BLACK
                ? '黑'
                : '白'
        });
    }
    private downInitialChess(board: Board) {
        const { map } = board;
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 15; x++) {
                if (map[y][x]) {
                    this.downChess(y, x, map[y][x]);
                }
            }
        }
    }
    private drawMap() {
        const { ctx, canvas, GRID_WIDTH } = this;
        ctx.save();
        ctx.fillStyle = '#f6d69f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.strokeStyle = '#745831';
        ctx.fillStyle = '#745831';
        for (let i = 0; i < canvas.width / GRID_WIDTH; i++) {
            ctx.beginPath();
            ctx.moveTo(GRID_WIDTH / 2, i * GRID_WIDTH + GRID_WIDTH / 2);
            ctx.lineTo(canvas.width - GRID_WIDTH / 2, i * GRID_WIDTH + GRID_WIDTH / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(i * GRID_WIDTH + GRID_WIDTH / 2, GRID_WIDTH / 2);
            ctx.lineTo(i * GRID_WIDTH + GRID_WIDTH / 2, canvas.height - GRID_WIDTH / 2);
            ctx.stroke();
        }
        drawMapPoint(3, 3);
        drawMapPoint(3, 11);
        drawMapPoint(11, 3);
        drawMapPoint(11, 11);
        drawMapPoint(7, 7);
        function drawMapPoint(y: number, x: number) {
            ctx.beginPath();
            ctx.arc(GRID_WIDTH / 2 + x * GRID_WIDTH, GRID_WIDTH / 2 + y * GRID_WIDTH, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    private getMousePoint(e: MouseEvent) {
        return [~~(e.offsetY / this.GRID_WIDTH), ~~(e.offsetX / this.GRID_WIDTH)]
    }
    private addPositionTip() {
        const { canvas, position } = this;
        canvas.addEventListener('mousemove', e => {
            const [y, x] = this.getMousePoint(e);
            position.textContent = y + ',' + x;
        });
    }
    private addDownChessEvent(board: Board, ai: AI, score: ScoreComputer) {
        const { canvas } = this;
        canvas.addEventListener('click', e => {
            const [y, x] = this.getMousePoint(e);
            if (board.map[y][x]) {
                return;
            }
            this.downChess(y, x, this.currentColor);
            board.downChess(y, x, this.currentColor);
            score.downChess(y, x);
            console.time('ai');
            const res = ai.think(y, x, this.currentColor);
            console.timeEnd('ai');
            console.log(res);
            const [y1, x1] = res.bestMove;
            let oppsiteColor = this.currentColor === Color.BLACK
                ? Color.WHITE
                : Color.BLACK;
            this.downChess(y1, x1, oppsiteColor);
            board.downChess(y1, x1, oppsiteColor);
            score.downChess(y1, x1);
        });
    }
    private addDrawMapEvent(board: Board) {
        const { canvas } = this;
        canvas.addEventListener('click', e => {
            const [y, x] = this.getMousePoint(e);
            if (board.map[y][x]) {
                return;
            }
            this.downChess(y, x, this.currentColor);
            board.downChess(y, x, this.currentColor);
        });
    }
    private downChess(y: number, x: number, color: Color) {
        const { ctx, GRID_WIDTH } = this;
        ctx.fillStyle = color === Color.BLACK ? 'black' : 'white';
        ctx.beginPath();
        ctx.arc(GRID_WIDTH / 2 + x * GRID_WIDTH, GRID_WIDTH / 2 + y * GRID_WIDTH, 10, 0, 2 * Math.PI);
        ctx.fill();
    }
    reset() {
        // todo
    }
}
