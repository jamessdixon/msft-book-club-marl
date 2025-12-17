const COLUMNS = 12;
const ROWS = 8;
const AGENT_COUNT = 3;
const APPLE_COUNT = 8;

const boardElement = document.getElementById("board");
const cells = [];

// --- Board creation ---
for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");

        boardElement.appendChild(cell);
        cells.push(cell);
    }
}

// --- Track occupied cells for initial placement ---
const occupiedIndices = new Set();

// --- Agent objects ---
const agents = [];

// --- Place agents and apples ---
placeAgents();
placeApples();

// --- Hook up Next Turn button ---
const nextTurnBtn = document.getElementById("nextTurnBtn");
nextTurnBtn.addEventListener("click", nextTurn);

// -------------------- FUNCTIONS --------------------

function placeAgents() {
    let placed = 0;

    while (placed < AGENT_COUNT) {
        const index = getRandomIndex();

        if (!occupiedIndices.has(index)) {
            occupiedIndices.add(index);

            const agentDiv = document.createElement("div");
            agentDiv.classList.add("agent");
            agentDiv.textContent = "🤖";

            cells[index].appendChild(agentDiv);

            const row = Math.floor(index / COLUMNS);
            const col = index % COLUMNS;

            agents.push({
                row,
                col,
                element: agentDiv,
                score: 0
            });

            placed++;
        }
    }
}

function placeApples() {
    let applesPlaced = 0;

    while (applesPlaced < APPLE_COUNT) {
        const index = getRandomIndex();

        if (!occupiedIndices.has(index)) {
            occupiedIndices.add(index);

            const apple = document.createElement("div");
            apple.classList.add("apple");
            const value = Math.floor(Math.random() * 3) + 1;
            apple.textContent = `🍎${value}`;
            apple.dataset.value = value; // store numeric value

            cells[index].appendChild(apple);
            applesPlaced++;
        }
    }
}

function getRandomIndex() {
    return Math.floor(Math.random() * cells.length);
}

// -------------------- Agent Turn Logic --------------------

function nextTurn() {
    const appleElements = Array.from(document.querySelectorAll(".apple"));

    // Map apples to row/col positions
    const apples = appleElements.map(apple => {
        const index = cells.indexOf(apple.parentElement);
        const row = Math.floor(index / COLUMNS);
        const col = index % COLUMNS;
        return { row, col, element: apple, value: parseInt(apple.dataset.value) };
    });

    agents.forEach(agent => {
        if (apples.length === 0) return;

        moveAgentTowardNearestApple(agent, apples);

        // Collect adjacent apples (with collaboration rules)
        collectAdjacentApples(agent);
    });

    // Check if all apples collected
    if (document.querySelectorAll(".apple").length === 0) {
        displayFinalScores();
        nextTurnBtn.disabled = true;
    }
}

// -------------------- Movement AI --------------------

function moveAgentTowardNearestApple(agent, apples) {
    // Find nearest apple
    let nearest = null;
    let minDist = Infinity;

    apples.forEach(apple => {
        const dist = Math.abs(agent.row - apple.row) + Math.abs(agent.col - apple.col);
        if (dist < minDist) {
            minDist = dist;
            nearest = apple;
        }
    });

    if (!nearest) return;

    // Determine possible moves
    const possibleMoves = [];
    if (agent.row > 0 && isCellFree(agent.row - 1, agent.col)) possibleMoves.push("up");
    if (agent.row < ROWS - 1 && isCellFree(agent.row + 1, agent.col)) possibleMoves.push("down");
    if (agent.col > 0 && isCellFree(agent.row, agent.col - 1)) possibleMoves.push("left");
    if (agent.col < COLUMNS - 1 && isCellFree(agent.row, agent.col + 1)) possibleMoves.push("right");

    if (possibleMoves.length === 0) return;

    // Pick move that minimizes distance to nearest apple
    let bestMove = possibleMoves[0];
    let bestDist = minDist;

    possibleMoves.forEach(move => {
        let newRow = agent.row;
        let newCol = agent.col;

        switch (move) {
            case "up": newRow--; break;
            case "down": newRow++; break;
            case "left": newCol--; break;
            case "right": newCol++; break;
        }

        const dist = Math.abs(newRow - nearest.row) + Math.abs(newCol - nearest.col);
        if (dist < bestDist) {
            bestDist = dist;
            bestMove = move;
        }
    });

    performMove(agent, bestMove);
}

// -------------------- Movement Helpers --------------------

function performMove(agent, direction) {
    let targetRow = agent.row;
    let targetCol = agent.col;

    switch (direction) {
        case "up": targetRow--; break;
        case "down": targetRow++; break;
        case "left": targetCol--; break;
        case "right": targetCol++; break;
    }

    moveAgent(agent, targetRow, targetCol);
}

function moveAgent(agent, newRow, newCol) {
    const oldIndex = agent.row * COLUMNS + agent.col;
    const newIndex = newRow * COLUMNS + newCol;

    cells[oldIndex].removeChild(agent.element);
    cells[newIndex].appendChild(agent.element);

    agent.row = newRow;
    agent.col = newCol;
}

function isCellFree(row, col) {
    const index = row * COLUMNS + col;
    const cell = cells[index];

    if (cell.querySelector(".agent")) return false;
    if (cell.querySelector(".apple")) return false;

    return true;
}

// -------------------- Reward Function --------------------

function collectAdjacentApples(agent) {
    const deltas = [
        [0, -1], // left
        [0, 1],  // right
        [-1, 0], // up
        [1, 0]   // down
    ];

    deltas.forEach(([dr, dc]) => {
        const r = agent.row + dr;
        const c = agent.col + dc;

        if (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS) {
            const index = r * COLUMNS + c;
            const cell = cells[index];
            const apple = cell.querySelector(".apple");

            if (apple) {
                const value = parseInt(apple.dataset.value);

                if (value <= 2) {
                    // Single agent can collect
                    agent.score += value;
                    apple.remove();
                    console.log(`Agent at (${agent.row},${agent.col}) collected an apple worth ${value}`);
                } else if (value === 3) {
                    // Requires 2+ agents adjacent
                    const adjacentAgents = countAgentsAdjacentToCell(r, c);
                    if (adjacentAgents >= 2) {
                        agents.forEach(a => {
                            if (isAgentAdjacentToCell(a, r, c)) {
                                a.score += value;
                                console.log(`Agent at (${a.row},${a.col}) collected a collaborative apple worth ${value}`);
                            }
                        });
                        apple.remove();
                    }
                }
            }
        }
    });
}

// Count agents adjacent to a specific cell
function countAgentsAdjacentToCell(row, col) {
    let count = 0;
    agents.forEach(a => {
        if (isAgentAdjacentToCell(a, row, col)) count++;
    });
    return count;
}

// Check if agent is adjacent (orthogonal) to a cell
function isAgentAdjacentToCell(agent, row, col) {
    const dr = Math.abs(agent.row - row);
    const dc = Math.abs(agent.col - col);
    return (dr + dc === 1);
}

// -------------------- Scoreboard --------------------

function displayFinalScores() {
    const scoreboard = document.getElementById("scoreboard");
    scoreboard.innerHTML = "<h2>All apples collected!</h2>";

    agents.forEach((agent, i) => {
        const p = document.createElement("p");
        p.textContent = `Agent ${i + 1}: ${agent.score} points`;
        scoreboard.appendChild(p);
    });
}
