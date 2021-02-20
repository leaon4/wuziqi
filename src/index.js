const canvas = document.getElementById('canvas');
const position = document.getElementById('position');
canvas.width = 450;
canvas.height = 450;
const GRID_WIDTH = 30;
const ctx = canvas.getContext('2d');

canvas.addEventListener('mousemove', e => {
    let y = Math.round(e.offsetY / GRID_WIDTH);
    let x = Math.round(e.offsetX / GRID_WIDTH);
    position.textContent = y + ',' + x;
});

drawMap()

function drawMap() {
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
    function drawMapPoint(y, x) {
        ctx.beginPath();
        ctx.arc(GRID_WIDTH / 2 + x * GRID_WIDTH, GRID_WIDTH / 2 + y * GRID_WIDTH, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
}