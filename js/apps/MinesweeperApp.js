import { App } from '../core/App.js';

export class MinesweeperApp extends App {
    constructor(webOS) {
        super('minesweeper', 'Minesweeper', 'fas fa-bomb', webOS, {
            window: { width: 400, height: 480, minWidth: 300, minHeight: 350, customClass: 'minesweeper-app' },
            allowMultipleInstances: true
        });
        this.rows = 10;
        this.cols = 10;
        this.mines = 15;

        this.board = [];
        this.revealedCells = 0;
        this.flagsPlaced = 0;
        this.gameOver = false;
        this.firstClick = true;
        this.timerInterval = null;
        this.secondsElapsed = 0;

        this.boardElement = null;
        this.statusElement = null;
        this.timerElement = null;
        this.minesLeftElement = null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        this.activeWindowInstance = windowInstance;
        contentElement.innerHTML = `
            <div class="minesweeper-game">
                <div class="game-info">
                    <button class="new-game-button" title="New Game"><i class="fas fa-redo"></i> New Game</button>
                    <div class="info-panel">
                        <span><i class="fas fa-flag"></i> Mines: <span class="mines-left">${this.mines}</span></span>
                        <span><i class="fas fa-clock"></i> Time: <span class="timer">0</span>s</span>
                    </div>
                </div>
                <div class="game-board">
                </div>
                <div class="game-status">Click to start!</div>
            </div>
        `;

        this.boardElement = contentElement.querySelector('.game-board');
        this.statusElement = contentElement.querySelector('.game-status');
        this.timerElement = contentElement.querySelector('.timer');
        this.minesLeftElement = contentElement.querySelector('.mines-left');

        contentElement.querySelector('.new-game-button').addEventListener('click', () => this.resetGame());

        this.boardElement.addEventListener('click', (e) => this._handleCellClick(e));
        this.boardElement.addEventListener('contextmenu', (e) => this._handleCellRightClick(e));

        this.resetGame();
        windowInstance.setTitle("Minesweeper");
    }

    resetGame() {
        this.gameOver = false;
        this.firstClick = true;
        this.revealedCells = 0;
        this.flagsPlaced = 0;
        this.secondsElapsed = 0;

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerElement.textContent = '0';
        this.minesLeftElement.textContent = this.mines;
        this.statusElement.textContent = 'Click to start!';
        this.statusElement.className = 'game-status';

        this._createBoard();
        this._renderBoard();
    }

    _startTimer() {
        this.timerInterval = setInterval(() => {
            this.secondsElapsed++;
            this.timerElement.textContent = this.secondsElapsed;
        }, 1000);
    }

    _createBoard() {
        this.board = Array(this.rows).fill(null).map(() =>
            Array(this.cols).fill(null).map(() => ({
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0
            }))
        );
    }

    _placeMines(firstClickRow, firstClickCol) {
        let minesToPlace = this.mines;
        while (minesToPlace > 0) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);
            if ((r === firstClickRow && c === firstClickCol) || this.board[r][c].isMine) {
                continue;
            }
            this.board[r][c].isMine = true;
            minesToPlace--;
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].isMine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc].isMine) {
                            count++;
                        }
                    }
                }
                this.board[r][c].adjacentMines = count;
            }
        }
    }

    _renderBoard() {
        this.boardElement.innerHTML = '';
        this.boardElement.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                const cellEl = document.createElement('div');
                cellEl.classList.add('cell');
                cellEl.dataset.row = r;
                cellEl.dataset.col = c;

                if (cell.isRevealed) {
                    cellEl.classList.add('revealed');
                    if (cell.isMine) {
                        cellEl.innerHTML = '<i class="fas fa-bomb"></i>';
                        cellEl.classList.add('mine');
                    } else if (cell.adjacentMines > 0) {
                        cellEl.textContent = cell.adjacentMines;
                        cellEl.classList.add(`count-${cell.adjacentMines}`);
                    }
                } else if (cell.isFlagged) {
                    cellEl.innerHTML = '<i class="fas fa-flag"></i>';
                    cellEl.classList.add('flagged');
                }
                this.boardElement.appendChild(cellEl);
            }
        }
    }

    _handleCellClick(e) {
        if (this.gameOver) return;
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        const r = parseInt(cellEl.dataset.row);
        const c = parseInt(cellEl.dataset.col);
        const cell = this.board[r][c];

        if (cell.isRevealed || cell.isFlagged) return;

        if (this.firstClick) {
            this._placeMines(r,c);
            this._startTimer();
            this.firstClick = false;
            this.statusElement.textContent = 'Game in progress!';
        }

        if (cell.isMine) {
            this._gameOver(false);
            cell.isRevealed = true;
        } else {
            this._revealCell(r, c);
            this._checkWinCondition();
        }
        this._renderBoard();
    }

    _handleCellRightClick(e) {
        e.preventDefault();
        if (this.gameOver || this.firstClick) return;

        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        const r = parseInt(cellEl.dataset.row);
        const c = parseInt(cellEl.dataset.col);
        const cell = this.board[r][c];

        if (cell.isRevealed) return;

        if (cell.isFlagged) {
            cell.isFlagged = false;
            this.flagsPlaced--;
        } else {
            if (this.flagsPlaced < this.mines) {
                cell.isFlagged = true;
                this.flagsPlaced++;
            } else {
                this.statusElement.textContent = 'No more flags!';
                setTimeout(() => { if(!this.gameOver) this.statusElement.textContent = 'Game in progress!'; }, 2000);
            }
        }
        this.minesLeftElement.textContent = this.mines - this.flagsPlaced;
        this._renderBoard();
    }

    _revealCell(r, c) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;
        const cell = this.board[r][c];
        if (cell.isRevealed || cell.isFlagged || cell.isMine) return;

        cell.isRevealed = true;
        this.revealedCells++;

        if (cell.adjacentMines === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    this._revealCell(r + dr, c + dc);
                }
            }
        }
    }

    _gameOver(won) {
        this.gameOver = true;
        clearInterval(this.timerInterval);
        if (won) {
            this.statusElement.textContent = 'You won!';
            this.statusElement.className = 'game-status win';
        } else {
            this.statusElement.textContent = 'You lost! Mine found.';
            this.statusElement.className = 'game-status lose';
            this.board.forEach(row => row.forEach(cell => {
                if (cell.isMine) cell.isRevealed = true;
            }));
        }
    }

    _checkWinCondition() {
        const totalNonMineCells = this.rows * this.cols - this.mines;
        if (this.revealedCells === totalNonMineCells) {
            this._gameOver(true);
        }
    }

    onClose() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        super.onClose();
    }
}
