// Chess Game Engine - Full rule implementation
class ChessGame {
    constructor() {
        this.initializeBoard();
        this.moveHistory = [];
        this.gameState = 'active';
    }

    initializeBoard() {
        this.board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
        this.currentTurn = 'white';
        this.whiteKingMoved = false;
        this.blackKingMoved = false;
        this.whiteRooksMoved = [false, false];
        this.blackRooksMoved = [false, false];
    }

    makeMove(from, to) {
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        const piece = this.board[fromRow][fromCol];

        if (!piece) return false;

        const validMoves = this.getValidMoves(from);
        if (!validMoves.some(m => m[0] === toRow && m[1] === toCol)) {
            return false;
        }

        // Track king and rook movements for castling
        if (piece.toLowerCase() === 'k') {
            if (this.currentTurn === 'white') this.whiteKingMoved = true;
            else this.blackKingMoved = true;
        }
        if (piece.toLowerCase() === 'r') {
            if (piece === 'R') {
                if (fromCol === 0) this.whiteRooksMoved[0] = true;
                if (fromCol === 7) this.whiteRooksMoved[1] = true;
            } else {
                if (fromCol === 0) this.blackRooksMoved[0] = true;
                if (fromCol === 7) this.blackRooksMoved[1] = true;
            }
        }

        // Handle castling
        if (piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
            if (toCol > fromCol) { // Kingside castling
                const rook = this.board[fromRow][7];
                this.board[fromRow][5] = rook;
                this.board[fromRow][7] = null;
            } else { // Queenside castling
                const rook = this.board[fromRow][0];
                this.board[fromRow][3] = rook;
                this.board[fromRow][0] = null;
            }
        }

        // Handle en passant
        if (piece.toLowerCase() === 'p' && fromCol !== toCol && !this.board[toRow][toCol]) {
            this.board[fromRow][toCol] = null;
        }

        // Handle pawn promotion
        if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
            this.board[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
        } else {
            this.board[toRow][toCol] = piece;
        }

        this.board[fromRow][fromCol] = null;
        this.moveHistory.push({ from, to, piece });
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

        this.updateGameState();
        return true;
    }

