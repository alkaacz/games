// Získání canvasů a kontextů
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

// Konstanty
const ROWS = 20;
const COLS = 12;
const BLOCK_SIZE = 20;
const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

// Tetromina (tvary)
const SHAPES = [
    [],
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]]  // Z
];

// Herní stav
let board = createBoard();
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameRunning = false;
let gamePaused = false;
let dropInterval = 1000;
let lastDropTime = 0;

// Vytvoření prázdné herní plochy
function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Třída pro tetromino
class Piece {
    constructor(shape) {
        this.shape = shape;
        this.color = SHAPES.indexOf(shape);
        this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
        this.y = 0;
    }

    draw(context, offsetX = 0, offsetY = 0) {
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    context.fillStyle = COLORS[value];
                    context.fillRect(
                        (this.x + x + offsetX) * BLOCK_SIZE,
                        (this.y + y + offsetY) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                    
                    // Přidání 3D efektu
                    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    context.lineWidth = 2;
                    context.strokeRect(
                        (this.x + x + offsetX) * BLOCK_SIZE,
                        (this.y + y + offsetY) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        if (this.collides()) {
            this.x -= dx;
            this.y -= dy;
            return false;
        }
        return true;
    }

    rotate() {
        const rotated = this.shape[0].map((_, i) =>
            this.shape.map(row => row[i]).reverse()
        );
        const previousShape = this.shape;
        this.shape = rotated;
        
        // Wall kick - pokus o posunutí při kolizi po rotaci
        let kicked = false;
        if (this.collides()) {
            this.x++;
            if (this.collides()) {
                this.x -= 2;
                if (this.collides()) {
                    this.x++;
                    this.shape = previousShape;
                } else {
                    kicked = true;
                }
            } else {
                kicked = true;
            }
        }
    }

    collides() {
        return this.shape.some((row, y) =>
            row.some((value, x) => {
                if (value !== 0) {
                    const newX = this.x + x;
                    const newY = this.y + y;
                    return (
                        newX < 0 ||
                        newX >= COLS ||
                        newY >= ROWS ||
                        (newY >= 0 && board[newY][newX] !== 0)
                    );
                }
                return false;
            })
        );
    }

    lock() {
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = this.y + y;
                    const boardX = this.x + x;
                    if (boardY >= 0) {
                        board[boardY][boardX] = value;
                    }
                }
            });
        });
    }
}

// Vytvoření nového náhodného tetromina
function createPiece() {
    const shapeIndex = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    return new Piece(SHAPES[shapeIndex]);
}

// Vykreslení herní plochy
function drawBoard() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vykreslení mřížky
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }

    // Vykreslení umístěných bloků
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
                
                // 3D efekt
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
}

// Vykreslení dalšího tetromina
function drawNextPiece() {
    nextCtx.fillStyle = '#111';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;
        
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    nextCtx.fillStyle = COLORS[value];
                    nextCtx.fillRect(
                        (x + offsetX) * BLOCK_SIZE,
                        (y + offsetY) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                    
                    nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    nextCtx.lineWidth = 2;
                    nextCtx.strokeRect(
                        (x + offsetX) * BLOCK_SIZE,
                        (y + offsetY) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }
}

// Odstranění plných řádků
function clearLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Zkontrolovat stejný řádek znovu
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;
        score += [0, 100, 300, 500, 800][linesCleared] * level;
        level = Math.floor(lines / 10) + 1;
        updateDropInterval();
        updateDisplay();
    }
}

// Aktualizace intervalu pádu podle skóre
function updateDropInterval() {
    if (score >= 50) {
        // Po 50 bodech se zrychlí o 0,1 (100ms) za každých 10 bodů
        const speedIncrement = Math.floor((score - 50) / 10) + 1;
        dropInterval = Math.max(100, 1000 - speedIncrement * 100);
    } else {
        dropInterval = 1000;
    }
}

// Aktualizace zobrazení skóre
function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
    // Rychlost zobrazená jako násobek (1.0x = výchozí rychlost)
    const speedMultiplier = (1000 / dropInterval).toFixed(1);
    document.getElementById('speed').textContent = speedMultiplier + 'x';
}

// Kontrola konce hry
function checkGameOver() {
    return board[0].some(cell => cell !== 0);
}

// Spawn nového tetromina
function spawnPiece() {
    if (!nextPiece) {
        nextPiece = createPiece();
    }
    currentPiece = nextPiece;
    nextPiece = createPiece();
    
    if (currentPiece.collides()) {
        gameOver();
        return false;
    }
    return true;
}

// Hlavní herní smyčka
function gameLoop(timestamp) {
    if (!gameRunning || gamePaused) {
        return;
    }

    const deltaTime = timestamp - lastDropTime;

    if (deltaTime > dropInterval) {
        if (!currentPiece.move(0, 1)) {
            currentPiece.lock();
            clearLines();
            if (!spawnPiece()) {
                return;
            }
        }
        lastDropTime = timestamp;
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Vykreslení celé hry
function draw() {
    drawBoard();
    if (currentPiece) {
        currentPiece.draw(ctx);
    }
    drawNextPiece();
}

// Konec hry
function gameOver() {
    gameRunning = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText(`Skóre: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
}

// Start hry
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        lastDropTime = 0;
        spawnPiece();
        requestAnimationFrame(gameLoop);
    }
}

// Pauza
function pauseGame() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        if (!gamePaused) {
            lastDropTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }
}

// Restart hry
function restartGame() {
    board = createBoard();
    currentPiece = null;
    nextPiece = null;
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    gameRunning = false;
    gamePaused = false;
    updateDisplay();
    draw();
    startGame();
}

// Ovládání klávesnicí
document.addEventListener('keydown', (e) => {
    if (!gameRunning || gamePaused) {
        if (e.key === 'p' || e.key === 'P') {
            pauseGame();
        }
        return;
    }

    switch (e.key) {
        case 'ArrowLeft':
            currentPiece.move(-1, 0);
            break;
        case 'ArrowRight':
            currentPiece.move(1, 0);
            break;
        case 'ArrowDown':
            // Hard drop - cihla padá úplně dolů
            while (currentPiece.move(0, 1)) {
                score += 1;
            }
            updateDropInterval();
            updateDisplay();
            break;
        case 'ArrowUp':
        case ' ':
            currentPiece.rotate();
            break;
        case 'p':
        case 'P':
            pauseGame();
            break;
    }
    draw();
    e.preventDefault();
});

// Tlačítka
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', pauseGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);

// Mobilní tlačítka ovládání
document.getElementById('leftBtn').addEventListener('click', () => {
    if (gameRunning && !gamePaused && currentPiece) {
        currentPiece.move(-1, 0);
        draw();
    }
});

document.getElementById('rightBtn').addEventListener('click', () => {
    if (gameRunning && !gamePaused && currentPiece) {
        currentPiece.move(1, 0);
        draw();
    }
});

document.getElementById('downBtn').addEventListener('click', () => {
    if (gameRunning && !gamePaused && currentPiece) {
        // Hard drop - cihla padá úplně dolů
        while (currentPiece.move(0, 1)) {
            score += 1;
        }
        updateDropInterval();
        updateDisplay();
        draw();
    }
});

document.getElementById('rotateBtn').addEventListener('click', () => {
    if (gameRunning && !gamePaused && currentPiece) {
        currentPiece.rotate();
        draw();
    }
});

// Inicializace
updateDisplay();
draw();
