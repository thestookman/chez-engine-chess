// Main game controller
let chess = new ChessGame();
let qnn = new QuantumNeuralNetwork();
let selectedSquare = null;
let gameActive = true;
let playerColor = 'white';
let aiLevel = 'medium';
let gamesPlayed = 0;
let aiWins = 0;
let playerWins = 0;
let gameHistory = [];
let trainingGames = [];

const STOCKFISH_STRENGTH = 0.85;

// Initialize UI
function initializeBoard() {
    renderBoard();
    updateStats();
}

function renderBoard() {
    const boardElement = document.getElementById('chessBoard');
    boardElement.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const piece = chess.board[row][col];
            const isLight = (row + col) % 2 === 0;

            square.className = `square ${isLight ? 'light' : 'dark'}`;
            if (piece) square.textContent = piece;

            square.onclick = () => selectSquare(row, col);
            boardElement.appendChild(square);
        }
    }

    updateGameStatus();
}

function selectSquare(row, col) {
    if (!gameActive || chess.currentTurn !== playerColor) return;

    if (selectedSquare === null) {
        if (chess.board[row][col] && isPlayerPiece(chess.board[row][col])) {
            selectedSquare = [row, col];
            highlightValidMoves([row, col]);
        }
    } else {
        const [fromRow, fromCol] = selectedSquare;

        if (chess.makeMove([fromRow, fromCol], [row, col])) {
            gameHistory.push(chess.getBoardState());
            selectedSquare = null;
            renderBoard();

            if (chess.gameState === 'active') {
                setTimeout(() => {
                    makeAIMove();
                }, 500);
            } else {
                endGame();
            }
        }

        selectedSquare = null;
        renderBoard();
    }
}

function isPlayerPiece(piece) {
    const isWhite = piece === piece.toUpperCase();
    return (playerColor === 'white' && isWhite) || (playerColor === 'black' && !isWhite);
}

function highlightValidMoves(position) {
    const validMoves = chess.getValidMoves(position);
    const boardElement = document.getElementById('chessBoard');
    const squares = boardElement.querySelectorAll('.square');

    let idx = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = squares[idx++];
            if (row === position[0] && col === position[1]) {
                square.classList.add('selected');
            } else if (validMoves.some(m => m[0] === row && m[1] === col)) {
                square.classList.add('highlight');
            }
        }
    }
}

function makeAIMove() {
    if (chess.gameState !== 'active') return;

    const validMoves = chess.getAllValidMoves(chess.currentTurn);
    if (validMoves.length === 0) {
        endGame();
        return;
    }

    document.getElementById('aiThinking').innerHTML = 
        '<span class="thinking-indicator">AI Thinking<span class="thinking-dot">...</span></span>';

    let bestMove = null;
    let bestScore = -Infinity;

    for (let movePos of validMoves) {
        const [toRow, toCol] = movePos;
        
        // Find which piece moves to this position
        let fromPos = null;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (chess.board[row][col]) {
                    const moves = chess.getValidMoves([row, col]);
                    if (moves.some(m => m[0] === toRow && m[1] === toCol)) {
                        fromPos = [row, col];
                        break;
                    }
                }
            }
            if (fromPos) break;
        }

        if (!fromPos) continue;

        // Simulate move
        const originalPiece = chess.board[toRow][toCol];
        chess.makeMove(fromPos, movePos);

        // Evaluate position
        let score = 0;
        const board = chess.getBoardState();

        if (aiLevel === 'stockfish') {
            score = evaluatePositionStockfish(board) * STOCKFISH_STRENGTH;
        } else {
            score = qnn.evaluatePosition(board);
        }

        // Add some randomness for lower difficulty
        if (aiLevel === 'easy') {
            score += (Math.random() - 0.5) * 0.3;
        } else if (aiLevel === 'medium') {
            score += (Math.random() - 0.5) * 0.1;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMove = movePos;
        }

        // Undo move
        chess.undo();
        chess.board[toRow][toCol] = originalPiece;
    }

    if (bestMove) {
        let fromPos = null;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (chess.board[row][col]) {
                    const moves = chess.getValidMoves([row, col]);
                    if (moves.some(m => m[0] === bestMove[0] && m[1] === bestMove[1])) {
                        fromPos = [row, col];
                        break;
                    }
                }
            }
            if (fromPos) break;
        }

        if (fromPos) {
            chess.makeMove(fromPos, bestMove);
            gameHistory.push(chess.getBoardState());
            renderBoard();

            document.getElementById('aiAnalysis').innerHTML = 
                `Eval: ${(bestScore * 100).toFixed(1)}% | Move: ${posToNotation(fromPos)}-${posToNotation(bestMove)}`;
        }
    }

    document.getElementById('aiThinking').innerHTML = '';

    if (chess.gameState !== 'active') {
        endGame();
    }
}

function evaluatePositionStockfish(board) {
    // Stockfish-like evaluation
    const pieceValues = { 'P': 1, 'N': 3, 'B': 3.5, 'R': 5, 'Q': 9, 'K': 0 };
    let score = 0;

    // Material count
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = pieceValues[piece.toUpperCase()] || 0;
                score += piece === piece.toUpperCase() ? value : -value;
            }
        }
    }

    // Positional bonuses
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!piece) continue;

            const isWhite = piece === piece.toUpperCase();
            let bonus = 0;

            if (piece.toLowerCase() === 'p') {
                bonus = isWhite ? (6 - row) * 0.5 : (row - 1) * 0.5;
            } else if (piece.toLowerCase() === 'k') {
                const centerDist = Math.abs(col - 3.5) + Math.abs(row - 3.5);
                bonus = (8 - centerDist) * 0.1;
            } else {
                const centerDist = Math.abs(col - 3.5) + Math.abs(row - 3.5);
                bonus = (8 - centerDist) * 0.15;
            }

            score += isWhite ? bonus : -bonus;
        }
    }

    // Normalize to 0-1 range
    return (score + 50) / 100;
}

