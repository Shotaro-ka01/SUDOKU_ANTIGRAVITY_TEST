document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('sudoku-board');
    const numBtns = document.querySelectorAll('.num-btn');
    const eraseBtn = document.getElementById('erase-btn');
    const hintBtn = document.getElementById('hint-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const diffBtns = document.querySelectorAll('.diff-btn');
    const winOverlay = document.getElementById('win-overlay');
    const playAgainBtn = document.getElementById('play-again-btn');

    let selectedCell = null;
    let cellElements = [];
    let currentDifficulty = 'easy';

    let grid = Array(9).fill().map(() => Array(9).fill(0));
    let solution = Array(9).fill().map(() => Array(9).fill(0));
    let puzzleGrid = Array(9).fill().map(() => Array(9).fill(0));

    // Initialize the Game
    function initGame() {
        const { fullBoard, puzzle } = generatePuzzle(currentDifficulty);
        solution = fullBoard;
        puzzleGrid = puzzle.map(row => [...row]);
        grid = puzzle.map(row => [...row]);

        renderBoard();
    }

    // Generator & Logic
    function generatePuzzle(difficulty) {
        let fullBoard = Array(9).fill().map(() => Array(9).fill(0));
        fillBoard(fullBoard);

        let puzzle = fullBoard.map(row => [...row]);
        let cellsToRemove = difficulty === 'hard' ? 50 : (difficulty === 'medium' ? 40 : 30);

        let cells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                cells.push([r, c]);
            }
        }
        shuffle(cells);

        for (let i = 0; i < cells.length && cellsToRemove > 0; i++) {
            let [r, c] = cells[i];
            let backup = puzzle[r][c];
            puzzle[r][c] = 0;

            let boardCopy = puzzle.map(row => [...row]);
            if (countSolutions(boardCopy) !== 1) {
                puzzle[r][c] = backup;
            } else {
                cellsToRemove--;
            }
        }
        return { fullBoard, puzzle };
    }

    function fillBoard(board) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) {
                    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (let num of nums) {
                        if (isValid(board, r, c, num)) {
                            board[r][c] = num;
                            if (fillBoard(board)) return true;
                            board[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function countSolutions(board) {
        let count = 0;
        function solve() {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (board[r][c] === 0) {
                        for (let num = 1; num <= 9; num++) {
                            if (isValid(board, r, c, num)) {
                                board[r][c] = num;
                                solve();
                                board[r][c] = 0;
                                if (count > 1) return;
                            }
                        }
                        return;
                    }
                }
            }
            count++;
        }
        solve();
        return count;
    }

    function isValid(board, row, col, num) {
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === num && i !== col) return false;
            if (board[i][col] === num && i !== row) return false;
        }
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[startRow + i][startCol + j] === num && (startRow + i !== row || startCol + j !== col)) return false;
            }
        }
        return true;
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // UI Rendering
    function renderBoard() {
        board.innerHTML = '';
        cellElements = [];
        selectedCell = null;

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;

                const val = puzzleGrid[row][col];
                if (val !== 0) {
                    cell.innerText = val;
                    cell.classList.add('given');
                }

                cell.addEventListener('mousedown', () => selectCell(cell, row, col));

                board.appendChild(cell);
                cellElements.push(cell);
            }
        }
    }

    function selectCell(cell, row, col) {
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }

        selectedCell = cell;
        cell.classList.add('selected');

        updateHighlights(row, col, cell.innerText);
    }

    function updateHighlights(row, col, value) {
        cellElements.forEach(cell => {
            cell.classList.remove('highlight', 'same-val');

            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);

            if (r === row || c === col ||
                (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3))) {
                if (cell !== selectedCell) {
                    cell.classList.add('highlight');
                }
            }

            if (value && cell.innerText === value && cell !== selectedCell) {
                cell.classList.add('same-val');
            }
        });
    }

    // Input Handling
    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseInt(btn.dataset.val);
            handleInput(val);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (!selectedCell) return;

        if (e.key >= '1' && e.key <= '9') {
            handleInput(parseInt(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            eraseNumber();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            navigateGrid(e.key);
        }
    });

    function navigateGrid(key) {
        if (!selectedCell) return;
        let r = parseInt(selectedCell.dataset.row);
        let c = parseInt(selectedCell.dataset.col);

        if (key === 'ArrowUp') r = Math.max(0, r - 1);
        if (key === 'ArrowDown') r = Math.min(8, r + 1);
        if (key === 'ArrowLeft') c = Math.max(0, c - 1);
        if (key === 'ArrowRight') c = Math.min(8, c + 1);

        const nextCell = cellElements.find(cell => parseInt(cell.dataset.row) === r && parseInt(cell.dataset.col) === c);
        if (nextCell) {
            selectCell(nextCell, r, c);
        }
    }

    function handleInput(val) {
        if (!selectedCell || selectedCell.classList.contains('given')) return;

        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);

        selectedCell.innerText = val;

        if (!isValid(grid, r, c, val)) {
            selectedCell.classList.add('error');
        } else {
            selectedCell.classList.remove('error');
        }

        grid[r][c] = val;
        selectedCell.classList.add('input');

        selectedCell.classList.remove('animate-pop');
        void selectedCell.offsetWidth;
        selectedCell.classList.add('animate-pop');

        updateHighlights(r, c, val.toString());

        checkWinCondition();
    }

    eraseBtn.addEventListener('click', eraseNumber);

    function eraseNumber() {
        if (!selectedCell || selectedCell.classList.contains('given')) return;
        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);

        grid[r][c] = 0;
        selectedCell.innerText = '';
        selectedCell.classList.remove('input', 'error');
        updateHighlights(r, c, '');
    }

    hintBtn.addEventListener('click', () => {
        if (!selectedCell || selectedCell.classList.contains('given')) return;
        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);

        const correctVal = solution[r][c];
        handleInput(correctVal);
    });

    function showWin() {
        winOverlay.classList.add('show');
    }

    function checkWinCondition() {
        let isComplete = true;
        let isCorrect = true;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    isComplete = false;
                }
                if (grid[r][c] !== solution[r][c]) {
                    isCorrect = false;
                }
            }
        }

        if (isComplete && isCorrect) {
            setTimeout(showWin, 500);
        } else if (isComplete && !isCorrect) {
            setTimeout(() => {
                cellElements.forEach(cell => {
                    if (!cell.classList.contains('given')) {
                        const r = parseInt(cell.dataset.row);
                        const c = parseInt(cell.dataset.col);
                        if (grid[r][c] !== solution[r][c]) {
                            cell.classList.add('error');
                            // remove after a bit
                            setTimeout(() => cell.classList.remove('error'), 1500);
                        }
                    }
                });
            }, 300);
        }
    }

    // Controls
    newGameBtn.addEventListener('click', initGame);

    playAgainBtn.addEventListener('click', () => {
        winOverlay.classList.remove('show');
        initGame();
    });

    diffBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            diffBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDifficulty = e.target.dataset.diff;
            initGame();
        });
    });

    // Start
    initGame();
});
