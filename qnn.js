// Quantum Neural Network - Adaptive Learning AI
class QuantumNeuralNetwork {
    constructor() {
        this.version = 1;
        this.modelUpdates = 0;
        this.initializeLayers();
        this.trainingData = [];
        this.gameResults = [];
        this.learningRate = 0.001;
        this.momentum = 0.9;
        this.velocities = null;
        this.accuracy = 0.5;
    }

    initializeLayers() {
        // 4-layer network: 64 -> 256 -> 128 -> 64 -> 1
        this.layers = [
            this.randomMatrix(64, 256),
            this.randomMatrix(256, 128),
            this.randomMatrix(128, 64),
            this.randomMatrix(64, 1)
        ];
        this.biases = [
            new Array(256).fill(0.1),
            new Array(128).fill(0.1),
            new Array(64).fill(0.1),
            new Array(1).fill(0.1)
        ];
        this.initializeVelocities();
    }

    initializeVelocities() {
        this.velocities = this.layers.map(layer => 
            layer.map(row => new Array(row.length).fill(0))
        );
    }

    randomMatrix(rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = [];
            for (let j = 0; j < cols; j++) {
                matrix[i][j] = (Math.random() - 0.5) * 0.1;
            }
        }
        return matrix;
    }

    boardToInput(board) {
        // Convert chess board to 64-element array
        const input = new Array(64);
        const pieceValues = {
            'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 0,
            'p': -1, 'n': -3, 'b': -3, 'r': -5, 'q': -9, 'k': 0
        };

        let idx = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                input[idx] = piece ? pieceValues[piece] / 10 : 0;
                idx++;
            }
        }
        return input;
    }

    relu(x) {
        return Math.max(0, x);
    }

    reluDerivative(x) {
        return x > 0 ? 1 : 0;
    }

    sigmoid(x) {
        return 1 / (1 + Math.exp(-Math.min(Math.max(x, -500), 500)));
    }

    sigmoid_derivative(x) {
        return x * (1 - x);
    }

    forward(input) {
        let activation = input;
        const activations = [activation];

        // Forward pass through layers
        for (let l = 0; l < this.layers.length; l++) {
            const z = new Array(this.layers[l][0].length).fill(0);
            
            for (let j = 0; j < this.layers[l][0].length; j++) {
                for (let i = 0; i < activation.length; i++) {
                    z[j] += activation[i] * this.layers[l][i][j];
                }
                z[j] += this.biases[l][j];
            }

            // Activation function
            if (l === this.layers.length - 1) {
                activation = z.map(x => this.sigmoid(x));
            } else {
                activation = z.map(x => this.relu(x));
            }

            activations.push(activation);
        }

        return { output: activation[activation.length - 1][0], activations };
    }

    backward(input, target, prediction, activations) {
        const deltas = [];

        // Output layer delta
        const outputDelta = (prediction - target) * this.sigmoid_derivative(prediction);
        deltas.push([outputDelta]);

        // Backpropagate through layers
        for (let l = this.layers.length - 1; l > 0; l--) {
            const nextDeltas = new Array(this.layers[l - 1][0].length).fill(0);

            for (let i = 0; i < this.layers[l - 1][0].length; i++) {
                for (let j = 0; j < deltas[0].length; j++) {
                    nextDeltas[i] += deltas[0][j] * this.layers[l][i][j];
                }
                nextDeltas[i] *= this.reluDerivative(activations[l][i]);
            }

            deltas.unshift(nextDeltas);
        }

        // Update weights with momentum
        for (let l = 0; l < this.layers.length; l++) {
            for (let i = 0; i < this.layers[l].length; i++) {
                for (let j = 0; j < this.layers[l][i].length; j++) {
                    const gradient = activations[l][i] * deltas[l][j];
                    this.velocities[l][i][j] = this.momentum * this.velocities[l][i][j] 
                                              - this.learningRate * gradient;
                    this.layers[l][i][j] += this.velocities[l][i][j];
                }
            }

            // Update biases
            for (let j = 0; j < this.biases[l].length; j++) {
                this.biases[l][j] -= this.learningRate * deltas[l][j];
            }
        }
    }

    train(gameHistory, result) {
        // result: 1 if AI won, 0 if lost
        let correctPredictions = 0;

        for (let i = 0; i < gameHistory.length; i++) {
            const board = gameHistory[i];
            const input = this.boardToInput(board);
            
            // Create target: positions leading to win should output 1
            const target = result === 1 ? Math.min(1, 0.5 + (i / gameHistory.length) * 0.5) : 
                                        Math.max(0, 0.5 - (i / gameHistory.length) * 0.5);

            const { output, activations } = this.forward(input);
            this.backward(input, target, output, activations);

            // Track accuracy
            const prediction = output > 0.5 ? 1 : 0;
            if ((result === 1 && prediction === 1) || (result === 0 && prediction === 0)) {
                correctPredictions++;
            }
        }

        this.accuracy = correctPredictions / gameHistory.length;
    }

    evaluatePosition(board) {
        const input = this.boardToInput(board);
        const { output } = this.forward(input);
        return output; // 0 to 1 score
    }

    batchTrain(gamesData) {
        let totalAccuracy = 0;

        for (let gameData of gamesData) {
            this.train(gameData.history, gameData.result);
            totalAccuracy += this.accuracy;
        }

        this.accuracy = totalAccuracy / gamesData.length;
        this.modelUpdates++;
        
        // Gradually decrease learning rate
        this.learningRate *= 0.995;

        return this.accuracy;
    }

    export() {
        return {
            version: this.version,
            layers: this.layers,
            biases: this.biases,
            modelUpdates: this.modelUpdates,
            accuracy: this.accuracy
        };
    }

    import(data) {
        this.version = data.version;
        this.layers = data.layers;
        this.biases = data.biases;
        this.modelUpdates = data.modelUpdates;
        this.accuracy = data.accuracy;
        this.initializeVelocities();
    }

    reset() {
        this.version++;
        this.modelUpdates = 0;
        this.accuracy = 0.5;
        this.learningRate = 0.001;
        this.initializeLayers();
    }
}