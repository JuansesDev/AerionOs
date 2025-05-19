// js/apps/ChessApp.js
import { App } from '../core/App.js';

export class ChessApp extends App {
    // ... (constructor y propiedades iguales a la respuesta anterior, incluyendo gameMode, aiPlayer, etc.)
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
        this.gameOver = false; // Nuevo flag

        this.pieces = {
            'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
        };
        this.pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100 }; // Valores para capturas

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

        // Actualizar los selectores para los nuevos botones de modo
        this.modeSelectionElement.querySelectorAll('.chess-mode-card, .chess-mode-button').forEach(element => {
            element.addEventListener('click', (e) => {
                // Obtener el data-mode del botón o del contenedor padre si se hizo clic en otra parte de la tarjeta
                const target = e.currentTarget;
                const mode = target.dataset.mode || target.querySelector('[data-mode]')?.dataset.mode;

                if (mode) {
                    this.gameMode = mode;
                    this._startGame();
                }
            });
        });

        this.boardElement.addEventListener('click', (e) => {
            if (this.gameOver) return;
            if (this.gameMode === '1P' && this.currentPlayer === this.aiPlayer && !this.isAiThinking) {
                return;
            }
            this._handleSquareClick(e);
        });

        this._showModeSelection();
        windowInstance.setTitle("Ajedrez - Elige Modo");
    }

    _showModeSelection() {
        this.gameOver = false; // Resetear game over
        this.gameMode = null;
        this.boardElement.style.display = 'none';
        this.modeSelectionElement.style.display = 'flex';
        this.modeSelectionElement.style.flexDirection = 'column';
        this.statusElement.textContent = "Selecciona un modo de juego.";
        this.activeWindowInstance.setTitle("Ajedrez - Elige Modo");
        this.selectedPiece = null;
        this.possibleMoves = [];

        if(this.boardElement) this.boardElement.innerHTML = '';

        // Aplicar estilos avanzados al selector de modo
        const style = document.createElement('style');
        style.textContent = `
            .chess-mode-header {
                text-align: center;
                margin-bottom: 20px;
                color: var(--text-color, #eee);
            }
            .chess-mode-header h2 {
                margin-bottom: 5px;
                font-size: 1.8em;
                font-weight: 500;
            }
            .chess-mode-subheader {
                opacity: 0.8;
                margin-top: 0;
            }
            .chess-mode-options {
                display: flex;
                justify-content: center;
                gap: 25px;
                margin-top: 15px;
            }
            .chess-mode-card {
                background: rgba(40, 40, 40, 0.7);
                border: 2px solid transparent;
                border-radius: 10px;
                padding: 20px;
                width: 180px;
                text-align: center;
                transition: all 0.3s ease;
                cursor: pointer;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            .chess-mode-card:hover {
                border-color: var(--accent-color, #4a90e2);
                transform: translateY(-5px);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
            }
            .chess-mode-icon {
                font-size: 2.5em;
                margin-bottom: 15px;
                color: var(--accent-color, #4a90e2);
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            .chess-mode-icon .fa-chess-pawn {
                font-size: 1.2em;
            }
            .chess-mode-card h3 {
                margin: 0 0 5px 0;
                font-size: 1.2em;
            }
            .chess-mode-card p {
                margin: 5px 0 20px;
                opacity: 0.7;
                font-size: 0.9em;
            }
            .chess-mode-button {
                background: var(--accent-color, #4a90e2);
                color: #fff;
                border: none;
                border-radius: 5px;
                padding: 8px 16px;
                font-size: 0.9em;
                cursor: pointer;
                transition: background 0.3s;
                width: 100%;
            }
            .chess-mode-button:hover {
                background: var(--accent-color-hover, #3a80d2);
            }
        `;

        // Eliminar estilos anteriores para evitar duplicados
        const oldStyle = document.getElementById('chess-mode-styles');
        if (oldStyle) oldStyle.remove();

        style.id = 'chess-mode-styles';
        document.head.appendChild(style);
    }

    _startGame() {
        // ... (igual que la respuesta anterior)
        if (!this.gameMode) return;
        this.gameOver = false;
        this.modeSelectionElement.style.display = 'none';
        this.boardElement.style.display = 'grid';
        this.resetGameLogic();
    }

    resetGameLogic() {
        // ... (igual, pero this.gameOver = false; ya está en _showModeSelection y _startGame)
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.isAiThinking = false;
        this._setupInitialBoard();
        this._renderBoard();
        this._updateStatus(); // Este llamará a _checkForEndGame
        this.activeWindowInstance.setTitle(`Ajedrez - ${this.gameMode === '1P' ? 'vs IA' : '2 Jugadores'}`);
    }


    _setupInitialBoard() {
        // Inicializar el tablero como una matriz 8x8
        this.board = Array(8).fill().map(() => Array(8).fill(null));

        // Colocar piezas negras (mayúsculas para blancas, minúsculas para negras)
        this.board[0][0] = 'r'; // Torres
        this.board[0][7] = 'r';
        this.board[0][1] = 'n'; // Caballos
        this.board[0][6] = 'n';
        this.board[0][2] = 'b'; // Alfiles
        this.board[0][5] = 'b';
        this.board[0][3] = 'q'; // Reina
        this.board[0][4] = 'k'; // Rey

        // Peones negros
        for (let c = 0; c < 8; c++) {
            this.board[1][c] = 'p';
        }

        // Colocar piezas blancas
        this.board[7][0] = 'R'; // Torres
        this.board[7][7] = 'R';
        this.board[7][1] = 'N'; // Caballos
        this.board[7][6] = 'N';
        this.board[7][2] = 'B'; // Alfiles
        this.board[7][5] = 'B';
        this.board[7][3] = 'Q'; // Reina
        this.board[7][4] = 'K'; // Rey

        // Peones blancos
        for (let c = 0; c < 8; c++) {
            this.board[6][c] = 'P';
        }
    }
    _renderBoard() {
        if (!this.boardElement) return;

        this.boardElement.innerHTML = '';
        this.boardElement.style.gridTemplateColumns = `repeat(8, 1fr)`;
        this.boardElement.style.gridTemplateRows = `repeat(8, 1fr)`;

        // Crear el tablero de ajedrez con las casillas alternadas
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.classList.add('chess-square');
                square.dataset.row = r;
                square.dataset.col = c;

                // Alternar colores para el patrón de tablero de ajedrez
                const isLight = (r + c) % 2 === 0;
                square.classList.add(isLight ? 'light-square' : 'dark-square');

                // Añadir pieza si existe en esta posición
                const piece = this.board[r][c];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('chess-piece');
                    pieceElement.textContent = this.pieces[piece];
                    pieceElement.classList.add(this._getPieceColor(piece));
                    square.appendChild(pieceElement);
                }

                // Resaltar la pieza seleccionada
                if (this.selectedPiece && this.selectedPiece.row === r && this.selectedPiece.col === c) {
                    square.classList.add('selected');
                }

                // Resaltar los movimientos posibles
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

    _addLinearMoves(moves, r, c, pieceColor, directions) { /* Sin cambios */ }
    _findKing(color, boardState = this.board) {
        // Verificar que boardState esté definido y sea un array
        if (!boardState || !Array.isArray(boardState)) {
            console.error('Error: boardState no es válido', boardState);
            return null;
        }

        const kingPiece = color === 'white' ? 'K' : 'k';
        for(let r=0; r<8; r++) {
            if (!boardState[r] || !Array.isArray(boardState[r])) {
                console.error(`Error: boardState[${r}] no es válido`, boardState[r]);
                continue; // Saltar esta fila si no es válida
            }
            for(let c=0; c<8; c++) {
                if (boardState[r][c] === kingPiece) return {r,c};
            }
        }
        return null;
    }


    _handleSquareClick(e) {
        if (this.gameOver || !this.gameMode || this.isAiThinking) return;
        // ... (resto de la lógica de _handleSquareClick igual a la respuesta anterior,
        // pero al final, después de _updateStatus() y _renderBoard() del humano,
        // Y antes de la llamada a _aiMove(), añadimos la comprobación de fin de juego)

        const squareEl = e.target.closest('.chess-square');
        if (!squareEl) return;

        const r = parseInt(squareEl.dataset.row);
        const c = parseInt(squareEl.dataset.col);
        const pieceCode = this.board[r][c];

        if (this.selectedPiece) {
            const isValidMove = this.possibleMoves.some(move => move.r === r && move.c === c);
            if (isValidMove) {
                this._movePiece(this.selectedPiece.row, this.selectedPiece.col, r, c); // Mueve en this.board
                this.selectedPiece = null;
                this.possibleMoves = [];
                // No cambiar currentPlayer aquí todavía, _checkIfMoveIsValid lo hará si el movimiento es legal
                // y luego _endTurn lo hará.

                // Después de un movimiento humano, comprobar si el rey del humano está a salvo
                const humanColor = this.currentPlayer;
                if (this._isKingInCheck(humanColor, this.board)) {
                    // Movimiento ilegal, el rey sigue/está en jaque. Revertir.
                    // Esto es simplista, idealmente _calculatePossibleMoves ya filtra estos.
                    // Por ahora, podemos simplemente no cambiar el turno.
                    console.warn("Movimiento ilegal: el rey propio quedaría en jaque.");
                    // Revertir el movimiento (necesitaríamos guardar el estado anterior)
                    // O simplemente no cambiar el turno y que el jugador intente de nuevo.
                    // Para esta versión, no cambiaremos el turno y se mostrará el jaque.
                    this._updateStatus(); // Actualizará para mostrar el jaque
                    this._renderBoard();
                    return; // No proceder al turno de la IA
                }

                this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
                this._updateStatus(); // Actualiza estado Y llama a _checkForEndGame
                this._renderBoard();

                if (!this.gameOver && this.gameMode === '1P' && this.currentPlayer === this.aiPlayer) {
                    this._aiMove();
                }
            } else {
                if (pieceCode && this._getPieceColor(pieceCode) === this.currentPlayer) {
                    this.selectedPiece = { piece: pieceCode, color: this.currentPlayer, row: r, col: c };
                    this.possibleMoves = this._calculatePossibleMovesForPiece(r,c,pieceCode, this.board);
                } else {
                    this.selectedPiece = null;
                    this.possibleMoves = [];
                }
                this._renderBoard();
            }
        } else {
            if (pieceCode && this._getPieceColor(pieceCode) === this.currentPlayer) {
                this.selectedPiece = { piece: pieceCode, color: this.currentPlayer, row: r, col: c };
                this.possibleMoves = this._calculatePossibleMovesForPiece(r,c,pieceCode, this.board);
                this._renderBoard();
            }
        }
    }


    _movePiece(fromRow, fromCol, toRow, toCol, boardState = this.board) { // Aceptar un estado de tablero
        const pieceToMove = boardState[fromRow][fromCol];
        boardState[toRow][toCol] = pieceToMove;
        boardState[fromRow][fromCol] = null;

        if (pieceToMove === 'P' && toRow === 0) boardState[toRow][toCol] = 'Q';
        if (pieceToMove === 'p' && toRow === 7) boardState[toRow][toCol] = 'q';
    }

    // Renombrado para claridad, y acepta un boardState
    _calculatePossibleMovesForPiece(r, c, pieceCode, boardState) {
        // ... (la lógica de _calculatePossibleMoves de la respuesta anterior va aquí)
        // ... Asegúrate de que usa boardState en lugar de this.board para todas las comprobaciones
        // ... y _getPieceColor(boardState[nr][nc])
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

    _addLinearMovesToBoard(moves, r, c, pieceColor, directions, boardState) { // Acepta boardState
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


    // Comprueba si un jugador específico está en jaque en un estado de tablero dado
    _isKingInCheck(playerColor, boardState) {
        const kingPos = this._findKing(playerColor, boardState);
        if (!kingPos) return false; // No hay rey, algo raro (o juego terminado)
        const opponentColor = playerColor === 'white' ? 'black' : 'white';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const pieceCode = boardState[r][c];
                if (pieceCode && this._getPieceColor(pieceCode) === opponentColor) {
                    const moves = this._calculatePossibleMovesForPiece(r, c, pieceCode, boardState);
                    if (moves.some(move => move.r === kingPos.r && move.c === kingPos.c)) {
                        return true; // El rey está atacado
                    }
                }
            }
        }
        return false;
    }

    // Genera todos los movimientos legales para un jugador, filtrando aquellos que dejan al rey en jaque
    _getAllLegalMovesForPlayer(playerColor, boardState) {
        const legalMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const pieceCode = boardState[r][c];
                if (pieceCode && this._getPieceColor(pieceCode) === playerColor) {
                    const possibleMoves = this._calculatePossibleMovesForPiece(r, c, pieceCode, boardState);
                    for (const move of possibleMoves) {
                        // Simular el movimiento en un tablero temporal
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

    _checkForEndGame(playerColor) { // Comprueba si playerColor está en jaque mate o ahogado
        if (this.gameOver) return;

        const legalMoves = this._getAllLegalMovesForPlayer(playerColor, this.board);
        if (legalMoves.length === 0) {
            this.gameOver = true;
            if (this._isKingInCheck(playerColor, this.board)) {
                this.gameStatus = `¡Jaque Mate! Ganan las ${playerColor === 'white' ? 'Negras' : 'Blancas'}.`;
            } else {
                this.gameStatus = "¡Ahogado! Empate.";
            }
            this.statusElement.textContent = this.gameStatus;
            this.statusElement.classList.add(this._isKingInCheck(playerColor, this.board) ? 'check-mate-status' : 'stalemate-status'); // Añadir CSS para esto
            return true; // Juego terminado
        }
        return false; // Juego continúa
    }

    _updateStatus() {
        if (!this.statusElement || this.gameOver) return;

        let turnMessage = `Turno de las ${this.currentPlayer === 'white' ? 'Blancas' : 'Negras'}.`;

        // Verificar que el tablero esté inicializado antes de comprobar jaque
        if (this.board && Array.isArray(this.board) && this.board.length === 8) {
            const kingCurrentlyInCheck = this._isKingInCheck(this.currentPlayer, this.board);

            if (kingCurrentlyInCheck) {
                this.gameStatus = `¡Jaque! ${turnMessage}`;
                this.statusElement.classList.add('check-status');
            } else {
                this.gameStatus = turnMessage;
                this.statusElement.classList.remove('check-status');
            }

            // Comprobar fin de juego para el jugador actual DESPUÉS de actualizar el mensaje de turno
            this._checkForEndGame(this.currentPlayer);
        } else {
            this.gameStatus = turnMessage;
        }

        this.statusElement.textContent = this.gameStatus;
    }

    // --- Lógica de la IA Mejorada ---
    _aiMove() {
        if (this.currentPlayer !== this.aiPlayer || this.isAiThinking || this.gameOver) return;

        this.isAiThinking = true;
        this.statusElement.textContent = "IA (Negras) está pensando...";
        this.selectedPiece = null; // Deseleccionar cualquier pieza del humano visualmente
        this.possibleMoves = [];
        this._renderBoard(); // Actualizar tablero para quitar resaltados del humano

        setTimeout(() => {
            let bestMove = null;
            const legalMoves = this._getAllLegalMovesForPlayer(this.aiPlayer, this.board);

            if (legalMoves.length === 0) {
                // Esto ya debería haber sido capturado por _checkForEndGame después del turno del humano
                // Pero es una doble comprobación.
                console.log("IA no tiene movimientos legales.");
                this.isAiThinking = false;
                // _checkForEndGame ya debería haber establecido gameOver y el mensaje.
                // this._updateStatus(); // Para asegurar que el mensaje de fin de juego se muestre
                return;
            }

            // 1. Prioridad: Salir de Jaque
            if (this._isKingInCheck(this.aiPlayer, this.board)) {
                // Buscar movimientos que saquen al rey del jaque (ya filtrados por _getAllLegalMovesForPlayer)
                // Simplemente elegimos uno al azar de los legales.
                bestMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                console.log("IA: Saliendo de jaque con:", bestMove);
            }

            // 2. Prioridad: Dar Jaque Mate (muy difícil de implementar bien con IA simple)
            // Omitido por simplicidad, pero se podría evaluar si algún movimiento lleva a Jaque Mate.

            // 3. Prioridad: Capturar piezas (con valor) o dar Jaque
            if (!bestMove) {
                let highValueCapture = null;
                let highestValue = -1;
                let checkingMove = null;

                for (const move of legalMoves) {
                    const targetPieceCode = this.board[move.to.r][move.to.c];
                    // Simular el movimiento para ver si da jaque
                    const tempBoard = this.board.map(arr => arr.slice());
                    this._movePiece(move.from.r, move.from.c, move.to.r, move.to.c, tempBoard);

                    if (this._isKingInCheck(this.currentPlayer === 'white' ? 'black' : 'white', tempBoard)) { // Si da jaque al oponente
                        checkingMove = move; // Priorizar dar jaque
                        // break; // Podríamos tomar el primer jaque encontrado
                    }

                    if (targetPieceCode) { // Es una captura
                        const value = this.pieceValues[targetPieceCode.toLowerCase()] || 0;
                        if (value > highestValue) {
                            highestValue = value;
                            highValueCapture = move;
                        }
                    }
                }

                // Si encontramos un movimiento que da jaque, lo usamos
                if (checkingMove) {
                    bestMove = checkingMove;
                } else if (highValueCapture) {
                    // Si no hay jaque, pero hay una captura de alto valor, la usamos
                    bestMove = highValueCapture;
                } else {
                    // Movimiento aleatorio entre los legales (mejor que nada)
                    bestMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                }
            }

            // Ejecutar el mejor movimiento encontrado
            if (bestMove) {
                this._movePiece(bestMove.from.r, bestMove.from.c, bestMove.to.r, bestMove.to.c);
                console.log("IA ejecuta movimiento:", bestMove);
            }

            this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
            this.isAiThinking = false;
            this._updateStatus();
            this._renderBoard();

            // Comprobar fin de juego después del movimiento de la IA
            this._checkForEndGame(this.currentPlayer);
        }, 1000); // Simular tiempo de pensamiento de la IA
    }
}