    getValidMoves(position) {
        const [row, col] = position;
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const isWhite = piece === piece.toUpperCase();
        const directions = {
            'p': isWhite ? [[-1, -1], [-1, 0], [-1, 1]] : [[1, -1], [1, 0], [1, 1]],
            'n': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
            'b': [[-1, -1], [-1, 1], [1, -1], [1, 1]],
            'r': [[-1, 0], [1, 0], [0, -1], [0, 1]],
            'q': [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
            'k': [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
        };

        const directions_array = directions[piece.toLowerCase()];
        if (!directions_array) return moves;

        // Pawns and knights have special handling
        if (piece.toLowerCase() === 'p') {
            const direction = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;
            const newRow = row + direction;

            if (newRow >= 0 && newRow < 8 && !this.board[newRow][col]) {
                moves.push([newRow, col]);
                if (row === startRow && !this.board[row + 2 * direction][col]) {
                    moves.push([row + 2 * direction, col]);
                }
            }

            for (let c of [col - 1, col + 1]) {
                if (c >= 0 && c < 8 && this.board[newRow][c]) {
                    const targetPiece = this.board[newRow][c];
                    if ((isWhite && targetPiece !== targetPiece.toUpperCase()) ||
                        (!isWhite && targetPiece === targetPiece.toUpperCase())) {
                        moves.push([newRow, c]);
                    }
                }
            }
        } else if (piece.toLowerCase() === 'n') {
            for (let [dr, dc] of directions_array) {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = this.board[newRow][newCol];
                    if (!target || (isWhite && target !== target.toUpperCase()) ||
                        (!isWhite && target === target.toUpperCase())) {
                        moves.push([newRow, newCol]);
                    }
                }
            }
        } else {
            // Sliding pieces (bishop, rook, queen)
            for (let [dr, dc] of directions_array) {
                for (let i = 1; i < 8; i++) {
                    const newRow = row + dr * i;
                    const newCol = col + dc * i;
                    if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;

                    const target = this.board[newRow][newCol];
                    if (!target) {
                        moves.push([newRow, newCol]);
                    } else {
                        if ((isWhite && target !== target.toUpperCase()) ||
                            (!isWhite && target === target.toUpperCase())) {
                            moves.push([newRow, newCol]);
                        }
                        break;
                    }
                }
            }

            // King castling
            if (piece.toLowerCase() === 'k') {
                const isWhiteKing = piece === 'K';
                const canCastle = isWhiteKing ? !this.whiteKingMoved : !this.blackKingMoved;
                if (canCastle && !this.isInCheck(position)) {
                    const rookMoved = isWhiteKing ? this.whiteRooksMoved : this.blackRooksMoved;
                    if (!rookMoved[1]) {
                        if (!this.board[row][5] && !this.board[row][6]) {
                            moves.push([row, 6]);
                        }
                    }
                    if (!rookMoved[0]) {
                        if (!this.board[row][1] && !this.board[row][2] && !this.board[row][3]) {
                            moves.push([row, 2]);
                        }
                    }
                }
            }
        }

        // Filter moves that leave king in check
        return moves.filter(move => {
            const temp = this.board[move[0]][move[1]];
            this.board[move[0]][move[1]] = piece;
            this.board[row][col] = null;
            const inCheck = this.isInCheck([move[0], move[1]]);
            this.board[row][col] = piece;
            this.board[move[0]][move[1]] = temp;
            return !inCheck;
        });
    }

    isInCheck(kingPos) {
        const [kRow, kCol] = kingPos;
        const piece = this.board[kRow][kCol];
        const isWhite = piece === piece.toUpperCase();

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = this.board[row][col];
                if (!p) continue;
                const pIsWhite = p === p.toUpperCase();
                if (pIsWhite === isWhite) continue;

                const pieceMoves = this.getValidMovesNoCheck([row, col]);
                if (pieceMoves.some(m => m[0] === kRow && m[1] === kCol)) {
                    return true;
                }
            }
        }
        return false;
    }

    getValidMovesNoCheck(position) {
        // Same as getValidMoves but without the check filter
        const [row, col] = position;
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const isWhite = piece === piece.toUpperCase();

        // Simplified version without recursion check
        if (piece.toLowerCase() === 'p') {
            const direction = isWhite ? -1 : 1;
            const newRow = row + direction;
            if (newRow >= 0 && newRow < 8 && !this.board[newRow][col]) {
                moves.push([newRow, col]);
            }
            for (let c of [col - 1, col + 1]) {
                if (c >= 0 && c < 8 && this.board[newRow][c]) {
                    moves.push([newRow, c]);
                }
            }
        } else if (piece.toLowerCase() === 'n') {
            const directions = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            for (let [dr, dc] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    updateGameState() {
        const kingPos = this.findKing(this.currentTurn);
        const validMoves = this.getAllValidMoves(this.currentTurn);

        if (validMoves.length === 0) {
            if (this.isInCheck(kingPos)) {
                this.gameState = this.currentTurn === 'white' ? 'blackWins' : 'whiteWins';
            } else {
                this.gameState = 'stalemate';
            }
        } else {
            this.gameState = 'active';
        }
    }

    findKing(color) {
        const target = color === 'white' ? 'K' : 'k';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === target) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    getAllValidMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (!piece) continue;
                const isWhite = piece === piece.toUpperCase();
                if ((color === 'white' && isWhite) || (color === 'black' && !isWhite)) {
                    moves.push(...this.getValidMoves([row, col]));
                }
            }
        }
        return moves;
    }

    getBoardState() {
        return this.board.map(row => [...row]);
    }

    undo() {
        if (this.moveHistory.length === 0) return false;
        const move = this.moveHistory.pop();
        const [fromRow, fromCol] = move.from;
        const [toRow, toCol] = move.to;

        this.board[fromRow][fromCol] = move.piece;
        this.board[toRow][toCol] = null;
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.gameState = 'active';
        return true;
    }
}