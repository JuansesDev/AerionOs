// js/apps/ChessApp.js
import { App } from '../core/App.js';

export class ChessApp extends App {
    constructor(webOS) {
        super('chess', 'Ajedrez', 'fas fa-chess', webOS, {
            window: { width: 520, height: 600, minWidth: 450, minHeight: 520, customClass: 'chess-app' },
            allowMultipleInstances: true
        });

        this.board = [];
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameStatus = "Selecciona un modo de juego.";
        this.gameMode = null;
        this.aiPlayer = 'black';
        this.isAiThinking = false;
        this.gameOver = false;

        this.pieces = {
            'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
        };
        this.pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100 };

        this.boardElement = null;
        this.statusElement = null;
        this.modeSelectionElement = null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        this.activeWindowInstance = windowInstance;
        contentElement.innerHTML = `
            <div class="chess-game">
                <div class="chess-info">
                    <button class="new-chess-game-button" title="Nuevo Juego"><i class="fas fa-redo"></i> Nuevo Juego</button>
                    <span class="chess-status">${this.gameStatus}</span>
                </div>
                <div class="chess-mode-selection">
                    <div class="chess-mode-header">
                        <h2><i class="fas fa-chess"></i> Selecciona un modo de juego</h2>
                        <p class="chess-mode-subheader">Elige cómo quieres jugar al ajedrez</p>
                    </div>
                    <div class="chess-mode-options">
                        <div class="chess-mode-card" data-mode="1P">
                            <div class="chess-mode-icon">
                                <i class="fas fa-robot"></i>
                                <i class="fas fa-chess-pawn"></i>
                            </div>
                            <h3>Un Jugador</h3>
                            <p>Juega contra la IA</p>
                            <button class="chess-mode-button" data-mode="1P">Seleccionar</button>
                        </div>
                        <div class="chess-mode-card" data-mode="2P">
                            <div class="chess-mode-icon">
                                <i class="fas fa-user"></i>
                                <i class="fas fa-chess-pawn"></i>
                                <i class="fas fa-user"></i>
                            </div>
                            <h3>Dos Jugadores</h3>
                            <p>Juega contra un amigo</p>
                            <button class="chess-mode-button" data-mode="2P">Seleccionar</button>
                        </div>
                    </div>
                </div>
                <div class="chess-board" style="display:none;"></div>
            </div>
        `;

        this.boardElement = contentElement.querySelector('.chess-board');
        this.statusElement = contentElement.querySelector('.chess-status');
        this.modeSelectionElement = contentElement.querySelector('.chess-mode-selection');

        contentElement.querySelector('.new-chess-game-button').addEventListener('click', () => this._showModeSelection());

