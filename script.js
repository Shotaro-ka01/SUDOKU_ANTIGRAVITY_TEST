document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('sudoku-board');
    const numBtns = document.querySelectorAll('.num-btn');
    const eraseBtn = document.getElementById('erase-btn');
    const hintBtn = document.getElementById('hint-btn');
    const notesBtn = document.getElementById('notes-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const diffBtns = document.querySelectorAll('.diff-btn');
    const winOverlay = document.getElementById('win-overlay');
    const playAgainBtn = document.getElementById('play-again-btn');
    const mistakeCountEl = document.getElementById('mistake-count');
    // For timer functionality, note: The base code didn't declare mistakeCountEl properly in the first file block so I'll trust it exists if not shown.
    const startOverlay = document.getElementById('start-overlay');
    const startGameBtn = document.getElementById('start-game-btn');
    const startDiffBtns = document.querySelectorAll('.start-diff-btn');
    const timerDisplay = document.getElementById('timer');
    const bestTimeDisplay = document.getElementById('best-time');
    const finalTimeDisplay = document.getElementById('final-time-display');
    const newBestTimeMsg = document.getElementById('new-best-time-msg');

    // New Game Over Overlay elements
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const continueBtn = document.getElementById('continue-btn');
    const restartBtn = document.getElementById('restart-btn');

    let selectedCell = null;
    let cellElements = [];
    let currentDifficulty = 'easy';

    let grid = Array(9).fill().map(() => Array(9).fill(0));
    let solution = Array(9).fill().map(() => Array(9).fill(0));
    let puzzleGrid = Array(9).fill().map(() => Array(9).fill(0));
    let notes = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));

    let mistakes = 0;
    let hints = 3;
    let notesMode = false;
    let timerInterval = null;
    let secondsElapsed = 0;

    // Local Storage keys
    const BEST_TIMES_KEY = 'sudoku_best_times_v1';

    function getBestTimes() {
        const data = localStorage.getItem(BEST_TIMES_KEY);
        const defaults = { easy: null, medium: null, hard: null, expert: null };
        if (data) {
            return { ...defaults, ...JSON.parse(data) };
        }
        return defaults;
    }

    function saveBestTime(difficulty, timeInSeconds) {
        const times = getBestTimes();
        if (times[difficulty] === null || timeInSeconds < times[difficulty]) {
            times[difficulty] = timeInSeconds;
            localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(times));
            return true;
        }
        return false;
    }

    function formatTime(totalSeconds) {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function updateBestTimeDisplay() {
        const times = getBestTimes();
        if (times[currentDifficulty] !== null) {
            bestTimeDisplay.innerText = formatTime(times[currentDifficulty]);
        } else {
            bestTimeDisplay.innerText = '--:--';
        }
    }

    function startTimer() {
        clearInterval(timerInterval);
        secondsElapsed = 0;
        timerDisplay.innerText = '00:00';
        timerInterval = setInterval(() => {
            secondsElapsed++;
            timerDisplay.innerText = formatTime(secondsElapsed);
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    // Initialize the Game
    function initGame() {
        mistakes = 0;
        hints = 3;
        notesMode = false;
        updateStatusUI();
        if (typeof notesBtn !== 'undefined' && notesBtn) {
            notesBtn.innerText = 'メモ: オフ';
            notesBtn.classList.remove('active');
        }
        notes = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));

        const { fullBoard, puzzle } = generatePuzzle(currentDifficulty);
        solution = fullBoard;
        puzzleGrid = puzzle.map(row => [...row]);
        grid = puzzle.map(row => [...row]);

        renderBoard();
        checkCompletedNumbers();
        updateBestTimeDisplay();
        startTimer();
    }

    function updateStatusUI() {
        if (typeof mistakeCountEl !== 'undefined' && mistakeCountEl) {
            mistakeCountEl.innerText = `${mistakes}/3`;
        }
        hintBtn.innerText = `ヒント (${hints})`;
        if (hints <= 0) {
            hintBtn.classList.add('disabled');
        } else {
            hintBtn.classList.remove('disabled');
        }
    }

    // Generator & Logic
    function generatePuzzle(difficulty) {
        let fullBoard = Array(9).fill().map(() => Array(9).fill(0));
        fillBoard(fullBoard);

        let puzzle = fullBoard.map(row => [...row]);
        let cellsToRemove = difficulty === 'expert' ? 60 : (difficulty === 'hard' ? 50 : (difficulty === 'medium' ? 40 : 30));

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
                } else {
                    // Create notes grid container for empty cells
                    const notesGrid = document.createElement('div');
                    notesGrid.classList.add('notes-grid');
                    for (let i = 1; i <= 9; i++) {
                        const noteItem = document.createElement('div');
                        noteItem.classList.add('note-item');
                        noteItem.dataset.noteVal = i;
                        notesGrid.appendChild(noteItem);
                    }
                    cell.appendChild(notesGrid);
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

            if (value && getCellValue(cell) === value && cell !== selectedCell) {
                cell.classList.add('same-val');
            }
        });
    }

    function getCellValue(cell) {
        if (cell.classList.contains('given') || cell.classList.contains('input')) {
            // Traverse child nodes to find text (ignoring notes container)
            let txt = '';
            cell.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    txt += node.textContent;
                }
            });
            return txt.trim();
        }
        return '';
    }

    function setCellValue(cell, val) {
        // Remove existing text nodes
        Array.from(cell.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                node.remove();
            }
        });

        if (val !== '') {
            cell.appendChild(document.createTextNode(val));
            // Hide notes
            const notesGrid = cell.querySelector('.notes-grid');
            if (notesGrid) notesGrid.style.display = 'none';
        } else {
            // Show notes
            const notesGrid = cell.querySelector('.notes-grid');
            if (notesGrid) notesGrid.style.display = 'grid';
        }
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

        // Prevent input if the number is already fully completed (9 times correctly)
        const btn = Array.from(numBtns).find(b => parseInt(b.dataset.val) === val);
        if (btn && btn.classList.contains('completed')) return;

        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);

        if (notesMode) {
            // If cell already has a main number, don't allow putting notes
            if (grid[r][c] !== 0) return;

            const cellNotes = notes[r][c];
            if (cellNotes.has(val)) {
                cellNotes.delete(val);
            } else {
                cellNotes.add(val);
            }
            renderNotes(selectedCell, r, c);
            return;
        }

        setCellValue(selectedCell, val);
        grid[r][c] = val;

        selectedCell.classList.add('input');

        if (val !== solution[r][c]) {
            selectedCell.classList.add('error');
            mistakes++;
            updateStatusUI();
            if (mistakes >= 3) {
                if (typeof gameOverOverlay !== 'undefined' && gameOverOverlay) {
                    setTimeout(() => gameOverOverlay.classList.add('show'), 500);
                    stopTimer();
                }
            }
        } else {
            selectedCell.classList.remove('error');
            // Remove this number from notes in same row/col/block
            removeNotesForValidInput(r, c, val);
        }

        selectedCell.classList.remove('animate-pop');
        void selectedCell.offsetWidth;
        selectedCell.classList.add('animate-pop');

        updateHighlights(r, c, val.toString());
        checkCompletedNumbers();
        checkWinCondition();
    }

    function renderNotes(cell, r, c) {
        const cellNotes = notes[r][c];
        const noteItems = cell.querySelectorAll('.note-item');
        noteItems.forEach(item => {
            const val = parseInt(item.dataset.noteVal);
            if (cellNotes.has(val)) {
                item.innerText = val;
            } else {
                item.innerText = '';
            }
        });
    }

    function removeNotesForValidInput(r, c, val) {
        for (let i = 0; i < 9; i++) {
            notes[r][i].delete(val);
            notes[i][c].delete(val);

            const cellR = cellElements.find(el => el.dataset.row == r && el.dataset.col == i && !el.classList.contains('given') && grid[r][i] === 0);
            if (cellR) renderNotes(cellR, r, i);

            const cellC = cellElements.find(el => el.dataset.row == i && el.dataset.col == c && !el.classList.contains('given') && grid[i][c] === 0);
            if (cellC) renderNotes(cellC, i, c);
        }

        const startRow = Math.floor(r / 3) * 3;
        const startCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const br = startRow + i;
                const bc = startCol + j;
                notes[br][bc].delete(val);
                const cellB = cellElements.find(el => el.dataset.row == br && el.dataset.col == bc && !el.classList.contains('given') && grid[br][bc] === 0);
                if (cellB) renderNotes(cellB, br, bc);
            }
        }
    }

    function checkCompletedNumbers() {
        let counts = Array(10).fill(0);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] !== 0 && grid[r][c] === solution[r][c]) {
                    counts[grid[r][c]]++;
                }
            }
        }

        numBtns.forEach(btn => {
            const val = parseInt(btn.dataset.val);
            if (counts[val] === 9) {
                btn.classList.add('completed');
                btn.disabled = true;
            } else {
                btn.classList.remove('completed');
                btn.disabled = false;
            }
        });
    }

    eraseBtn.addEventListener('click', eraseNumber);

    function eraseNumber() {
        if (!selectedCell || selectedCell.classList.contains('given')) return;
        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);

        grid[r][c] = 0;
        setCellValue(selectedCell, '');
        selectedCell.classList.remove('input', 'error');
        updateHighlights(r, c, '');
        checkCompletedNumbers();
    }

    if (typeof notesBtn !== 'undefined' && notesBtn) {
        notesBtn.addEventListener('click', () => {
            notesMode = !notesMode;
            if (notesMode) {
                notesBtn.classList.add('active');
                notesBtn.innerText = 'メモ: オン';
            } else {
                notesBtn.classList.remove('active');
                notesBtn.innerText = 'メモ: オフ';
            }
        });
    }

    hintBtn.addEventListener('click', () => {
        if (hints <= 0) return;
        if (!selectedCell || selectedCell.classList.contains('given') || grid[parseInt(selectedCell.dataset.row)][parseInt(selectedCell.dataset.col)] !== 0) return;

        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);

        const correctVal = solution[r][c];
        notesMode = false; // temporarily force disable notes to input the hint
        if (typeof notesBtn !== 'undefined' && notesBtn) {
            notesBtn.classList.remove('active');
            notesBtn.innerText = 'メモ: オフ';
        }

        handleInput(correctVal);
        hints--;
        updateStatusUI();
    });

    function showWin() {
        stopTimer();
        finalTimeDisplay.innerText = `タイム: ${formatTime(secondsElapsed)}`;

        const isNewBest = saveBestTime(currentDifficulty, secondsElapsed);
        if (isNewBest) {
            newBestTimeMsg.style.display = 'block';
        } else {
            newBestTimeMsg.style.display = 'none';
        }

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
    newGameBtn.addEventListener('click', () => {
        stopTimer();
        startOverlay.classList.add('show');
    });

    playAgainBtn.addEventListener('click', () => {
        winOverlay.classList.remove('show');
        startOverlay.classList.add('show');
    });

    if (typeof restartBtn !== 'undefined' && restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (gameOverOverlay) gameOverOverlay.classList.remove('show');
            startOverlay.classList.add('show');
        });
    }

    if (typeof continueBtn !== 'undefined' && continueBtn) {
        continueBtn.addEventListener('click', () => {
            if (gameOverOverlay) gameOverOverlay.classList.remove('show');
            // Resume the timer if it wasn't already running under another block
            startTimer();
            // We need to restore the seconds back to `secondsElapsed - 1` because 
            // `startTimer` resets to 0. Let's fix startTimer or just set `secondsElapsed` manually.
            const currentSeconds = secondsElapsed;
            startTimer();
            secondsElapsed = currentSeconds;
        });
    }

    diffBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            diffBtns.forEach(b => b.classList.remove('active'));
            startDiffBtns.forEach(b => b.classList.remove('active')); // Sync

            const diff = e.target.dataset.diff;
            // set active on the header and the start overlay
            document.querySelectorAll(`[data-diff="${diff}"]`).forEach(b => b.classList.add('active'));

            currentDifficulty = diff;
            // Optionally, we don't restart game right away when clicked in header 
            // but just to stay consistent with original logic:
            if (!startOverlay.classList.contains('show')) {
                initGame();
            }
        });
    });

    startDiffBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            startDiffBtns.forEach(b => b.classList.remove('active'));
            diffBtns.forEach(b => b.classList.remove('active')); // Sync

            const diff = e.target.dataset.diff;
            document.querySelectorAll(`[data-diff="${diff}"]`).forEach(b => b.classList.add('active'));

            currentDifficulty = diff;
        });
    });

    startGameBtn.addEventListener('click', () => {
        startOverlay.classList.remove('show');
        initGame();
    });

    // We don't call initGame() on start anymore. Wait for Start Game button.
    // Sync the initial difficulty displaying in start modal:
    updateBestTimeDisplay();
});
