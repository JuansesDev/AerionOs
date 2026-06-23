import { App } from '../core/App.js';

export class ChessApp extends App {
    constructor(webOS) {
        super('chess', 'Chess', 'fas fa-chess', webOS, {
            window: { width: 520, height: 600, minWidth: 450, minHeight: 520, customClass: 'chess-app' },
            allowMultipleInstances: true
        });

        this.aiPlayer = 'black';

        this.pieces = {
            'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
        };
        this.pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100 };

        this.windows = new Map();
    }

    _state(windowInstance) {
        return windowInstance ? this.windows.get(windowInstance.id) : null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        contentElement.innerHTML = `
            <div class="chess-game">
                <div class="chess-info">
                    <button class="new-chess-game-button" title="New Game"><i class="fas fa-redo"></i> New Game</button>
                    <span class="chess-status">Select a game mode.</span>
                </div>
                <div class="chess-mode-selection">
                    <div class="chess-mode-header">
                        <h2><i class="fas fa-chess"></i> Select a game mode</h2>
                        <p class="chess-mode-subheader">Choose how you want to play chess</p>
                    </div>
                    <div class="chess-mode-options">
                        <div class="chess-mode-card" data-mode="1P">
                            <div class="chess-mode-icon">
                                <i class="fas fa-robot"></i>
                                <i class="fas fa-chess-pawn"></i>
                            </div>
                            <h3>One Player</h3>
                            <p>Play against the AI</p>
                            <button class="chess-mode-button" data-mode="1P">Select</button>
                        </div>
                        <div class="chess-mode-card" data-mode="2P">
                            <div class="chess-mode-icon">
                                <i class="fas fa-user"></i>
                                <i class="fas fa-chess-pawn"></i>
                                <i class="fas fa-user"></i>
                            </div>
                            <h3>Two Players</h3>
                            <p>Play against a friend</p>
                            <button class="chess-mode-button" data-mode="2P">Select</button>
                        </div>
                    </div>
                </div>
                <div class="chess-board" style="display:none;"></div>
            </div>
        `;

        const state = {
            board: [],
            currentPlayer: 'white',
            selectedPiece: null,
            possibleMoves: [],
            gameStatus: 'Select a game mode.',
            gameMode: null,
            isAiThinking: false,
            gameOver: false,
            boardElement: null,
            statusElement: null,
            modeSelectionElement: null
        };

        state.boardElement = contentElement.querySelector('.chess-board');
        state.statusElement = contentElement.querySelector('.chess-status');
        state.modeSelectionElement = contentElement.querySelector('.chess-mode-selection');

        this.windows.set(windowInstance.id, state);
        windowInstance.on('close', () => this.windows.delete(windowInstance.id));

        contentElement.querySelector('.new-chess-game-button').addEventListener('click', () => this._showModeSelection(windowInstance));

        state.modeSelectionElement.querySelectorAll('.chess-mode-card, .chess-mode-button').forEach(element => {
            element.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const mode = target.dataset.mode || target.querySelector('[data-mode]')?.dataset.mode;
                if (mode) {
                    state.gameMode = mode;
                    this._startGame(windowInstance);
                }
            });
        });

        state.boardElement.addEventListener('click', (e) => {
            this._handleSquareClick(e, windowInstance);
        });

        this._showModeSelection(windowInstance);
        windowInstance.setTitle("Chess - Choose Mode");
    }

    _showModeSelection(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.gameOver = false;
        state.gameMode = null;
        state.boardElement.style.display = 'none';
        state.modeSelectionElement.style.display = 'flex';
        state.modeSelectionElement.style.flexDirection = 'column';
        state.gameStatus = "Select a game mode.";
        state.statusElement.textContent = state.gameStatus;
        state.statusElement.classList.remove('check-status', 'check-mate-status', 'stalemate-status');
        windowInstance.setTitle("Chess - Choose Mode");
        state.selectedPiece = null;
        state.possibleMoves = [];

        if(state.boardElement) state.boardElement.innerHTML = '';

        const existingStyle = document.getElementById('chess-mode-styles');
        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'chess-mode-styles';
            style.textContent = `
                .chess-mode-header { text-align: center; margin-bottom: 20px; color: var(--text-color, #eee); }
                .chess-mode-header h2 { margin-bottom: 5px; font-size: 1.8em; font-weight: 500; }
                .chess-mode-subheader { opacity: 0.8; margin-top: 0; }
                .chess-mode-options { display: flex; justify-content: center; gap: 25px; margin-top: 15px; }
                .chess-mode-card { background: rgba(40, 40, 40, 0.7); border: 2px solid transparent; border-radius: 10px; padding: 20px; width: 180px; text-align: center; transition: all 0.3s ease; cursor: pointer; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
                .chess-mode-card:hover { border-color: var(--accent-color, #4a90e2); transform: translateY(-5px); box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3); }
                .chess-mode-icon { font-size: 2.5em; margin-bottom: 15px; color: var(--accent-color, #4a90e2); height: 60px; display: flex; align-items: center; justify-content: center; gap: 10px; }
                .chess-mode-icon .fa-chess-pawn { font-size: 1.2em; }
                .chess-mode-card h3 { margin: 0 0 5px 0; font-size: 1.2em; }
                .chess-mode-card p { margin: 5px 0 20px; opacity: 0.7; font-size: 0.9em; }
                .chess-mode-button { background: var(--accent-color, #4a90e2); color: #fff; border: none; border-radius: 5px; padding: 8px 16px; font-size: 0.9em; cursor: pointer; transition: background 0.3s; width: 100%; }
                .chess-mode-button:hover { background: var(--accent-color-hover, #3a80d2); }
            `;
            document.head.appendChild(style);
        }
    }

    _startGame(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (!state.gameMode) return;
        state.gameOver = false;
        state.modeSelectionElement.style.display = 'none';
        state.boardElement.style.display = 'grid';
        state.statusElement.classList.remove('check-status', 'check-mate-status', 'stalemate-status');
        this.resetGameLogic(windowInstance);
    }

    resetGameLogic(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.currentPlayer = 'white';
        state.selectedPiece = null;
        state.possibleMoves = [];
        state.isAiThinking = false;
        this._setupInitialBoard(windowInstance);
        this._renderBoard(windowInstance);
        this._updateStatus(windowInstance);
        windowInstance.setTitle(`Chess - ${state.gameMode === '1P' ? 'vs AI' : '2 Players'}`);
    }

    _setupInitialBoard(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.board = Array(8).fill().map(() => Array(8).fill(null));
        state.board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        state.board[1] = Array(8).fill('p');
        state.board[6] = Array(8).fill('P');
        state.board[7] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    }

    _renderBoard(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (!state.boardElement) return;
        state.boardElement.innerHTML = '';
        state.boardElement.style.gridTemplateColumns = `repeat(8, 1fr)`;
        state.boardElement.style.gridTemplateRows = `repeat(8, 1fr)`;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.classList.add('chess-square');
                square.dataset.row = r;
                square.dataset.col = c;
                square.classList.add((r + c) % 2 === 0 ? 'light-square' : 'dark-square');

                const piece = state.board[r][c];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('chess-piece');
                    pieceElement.textContent = this.pieces[piece];
                    pieceElement.classList.add(this._getPieceColor(piece));
                    square.appendChild(pieceElement);
                }

                if (state.selectedPiece && state.selectedPiece.row === r && state.selectedPiece.col === c) {
                    square.classList.add('selected');
                }
                if (state.possibleMoves.some(move => move.r === r && move.c === c)) {
                    square.classList.add('possible-move');
                }
                state.boardElement.appendChild(square);
            }
        }
    }

    _getPieceColor(pieceCode) {
        if (!pieceCode) return null;
        return pieceCode === pieceCode.toUpperCase() ? 'white' : 'black';
    }

    _isValidSquare(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    _findKing(color, boardState = this.board) {
        if (!boardState || !Array.isArray(boardState)) return null;
        const kingPiece = color === 'white' ? 'K' : 'k';
        for(let r=0; r<8; r++) {
            if (!boardState[r] || !Array.isArray(boardState[r])) continue;
            for(let c=0; c<8; c++) {
                if (boardState[r][c] === kingPiece) return {r,c};
            }
        }
        return null;
    }

    _handleSquareClick(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (state.gameOver || !state.gameMode) return;
        if (state.gameMode === '1P' && state.currentPlayer === this.aiPlayer && state.isAiThinking) return;

        const squareEl = e.target.closest('.chess-square');
        if (!squareEl) return;

        const r = parseInt(squareEl.dataset.row);
        const c = parseInt(squareEl.dataset.col);
        const pieceCode = state.board[r][c];

        if (state.selectedPiece) {
            const isPossibleMoveTarget = state.possibleMoves.some(move => move.r === r && move.c === c);
            if (isPossibleMoveTarget) {
                this._movePiece(state.selectedPiece.row, state.selectedPiece.col, r, c, state.board);

                state.selectedPiece = null;
                state.possibleMoves = [];
                state.currentPlayer = state.currentPlayer === 'white' ? 'black' : 'white';

                this._checkForEndGame(state.currentPlayer, windowInstance);
                this._updateStatus(windowInstance);
                this._renderBoard(windowInstance);

                if (!state.gameOver && state.gameMode === '1P' && state.currentPlayer === this.aiPlayer) {
                    this._aiMove(windowInstance);
                }
            } else {
                if (pieceCode && this._getPieceColor(pieceCode) === state.currentPlayer) {
                    state.selectedPiece = { piece: pieceCode, color: state.currentPlayer, row: r, col: c };
                    const rawMoves = this._calculatePossibleMovesForPiece(r, c, pieceCode, state.board);
                    state.possibleMoves = rawMoves.filter(move => {
                        const tempBoard = state.board.map(arr => arr.slice());
                        this._movePiece(r, c, move.r, move.c, tempBoard);
                        return !this._isKingInCheck(state.currentPlayer, tempBoard);
                    });
                } else {
                    state.selectedPiece = null;
                    state.possibleMoves = [];
                }
                this._renderBoard(windowInstance);
            }
        } else {
            if (pieceCode && this._getPieceColor(pieceCode) === state.currentPlayer) {
                state.selectedPiece = { piece: pieceCode, color: state.currentPlayer, row: r, col: c };
                const rawMoves = this._calculatePossibleMovesForPiece(r, c, pieceCode, state.board);
                state.possibleMoves = rawMoves.filter(move => {
                    const tempBoard = state.board.map(arr => arr.slice());
                    this._movePiece(r, c, move.r, move.c, tempBoard);
                    return !this._isKingInCheck(state.currentPlayer, tempBoard);
                });
                this._renderBoard(windowInstance);
            }
        }
    }

    _movePiece(fromRow, fromCol, toRow, toCol, boardState = this.board) {
        const pieceToMove = boardState[fromRow][fromCol];
        boardState[toRow][toCol] = pieceToMove;
        boardState[fromRow][fromCol] = null;

        if (pieceToMove === 'P' && toRow === 0) boardState[toRow][toCol] = 'Q';
        if (pieceToMove === 'p' && toRow === 7) boardState[toRow][toCol] = 'q';
    }

    _calculatePossibleMovesForPiece(r, c, pieceCode, boardState) {
        const moves = [];
        const type = pieceCode.toLowerCase();
        const pieceColor = this._getPieceColor(pieceCode);

        if (type === 'p') {
            const direction = pieceColor === 'white' ? -1 : 1;
            const startRow = pieceColor === 'white' ? 6 : 1;
            if (this._isValidSquare(r + direction, c) && boardState[r + direction][c] === null) {
                moves.push({ r: r + direction, c: c });
                if (r === startRow && this._isValidSquare(r + 2 * direction, c) && boardState[r + 2 * direction][c] === null) {
                    moves.push({ r: r + 2 * direction, c: c });
                }
            }
            const captureOffsets = [-1, 1];
            for (const offset of captureOffsets) {
                const captureR = r + direction;
                const captureC = c + offset;
                if (this._isValidSquare(captureR, captureC) &&
                    boardState[captureR][captureC] !== null &&
                    this._getPieceColor(boardState[captureR][captureC]) !== pieceColor) {
                    moves.push({ r: captureR, c: captureC });
                }
            }
        }
        if (type === 'r' || type === 'q') {
            const directions = [{dr:0,dc:1},{dr:0,dc:-1},{dr:1,dc:0},{dr:-1,dc:0}];
            this._addLinearMovesToBoard(moves, r, c, pieceColor, directions, boardState);
        }
        if (type === 'b' || type === 'q') {
            const directions = [{dr:1,dc:1},{dr:1,dc:-1},{dr:-1,dc:1},{dr:-1,dc:-1}];
            this._addLinearMovesToBoard(moves, r, c, pieceColor, directions, boardState);
        }
        if (type === 'n') {
            const knightMoves = [
                {dr: -2, dc: -1}, {dr: -2, dc: 1}, {dr: -1, dc: -2}, {dr: -1, dc: 2},
                {dr: 1, dc: -2}, {dr: 1, dc: 2}, {dr: 2, dc: -1}, {dr: 2, dc: 1}
            ];
            knightMoves.forEach(move => {
                const nr = r + move.dr;
                const nc = c + move.dc;
                if (this._isValidSquare(nr, nc) && (boardState[nr][nc] === null || this._getPieceColor(boardState[nr][nc]) !== pieceColor)) {
                    moves.push({r: nr, c: nc});
                }
            });
        }
        if (type === 'k') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (this._isValidSquare(nr, nc) && (boardState[nr][nc] === null || this._getPieceColor(boardState[nr][nc]) !== pieceColor)) {
                        moves.push({r: nr, c: nc});
                    }
                }
            }
        }
        return moves;
    }

    _addLinearMovesToBoard(moves, r, c, pieceColor, directions, boardState) {
        for(const d of directions) {
            for(let i = 1; i < 8; i++) {
                const nr = r + d.dr*i;
                const nc = c + d.dc*i;
                if(!this._isValidSquare(nr, nc)) break;
                if(boardState[nr][nc] === null) {
                    moves.push({r:nr, c:nc});
                } else {
                    if(this._getPieceColor(boardState[nr][nc]) !== pieceColor) {
                        moves.push({r:nr, c:nc});
                    }
                    break;
                }
            }
        }
    }

    _isKingInCheck(playerColor, boardState) {
        const kingPos = this._findKing(playerColor, boardState);
        if (!kingPos) return false;

        const opponentColor = playerColor === 'white' ? 'black' : 'white';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const pieceCode = boardState[r][c];
                if (pieceCode && this._getPieceColor(pieceCode) === opponentColor) {
                    const opponentRawMoves = this._calculatePossibleMovesForPiece(r, c, pieceCode, boardState);
                    if (opponentRawMoves.some(move => move.r === kingPos.r && move.c === kingPos.c)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    _getAllLegalMovesForPlayer(playerColor, boardState) {
        const legalMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const pieceCode = boardState[r][c];
                if (pieceCode && this._getPieceColor(pieceCode) === playerColor) {
                    const rawMoves = this._calculatePossibleMovesForPiece(r, c, pieceCode, boardState);
                    for (const move of rawMoves) {
                        const tempBoard = boardState.map(arr => arr.slice());
                        this._movePiece(r, c, move.r, move.c, tempBoard);
                        if (!this._isKingInCheck(playerColor, tempBoard)) {
                            legalMoves.push({ from: {r, c, piece:pieceCode}, to: {r: move.r, c: move.c} });
                        }
                    }
                }
            }
        }
        return legalMoves;
    }

    _checkForEndGame(playerWhoseTurnItIs, windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return true;
        if (state.gameOver) return true;

        const legalMoves = this._getAllLegalMovesForPlayer(playerWhoseTurnItIs, state.board);
        if (legalMoves.length === 0) {
            state.gameOver = true;
            if (this._isKingInCheck(playerWhoseTurnItIs, state.board)) {
                state.gameStatus = `Checkmate! ${playerWhoseTurnItIs === 'white' ? 'Black' : 'White'} wins.`;
                if(state.statusElement) {
                    state.statusElement.classList.add('check-mate-status');
                    state.statusElement.classList.remove('check-status');
                }
            } else {
                state.gameStatus = "Stalemate! Draw.";
                 if(state.statusElement) state.statusElement.classList.add('stalemate-status');
            }
            return true;
        }
        return false;
    }

    _updateStatus(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (!state.statusElement) return;

        if (state.gameOver) {
            state.statusElement.textContent = state.gameStatus;
            return;
        }

        let turnMessage = `${state.currentPlayer === 'white' ? 'White' : 'Black'} to move.`;

        if (state.board && Array.isArray(state.board) && state.board.length === 8 && !state.gameOver) {
            const kingCurrentlyInCheck = this._isKingInCheck(state.currentPlayer, state.board);

            if (kingCurrentlyInCheck) {
                state.gameStatus = `Check! ${turnMessage}`;
                state.statusElement.classList.add('check-status');
                state.statusElement.classList.remove('check-mate-status', 'stalemate-status');
            } else {
                state.gameStatus = turnMessage;
                state.statusElement.classList.remove('check-status', 'check-mate-status', 'stalemate-status');
            }
        } else if (!state.gameOver) {
            state.gameStatus = turnMessage;
        }
        state.statusElement.textContent = state.gameStatus;
    }

    _aiMove(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (state.gameOver || state.currentPlayer !== this.aiPlayer || state.isAiThinking) return;

        state.isAiThinking = true;
        state.statusElement.textContent = `AI (${this.aiPlayer === 'white' ? 'White' : 'Black'}) is thinking...`;
        state.selectedPiece = null;
        state.possibleMoves = [];
        this._renderBoard(windowInstance);

        setTimeout(() => {
            const legalMoves = this._getAllLegalMovesForPlayer(this.aiPlayer, state.board);

            if (legalMoves.length === 0) {
                console.log("AI has no legal moves. The game should have already ended.");
                state.isAiThinking = false;
                return;
            }

            let bestMove = null;

            let checkingMove = null;
            for (const move of legalMoves) {
                const tempBoard = state.board.map(arr => arr.slice());
                this._movePiece(move.from.r, move.from.c, move.to.r, move.to.c, tempBoard);
                const opponentColor = this.aiPlayer === 'white' ? 'black' : 'white';
                if (this._isKingInCheck(opponentColor, tempBoard)) {
                    checkingMove = move;
                    break;
                }
            }
            if (checkingMove) {
                bestMove = checkingMove;
            } else {
                let highValueCapture = null;
                let highestValue = -1;
                for (const move of legalMoves) {
                    const targetPieceCode = state.board[move.to.r][move.to.c];
                    if (targetPieceCode) {
                        const value = this.pieceValues[targetPieceCode.toLowerCase()] || 0;
                        if (value > highestValue) {
                            highestValue = value;
                            highValueCapture = move;
                        }
                    }
                }
                if (highValueCapture) {
                    bestMove = highValueCapture;
                } else {
                    bestMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                }
            }

            if (bestMove) {
                this._movePiece(bestMove.from.r, bestMove.from.c, bestMove.to.r, bestMove.to.c, state.board);
            } else {
                console.error("AI could not select a move despite having options.");
                state.isAiThinking = false;
                return;
            }

            state.currentPlayer = state.currentPlayer === 'white' ? 'black' : 'white';
            state.isAiThinking = false;

            this._checkForEndGame(state.currentPlayer, windowInstance);
            this._updateStatus(windowInstance);
            this._renderBoard(windowInstance);

        }, 1000);
    }
}