        this.modeSelectionElement.querySelectorAll('.chess-mode-card, .chess-mode-button').forEach(element => {
            element.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const mode = target.dataset.mode || target.querySelector('[data-mode]')?.dataset.mode;
                if (mode) {
                    this.gameMode = mode;
                    this._startGame();
                }
            });
        });

        this.boardElement.addEventListener('click', (e) => {
            this._handleSquareClick(e);
        });

        this._showModeSelection();
        windowInstance.setTitle("Ajedrez - Elige Modo");
    }

    _showModeSelection() {
        this.gameOver = false;
        this.gameMode = null;
        this.boardElement.style.display = 'none';
        this.modeSelectionElement.style.display = 'flex';
        this.modeSelectionElement.style.flexDirection = 'column'; // Asegurar que esté presente
        this.gameStatus = "Selecciona un modo de juego.";
        this.statusElement.textContent = this.gameStatus;
        this.statusElement.classList.remove('check-status', 'check-mate-status', 'stalemate-status');
        this.activeWindowInstance.setTitle("Ajedrez - Elige Modo");
        this.selectedPiece = null;
        this.possibleMoves = [];

        if(this.boardElement) this.boardElement.innerHTML = '';

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

    _startGame() {
        if (!this.gameMode) return;
        this.gameOver = false;
        this.modeSelectionElement.style.display = 'none';
        this.boardElement.style.display = 'grid';
        this.statusElement.classList.remove('check-status', 'check-mate-status', 'stalemate-status');
        this.resetGameLogic();
    }

    resetGameLogic() {
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.isAiThinking = false;
        this._setupInitialBoard();
        this._renderBoard();
        // Inicialmente, no hay jaque ni fin de juego, _updateStatus se encargará
        this._updateStatus(); // Esto también llamará a _checkForEndGame para el primer turno
        this.activeWindowInstance.setTitle(`Ajedrez - ${this.gameMode === '1P' ? 'vs IA' : '2 Jugadores'}`);
    }

    _setupInitialBoard() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        this.board[1] = Array(8).fill('p');
        this.board[6] = Array(8).fill('P');
        this.board[7] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    }

    _renderBoard() {
        if (!this.boardElement) return;
        this.boardElement.innerHTML = '';
        this.boardElement.style.gridTemplateColumns = `repeat(8, 1fr)`;
        this.boardElement.style.gridTemplateRows = `repeat(8, 1fr)`;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.classList.add('chess-square');
                square.dataset.row = r;
                square.dataset.col = c;
                square.classList.add((r + c) % 2 === 0 ? 'light-square' : 'dark-square');

                const piece = this.board[r][c];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('chess-piece');
                    pieceElement.textContent = this.pieces[piece];
                    pieceElement.classList.add(this._getPieceColor(piece));
                    square.appendChild(pieceElement);
                }

                if (this.selectedPiece && this.selectedPiece.row === r && this.selectedPiece.col === c) {
                    square.classList.add('selected');
                }
                if (this.possibleMoves.some(move => move.r === r && move.c === c)) {
                    square.classList.add('possible-move');
                }
                this.boardElement.appendChild(square);
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

    _handleSquareClick(e) {
        if (this.gameOver || !this.gameMode) return;
        if (this.gameMode === '1P' && this.currentPlayer === this.aiPlayer && this.isAiThinking) return;

        const squareEl = e.target.closest('.chess-square');
        if (!squareEl) return;

        const r = parseInt(squareEl.dataset.row);
        const c = parseInt(squareEl.dataset.col);
        const pieceCode = this.board[r][c];

        if (this.selectedPiece) {
            const isPossibleMoveTarget = this.possibleMoves.some(move => move.r === r && move.c === c);
            if (isPossibleMoveTarget) {
                this._movePiece(this.selectedPiece.row, this.selectedPiece.col, r, c);

                this.selectedPiece = null;
                this.possibleMoves = [];
                this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

                // Primero verifica si el juego terminó para el nuevo jugador, luego actualiza el estado
                this._checkForEndGame(this.currentPlayer);
                this._updateStatus();
                this._renderBoard();

                if (!this.gameOver && this.gameMode === '1P' && this.currentPlayer === this.aiPlayer) {
                    this._aiMove();
                }
            } else { // Clicked on another square (not a valid move for selected piece)
                if (pieceCode && this._getPieceColor(pieceCode) === this.currentPlayer) {
                    // Select this new piece of the current player
                    this.selectedPiece = { piece: pieceCode, color: this.currentPlayer, row: r, col: c };
                    const rawMoves = this._calculatePossibleMovesForPiece(r, c, pieceCode, this.board);
                    this.possibleMoves = rawMoves.filter(move => {
                        const tempBoard = this.board.map(arr => arr.slice());
                        this._movePiece(r, c, move.r, move.c, tempBoard); // Simulate move
                        return !this._isKingInCheck(this.currentPlayer, tempBoard); // Check if own king is safe
                    });
                } else {
                    // Clicked on empty or opponent's piece: deselect
                    this.selectedPiece = null;
                    this.possibleMoves = [];
                }
                this._renderBoard();
            }
        } else { // No piece selected yet
            if (pieceCode && this._getPieceColor(pieceCode) === this.currentPlayer) {
                this.selectedPiece = { piece: pieceCode, color: this.currentPlayer, row: r, col: c };
                const rawMoves = this._calculatePossibleMovesForPiece(r, c, pieceCode, this.board);
                // Filter raw moves to get only legal ones (that don't leave own king in check)
                this.possibleMoves = rawMoves.filter(move => {
                    const tempBoard = this.board.map(arr => arr.slice());
                    this._movePiece(r, c, move.r, move.c, tempBoard); // Simulate move
                    return !this._isKingInCheck(this.currentPlayer, tempBoard); // Check if own king is safe
                });
                this._renderBoard();
            }
        }
    }

    _movePiece(fromRow, fromCol, toRow, toCol, boardState = this.board) {
        const pieceToMove = boardState[fromRow][fromCol];
        boardState[toRow][toCol] = pieceToMove;
        boardState[fromRow][fromCol] = null;

        // Promoción de peón
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
            // Avance normal
            if (this._isValidSquare(r + direction, c) && boardState[r + direction][c] === null) {
                moves.push({ r: r + direction, c: c });
                // Doble avance desde la posición inicial
                if (r === startRow && this._isValidSquare(r + 2 * direction, c) && boardState[r + 2 * direction][c] === null) {
                    moves.push({ r: r + 2 * direction, c: c });
                }
            }
            // Capturas
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
        if (type === 'r' || type === 'q') { // Torre o Reina (movimientos rectos)
            const directions = [{dr:0,dc:1},{dr:0,dc:-1},{dr:1,dc:0},{dr:-1,dc:0}];
            this._addLinearMovesToBoard(moves, r, c, pieceColor, directions, boardState);
        }
        if (type === 'b' || type === 'q') { // Alfil o Reina (movimientos diagonales)
            const directions = [{dr:1,dc:1},{dr:1,dc:-1},{dr:-1,dc:1},{dr:-1,dc:-1}];
            this._addLinearMovesToBoard(moves, r, c, pieceColor, directions, boardState);
        }
        if (type === 'n') { // Caballo
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
        if (type === 'k') { // Rey
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
                        moves.push({r:nr, c:nc}); // Puede capturar
                    }
                    break; // Bloqueado por pieza propia o enemiga
                }
            }
        }
    }

    _isKingInCheck(playerColor, boardState) {
        const kingPos = this._findKing(playerColor, boardState);
        if (!kingPos) return false; // No hay rey, algo raro (o ya capturado, que no debería pasar)

        const opponentColor = playerColor === 'white' ? 'black' : 'white';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const pieceCode = boardState[r][c];
                if (pieceCode && this._getPieceColor(pieceCode) === opponentColor) {
                    // Obtenemos los movimientos "brutos" de la pieza oponente (sin filtrar por la seguridad de su propio rey)
                    const opponentRawMoves = this._calculatePossibleMovesForPiece(r, c, pieceCode, boardState);
                    if (opponentRawMoves.some(move => move.r === kingPos.r && move.c === kingPos.c)) {
                        return true; // El rey está atacado
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
                        this._movePiece(r, c, move.r, move.c, tempBoard); // Simular el movimiento
                        if (!this._isKingInCheck(playerColor, tempBoard)) { // Si el rey NO está en jaque después del movimiento
                            legalMoves.push({ from: {r, c, piece:pieceCode}, to: {r: move.r, c: move.c} });
                        }
                    }
                }
            }
        }
        return legalMoves;
    }

    _checkForEndGame(playerWhoseTurnItIs) {
        // No hacer nada si el juego ya terminó
        if (this.gameOver) return true;

        const legalMoves = this._getAllLegalMovesForPlayer(playerWhoseTurnItIs, this.board);
        if (legalMoves.length === 0) {
            this.gameOver = true;
            if (this._isKingInCheck(playerWhoseTurnItIs, this.board)) {
                this.gameStatus = `¡Jaque Mate! Ganan las ${playerWhoseTurnItIs === 'white' ? 'Negras' : 'Blancas'}.`;
                if(this.statusElement) {
                    this.statusElement.classList.add('check-mate-status');
                    this.statusElement.classList.remove('check-status'); // Quitar jaque normal si es mate
                }
            } else {
                this.gameStatus = "¡Ahogado! Empate.";
                 if(this.statusElement) this.statusElement.classList.add('stalemate-status');
            }
            return true; // Juego terminado
        }
        return false; // Juego continúa
    }

    _updateStatus() {
        if (!this.statusElement) return;

        // Si el juego ha terminado, _checkForEndGame ya estableció this.gameStatus
        if (this.gameOver) {
            this.statusElement.textContent = this.gameStatus;
            // Las clases de estado (mate, ahogado) ya se aplican en _checkForEndGame
            return;
        }

        // Si el juego continúa
        let turnMessage = `Turno de las ${this.currentPlayer === 'white' ? 'Blancas' : 'Negras'}.`;

        // Verificar que el tablero esté inicializado antes de comprobar jaque
        // y que el juego no haya terminado ya (aunque el if de arriba debería cubrirlo)
        if (this.board && Array.isArray(this.board) && this.board.length === 8 && !this.gameOver) {
            const kingCurrentlyInCheck = this._isKingInCheck(this.currentPlayer, this.board);

            if (kingCurrentlyInCheck) {
                this.gameStatus = `¡Jaque! ${turnMessage}`;
                this.statusElement.classList.add('check-status');
                this.statusElement.classList.remove('check-mate-status', 'stalemate-status');
            } else {
                this.gameStatus = turnMessage;
                this.statusElement.classList.remove('check-status', 'check-mate-status', 'stalemate-status');
            }
        } else if (!this.gameOver) { // Si el tablero no está listo pero el juego no ha terminado (ej. al inicio)
            this.gameStatus = turnMessage;
        }
        // Si this.gameOver es true, this.gameStatus ya fue establecido por _checkForEndGame
        this.statusElement.textContent = this.gameStatus;
    }

    _aiMove() {
        if (this.gameOver || this.currentPlayer !== this.aiPlayer || this.isAiThinking) return;

        this.isAiThinking = true;
        this.statusElement.textContent = `IA (${this.aiPlayer === 'white' ? 'Blancas' : 'Negras'}) está pensando...`;
        this.selectedPiece = null;
        this.possibleMoves = [];
        this._renderBoard(); // Actualizar tablero para quitar resaltados del humano

        setTimeout(() => {
            // Obtener solo movimientos legales para la IA
            const legalMoves = this._getAllLegalMovesForPlayer(this.aiPlayer, this.board);

            if (legalMoves.length === 0) {
                // Esto ya debería haber sido manejado por _checkForEndGame después del turno del humano,
                // resultando en jaque mate o ahogado para la IA.
                console.log("IA no tiene movimientos legales. El juego ya debería haber terminado.");
                this.isAiThinking = false;
                // _checkForEndGame y _updateStatus ya deberían haber reflejado el estado final.
                return;
            }

            let bestMove = null;

            // 1. Si está en jaque, cualquier movimiento legal lo sacará del jaque.
            // No es necesario un bloque if específico aquí, ya que legalMoves solo contiene esos.

            // 2. Intentar dar Jaque Mate (simplificado: solo dar Jaque)
            let checkingMove = null;
            for (const move of legalMoves) {
                const tempBoard = this.board.map(arr => arr.slice());
                this._movePiece(move.from.r, move.from.c, move.to.r, move.to.c, tempBoard);
                // El oponente es el jugador que no es la IA
                const opponentColor = this.aiPlayer === 'white' ? 'black' : 'white';
                if (this._isKingInCheck(opponentColor, tempBoard)) {
                    checkingMove = move;
                    break;
                }
            }
            if (checkingMove) {
                bestMove = checkingMove;
            } else {
                // 3. Capturar la pieza de mayor valor
                let highValueCapture = null;
                let highestValue = -1;
                for (const move of legalMoves) {
                    const targetPieceCode = this.board[move.to.r][move.to.c]; // Pieza en la casilla de destino ANTES del movimiento
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
                    // 4. Movimiento aleatorio si no hay nada mejor
                    bestMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                }
            }

            if (bestMove) {
                this._movePiece(bestMove.from.r, bestMove.from.c, bestMove.to.r, bestMove.to.c);
            } else {
                 // Esto no debería ocurrir si legalMoves.length > 0
                console.error("IA no pudo seleccionar un movimiento a pesar de tener opciones.");
                this.isAiThinking = false;
                return;
            }

            this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
            this.isAiThinking = false;

            this._checkForEndGame(this.currentPlayer); // Comprobar si el humano está en mate/ahogado
            this._updateStatus();
            this._renderBoard();

        }, 1000);
    }
}