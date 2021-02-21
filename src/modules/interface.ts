import { Color } from './definition';
import Board from './board';

export default class ViewInterface {
    canvas = document.getElementById('canvas') as HTMLCanvasElement;
    position = document.getElementById('position') as HTMLDivElement;
    private GRID_WIDTH = 30;
    ctx = null as unknown as CanvasRenderingContext2D;
    constructor() {
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    }
    init(board: Board) {
        const { canvas, position, GRID_WIDTH } = this;
        canvas.width = 450;
        canvas.height = 450;

        this.drawMap();
        this.addPositionTip();
        this.addDownChessEvent(board);
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
    private addDownChessEvent(board: Board) {
        const { canvas, position } = this;
        canvas.addEventListener('click', e => {
            const [y, x] = this.getMousePoint(e);
            if (board.map[y][x]) {
                return;
            }
            // todo:先就让人下黑棋
            this.downChess(Color.black, y, x);
            board.downChess(Color.black, y, x);
        });
    }
    private downChess(color: Color, y: number, x: number) {
        const { ctx, GRID_WIDTH } = this;
        ctx.fillStyle = color === Color.black ? 'black' : 'white';
        ctx.beginPath();
        ctx.arc(GRID_WIDTH / 2 + x * GRID_WIDTH, GRID_WIDTH / 2 + y * GRID_WIDTH, 10, 0, 2 * Math.PI);
        ctx.fill();
    }
}
