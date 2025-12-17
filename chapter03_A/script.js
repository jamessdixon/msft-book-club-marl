const COLUMNS = 12;
const ROWS = 8;
const AGENT_COUNT = 3;
const APPLE_COUNT = 8;
const VISION_RADIUS = 2; // 5x5 vision window

const boardElement = document.getElementById("board");
const cells = [];

// -------------------- Board creation --------------------
for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        boardElement.appendChild(cell);
        cells.push(cell);
    }
}

// -------------------- Track occupied cells --------------------
const occupiedIndices = new Set();

// -------------------- Agents --------------------
const agents = [];

// -------------------- Place agents & apples --------------------
placeAgents();
placeApples();
updateVisibility();

// -------------------- Button --------------------
const nextTurnBtn = document.getElementById("nextTurnBtn");
nextTurnBtn.addEventListener("click", nextTurn);

// ==================== FUNCTIONS ====================

// -------------------- Placement --------------------

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

            agents.push({ row, col, element: agentDiv, score: 0 });
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
            apple.dataset.value = value;

            cells[index].appendChild(apple);
            applesPlaced++;
        }
    }
}

function getRandomIndex() {
    return Math.floor(Math.random() * cells.length);
}

// -------------------- Visibility --------------------

function isCellVisible(agent, row, col) {
    return (
        Math.abs(agent.row - row) <= VISION_RADIUS &&
        Math.abs(agent.col - col) <= VISION_RADIUS
    );
}

function updateVisibility() {
    cells.forEach(cell => cell.classList.remove("visible"));

    agents.forEach(agent => {
        for (let r = agent.row - VISION_RADIUS; r <= agent.row + VISION_RADIUS; r++) {
            for (let c = agent.col - VISION_RADIUS; c <= agent.col + VISION_RADIUS; c++) {
                if (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS) {
                    cells[r * COLUMNS + c].classList.add("visible");
                }
            }
        }
    });
}

// -------------------- Turn Logic --------------------

function nextTurn() {
    const appleElements = Array.from(document.querySelectorAll(".apple"));

    agents.forEach(agent => {
        const visibleApples = appleElements
            .map(apple => {
                const index = cells.indexOf(apple.parentElement);
                const row = Math.floor(index / COLUMNS);
                const col = index % COLUMNS;
                return { row, col, element: apple, value: parseInt(apple.dataset.value) };
            })
            .filter(apple => isCellVisible(agent, apple.row, apple.col));

        if (visibleApples.length === 0) return;

        moveAgentTowardNearestApple(agent, visibleApples);
        collectAdjacentApples(agent);
    });

    updateVisibility();

    if (document.querySelectorAll(".apple").length === 0) {
        displayFinalScores();
        nextTurnBtn.disabled = true;
    }
}

// -------------------- Movement AI --------------------

function moveAgentTowardNearestApple(agent, apples) {
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

    const possibleMoves = [];
    if (agent.row > 0 && isCellFree(agent.row - 1, agent.col)) possibleMoves.push("up");
    if (agent.row < ROWS - 1 && isCellFree(agent.row + 1, agent.col)) possibleMoves.push("down");
    if (agent.col > 0 && isCellFree(agent.row, agent.col - 1)) possibleMoves.push("left");
    if (agent.col < COLUMNS - 1 && isCellFree(agent.row, agent.col + 1)) possibleMoves.push("right");

    let bestMove = null;
    let bestDist = minDist;

    possibleMoves.forEach(move => {
        let r = agent.row;
        let c = agent.col;

        if (move === "up") r--;
        if (move === "down") r++;
        if (move === "left") c--;
        if (move === "right") c++;

        const dist = Math.abs(r - nearest.row) + Math.abs(c - nearest.col);
        if (dist < bestDist) {
            bestDist = dist;
            bestMove = move;
        }
    });

    if (bestMove) performMove(agent, bestMove);
}

// -------------------- Movement Helpers --------------------

function performMove(agent, direction) {
    let r = agent.row;
    let c = agent.col;

    if (direction === "up") r--;
    if (direction === "down") r++;
    if (direction === "left") c--;
    if (direction === "right") c++;

    moveAgent(agent, r, c);
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
    const cell = cells[row * COLUMNS + col];
    return !cell.querySelector(".agent") && !cell.querySelector(".apple");
}

// -------------------- Rewards --------------------

function collectAdjacentApples(agent) {
    const deltas = [[0,1],[0,-1],[1,0],[-1,0]];

    deltas.forEach(([dr, dc]) => {
        const r = agent.row + dr;
        const c = agent.col + dc;

        if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) return;

        const cell = cells[r * COLUMNS + c];
        const apple = cell.querySelector(".apple");
        if (!apple) return;

        const value = parseInt(apple.dataset.value);

        if (value <= 2) {
            agent.score += value;
            apple.remove();
        } else {
            const helpers = agents.filter(a =>
                Math.abs(a.row - r) + Math.abs(a.col - c) === 1
            );

            if (helpers.length >= 2) {
                helpers.forEach(a => a.score += value);
                apple.remove();
            }
        }
    });
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
