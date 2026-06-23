import { App } from '../core/App.js';

export class MinesweeperApp extends App {
    constructor(webOS) {
        super('minesweeper', 'Minesweeper', 'fas fa-bomb', webOS, {
            window: { width: 400, height: 480, minWidth: 300, minHeight: 350, customClass: 'minesweeper-app' },
            allowMultipleInstances: true
        });
        this.windows = new Map();
    }

    _state(windowInstance) {
        return windowInstance ? this.windows.get(windowInstance.id) : null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        const rows = 10;
        const cols = 10;
        const mines = 15;

        contentElement.innerHTML = `
            <div class="minesweeper-game">
                <div class="game-info">
                    <button class="new-game-button" title="New Game"><i class="fas fa-redo"></i> New Game</button>
                    <div class="info-panel">
                        <span><i class="fas fa-flag"></i> Mines: <span class="mines-left">${mines}</span></span>
                        <span><i class="fas fa-clock"></i> Time: <span class="timer">0</span>s</span>
                    </div>
                </div>
                <div class="game-board">
                </div>
                <div class="game-status">Click to start!</div>
            </div>
        `;

        const state = {
            rows,
            cols,
            mines,
            board: [],
            revealedCells: 0,
            flagsPlaced: 0,
            gameOver: false,
            firstClick: true,
            timerInterval: null,
            secondsElapsed: 0,
            boardElement: contentElement.querySelector('.game-board'),
            statusElement: contentElement.querySelector('.game-status'),
            timerElement: contentElement.querySelector('.timer'),
            minesLeftElement: contentElement.querySelector('.mines-left')
        };
        this.windows.set(windowInstance.id, state);

        contentElement.querySelector('.new-game-button').addEventListener('click', () => this.resetGame(windowInstance));

        state.boardElement.addEventListener('click', (e) => this._handleCellClick(e, windowInstance));
        state.boardElement.addEventListener('contextmenu', (e) => this._handleCellRightClick(e, windowInstance));

        windowInstance.on('close', () => {
            const s = this._state(windowInstance);
            if (s && s.timerInterval) clearInterval(s.timerInterval);
            this.windows.delete(windowInstance.id);
        });

        this.resetGame(windowInstance);
        windowInstance.setTitle("Minesweeper");
    }

    resetGame(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.gameOver = false;
        state.firstClick = true;
        state.revealedCells = 0;
        state.flagsPlaced = 0;
        state.secondsElapsed = 0;

        if (state.timerInterval) clearInterval(state.timerInterval);
        state.timerElement.textContent = '0';
        state.minesLeftElement.textContent = state.mines;
        state.statusElement.textContent = 'Click to start!';
        state.statusElement.className = 'game-status';

        this._createBoard(windowInstance);
        this._renderBoard(windowInstance);
    }

    _startTimer(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.timerInterval = setInterval(() => {
            state.secondsElapsed++;
            state.timerElement.textContent = state.secondsElapsed;
        }, 1000);
    }

    _createBoard(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.board = Array(state.rows).fill(null).map(() =>
            Array(state.cols).fill(null).map(() => ({
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0
            }))
        );
    }

    _placeMines(windowInstance, firstClickRow, firstClickCol) {
        const state = this._state(windowInstance);
        if (!state) return;
        let minesToPlace = state.mines;
        while (minesToPlace > 0) {
            const r = Math.floor(Math.random() * state.rows);
            const c = Math.floor(Math.random() * state.cols);
            if ((Math.abs(r - firstClickRow) <= 1 && Math.abs(c - firstClickCol) <= 1) || state.board[r][c].isMine) {
                continue;
            }
            state.board[r][c].isMine = true;
            minesToPlace--;
        }

        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                if (state.board[r][c].isMine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols && state.board[nr][nc].isMine) {
                            count++;
                        }
                    }
                }
                state.board[r][c].adjacentMines = count;
            }
        }
    }

    _renderBoard(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.boardElement.innerHTML = '';
        state.boardElement.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                const cell = state.board[r][c];
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
                state.boardElement.appendChild(cellEl);
            }
        }
    }

    _handleCellClick(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (state.gameOver) return;
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        const r = parseInt(cellEl.dataset.row);
        const c = parseInt(cellEl.dataset.col);
        const cell = state.board[r][c];

        if (cell.isRevealed || cell.isFlagged) return;

        if (state.firstClick) {
            this._placeMines(windowInstance, r, c);
            this._startTimer(windowInstance);
            state.firstClick = false;
            state.statusElement.textContent = 'Game in progress!';
        }

        if (cell.isMine) {
            this._gameOver(windowInstance, false);
            cell.isRevealed = true;
        } else {
            this._revealCell(windowInstance, r, c);
            this._checkWinCondition(windowInstance);
        }
        this._renderBoard(windowInstance);
    }

    _handleCellRightClick(e, windowInstance) {
        e.preventDefault();
        const state = this._state(windowInstance);
        if (!state) return;
        if (state.gameOver || state.firstClick) return;

        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        const r = parseInt(cellEl.dataset.row);
        const c = parseInt(cellEl.dataset.col);
        const cell = state.board[r][c];

        if (cell.isRevealed) return;

        if (cell.isFlagged) {
            cell.isFlagged = false;
            state.flagsPlaced--;
        } else {
            if (state.flagsPlaced < state.mines) {
                cell.isFlagged = true;
                state.flagsPlaced++;
            } else {
                state.statusElement.textContent = 'No more flags!';
                setTimeout(() => { if(!state.gameOver) state.statusElement.textContent = 'Game in progress!'; }, 2000);
            }
        }
        state.minesLeftElement.textContent = state.mines - state.flagsPlaced;
        this._renderBoard(windowInstance);
    }

    _revealCell(windowInstance, r, c) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return;
        const cell = state.board[r][c];
        if (cell.isRevealed || cell.isFlagged || cell.isMine) return;

        cell.isRevealed = true;
        state.revealedCells++;

        if (cell.adjacentMines === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    this._revealCell(windowInstance, r + dr, c + dc);
                }
            }
        }
    }

    _gameOver(windowInstance, won) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.gameOver = true;
        clearInterval(state.timerInterval);
        if (won) {
            state.statusElement.textContent = 'You won!';
            state.statusElement.className = 'game-status win';
        } else {
            state.statusElement.textContent = 'You lost! Mine found.';
            state.statusElement.className = 'game-status lose';
            state.board.forEach(row => row.forEach(cell => {
                if (cell.isMine) cell.isRevealed = true;
            }));
        }
    }

    _checkWinCondition(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        const totalNonMineCells = state.rows * state.cols - state.mines;
        if (state.revealedCells === totalNonMineCells) {
            this._gameOver(windowInstance, true);
        }
    }
}