function posToNotation(pos) {
    const files = 'abcdefgh';
    return files[pos[1]] + (8 - pos[0]);
}

function endGame() {
    gameActive = false;
    gamesPlayed++;

    let result = 'Draw';
    let aiWon = false;

    if (chess.gameState === 'whiteWins') {
        result = playerColor === 'white' ? 'You Win!' : 'AI Wins!';
        aiWon = playerColor === 'black';
    } else if (chess.gameState === 'blackWins') {
        result = playerColor === 'black' ? 'You Win!' : 'AI Wins!';
        aiWon = playerColor === 'white';
    }

    if (aiWon) aiWins++;
    else if (result !== 'Draw') playerWins++;

    // Store game for training
    trainingGames.push({
        history: gameHistory,
        result: aiWon ? 1 : 0
    });

    document.getElementById('gameStatus').innerHTML = `<strong>${result}</strong> (Game ${gamesPlayed})`;

    // Auto-train after every 5 games
    if (trainingGames.length >= 5) {
        trainNetwork();
    }

    updateStats();
}

function trainNetwork() {
    if (trainingGames.length === 0) return;

    const accuracy = qnn.batchTrain(trainingGames);
    trainingGames = [];

    updateTrainingDashboard();
    addTrainingLog(`✓ Network trained | Accuracy: ${(accuracy * 100).toFixed(1)}% | Version: v${qnn.version}`);
}

function updateStats() {
    const winRate = gamesPlayed > 0 ? (playerWins / gamesPlayed * 100) : 0;
    const elo = 1200 + (playerWins - aiWins) * 20;

    document.getElementById('gamesPlayed').textContent = gamesPlayed;
    document.getElementById('winRate').textContent = winRate.toFixed(1) + '%';
    document.getElementById('eloRating').textContent = Math.round(elo);
    document.getElementById('networkVersion').textContent = 'v' + qnn.version;
}

function updateTrainingDashboard() {
    const trainingGamesCount = gamesPlayed;
    const trainingProgress = (trainingGamesCount % 5) / 5 * 100;

    document.getElementById('trainingGames').textContent = trainingGamesCount;
    document.getElementById('trainingProgress').style.width = trainingProgress + '%';
    document.getElementById('accuracy').textContent = (qnn.accuracy * 100).toFixed(1);
    document.getElementById('performanceBar').style.width = (qnn.accuracy * 100) + '%';
    document.getElementById('learningRate').textContent = qnn.learningRate.toFixed(5);
    document.getElementById('learningRateBar').style.width = (qnn.learningRate / 0.001 * 100) + '%';
    document.getElementById('modelUpdates').textContent = qnn.modelUpdates;
}

function updateGameStatus() {
    let status = chess.currentTurn === 'white' ? 'White' : 'Black';
    status += ' to move';

    if (chess.gameState !== 'active') {
        status = chess.gameState === 'stalemate' ? 'Stalemate' : 
                 chess.gameState === 'whiteWins' ? 'White Wins!' : 'Black Wins!';
    }

    document.getElementById('gameStatus').textContent = status;

    // Update move list
    const moveList = document.getElementById('moveList');
    moveList.innerHTML = chess.moveHistory.map((m, i) => 
        `<div class="move-item">${i + 1}. ${posToNotation(m.from)} → ${posToNotation(m.to)}</div>`
    ).join('');
}

function newGame() {
    chess = new ChessGame();
    gameActive = true;
    selectedSquare = null;
    gameHistory = [];
    playerColor = document.getElementById('playerColor').value;
    aiLevel = document.getElementById('aiLevel').value;

    document.getElementById('undoBtn').disabled = false;
    document.getElementById('resignBtn').disabled = false;

    renderBoard();

    if (playerColor === 'black') {
        setTimeout(makeAIMove, 500);
    }
}

function undoMove() {
    if (chess.moveHistory.length > 0) {
        chess.undo();
        if (gameHistory.length > 0) gameHistory.pop();
        renderBoard();
    }
}

function resign() {
    if (gameActive) {
        chess.gameState = playerColor === 'white' ? 'blackWins' : 'whiteWins';
        aiWins++;
        gamesPlayed++;
        endGame();
    }
}

function exportNetwork() {
    const data = qnn.export();
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-qnn-v${qnn.version}.json`;
    a.click();
    addTrainingLog(`↓ Network exported (v${qnn.version})`);
}

function importNetwork() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                qnn.import(data);
                addTrainingLog(`↑ Network imported (v${qnn.version})`);
                updateStats();
                updateTrainingDashboard();
            } catch (err) {
                alert('Failed to import network');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function resetNetwork() {
    if (confirm('Reset network to default state?')) {
        qnn.reset();
        trainingGames = [];
        gamesPlayed = 0;
        aiWins = 0;
        playerWins = 0;
        updateStats();
        updateTrainingDashboard();
        addTrainingLog('🔄 Network reset to v1');
    }
}

function addTrainingLog(message) {
    const log = document.getElementById('trainingLog');
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `[${time}] ${message}`;
    entry.style.margin = '2px 0';
    entry.style.padding = '4px';
    log.insertBefore(entry, log.firstChild);
    log.style.maxHeight = '150px';
}

// Initialize on load
window.addEventListener('load', () => {
    initializeBoard();
    updateTrainingDashboard();
    newGame();
});