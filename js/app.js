const PIECE_UNICODE = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

let game = null;
let engine = null;
let mode = null;        // 'pvp' or 'pvc'
let aiSkill = 5;
let aiColor = 'b';      // AIは黒を担当（人が先手）
let aiThinking = false;
let selectedSquare = null;
let legalTargets = [];

const screenMenu = document.getElementById('screen-menu');
const screenGame = document.getElementById('screen-game');
const difficultyPanel = document.getElementById('difficulty-panel');
const statusEl = document.getElementById('status');
const historyEl = document.getElementById('move-history');
const boardEl = document.getElementById('board');

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

document.getElementById('btn-pvp').addEventListener('click', () => {
  mode = 'pvp';
  startGame();
});

document.getElementById('btn-pvc').addEventListener('click', () => {
  difficultyPanel.classList.remove('hidden');
});

document.querySelectorAll('.diff-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    aiSkill = parseInt(btn.dataset.level, 10);
    mode = 'pvc';
    startGame();
  });
});

document.getElementById('btn-restart').addEventListener('click', () => {
  game.reset();
  selectedSquare = null;
  legalTargets = [];
  aiThinking = false;
  renderBoard();
  updateStatus();
  updateHistory();
});

document.getElementById('btn-undo').addEventListener('click', () => {
  if (aiThinking) return;
  game.undo();
  if (mode === 'pvc') {
    game.undo();
  }
  selectedSquare = null;
  legalTargets = [];
  renderBoard();
  updateStatus();
  updateHistory();
});

document.getElementById('btn-menu').addEventListener('click', () => {
  screenGame.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  difficultyPanel.classList.add('hidden');
});

function startGame() {
  screenMenu.classList.add('hidden');
  screenGame.classList.remove('hidden');

  game = new Chess();
  selectedSquare = null;
  legalTargets = [];
  aiThinking = false;

  if (mode === 'pvc' && !engine) {
    engine = new ChessEngine();
  }

  renderBoard();
  updateStatus();
  updateHistory();
}

function renderBoard() {
  boardEl.innerHTML = '';
  const position = game.board(); // 8x8, row0 = rank8 ... row7 = rank1

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = FILES[col];
      const rank = 8 - row;
      const square = file + rank;
      const isLight = (row + col) % 2 === 0;

      const sqEl = document.createElement('div');
      sqEl.className = 'square ' + (isLight ? 'light' : 'dark');
      sqEl.dataset.square = square;

      const piece = position[row][col];
      if (piece) {
        sqEl.textContent = PIECE_UNICODE[piece.color][piece.type];
        sqEl.classList.add(piece.color === 'w' ? 'piece-white' : 'piece-black');
      }

      if (square === selectedSquare) {
        sqEl.classList.add('selected');
      }
      if (legalTargets.includes(square)) {
        sqEl.classList.add(piece ? 'capture-target' : 'move-target');
      }

      sqEl.addEventListener('click', () => onSquareClick(square));
      boardEl.appendChild(sqEl);
    }
  }
}

function onSquareClick(square) {
  if (game.game_over() || aiThinking) return;
  if (mode === 'pvc' && game.turn() === aiColor) return;

  if (selectedSquare && legalTargets.includes(square)) {
    makeMove(selectedSquare, square);
    return;
  }

  const piece = game.get(square);
  if (piece && piece.color === game.turn()) {
    selectedSquare = square;
    legalTargets = game.moves({ square: square, verbose: true }).map((m) => m.to);
  } else {
    selectedSquare = null;
    legalTargets = [];
  }
  renderBoard();
}

function makeMove(from, to) {
  const move = game.move({ from: from, to: to, promotion: 'q' });
  selectedSquare = null;
  legalTargets = [];
  if (move === null) {
    renderBoard();
    return;
  }

  renderBoard();
  updateStatus();
  updateHistory();

  if (mode === 'pvc' && !game.game_over()) {
    triggerAiMove();
  }
}

function triggerAiMove() {
  aiThinking = true;
  statusEl.textContent = 'AI思考中…';
  engine.getBestMove(game.fen(), aiSkill, (bestMove) => {
    if (bestMove && bestMove !== '(none)') {
      game.move({
        from: bestMove.slice(0, 2),
        to: bestMove.slice(2, 4),
        promotion: bestMove.length > 4 ? bestMove.slice(4) : 'q',
      });
      renderBoard();
    }
    aiThinking = false;
    updateStatus();
    updateHistory();
  });
}

function updateStatus() {
  let text = '';
  const turnText = game.turn() === 'w' ? '白' : '黒';

  if (game.in_checkmate()) {
    text = (game.turn() === 'w' ? '黒' : '白') + 'の勝ち（チェックメイト）';
  } else if (game.in_draw()) {
    text = 'ドロー';
  } else if (game.in_check()) {
    text = turnText + 'の番（チェック！）';
  } else {
    text = turnText + 'の番';
  }
  statusEl.textContent = text;
}

function updateHistory() {
  const history = game.history();
  let html = '';
  for (let i = 0; i < history.length; i += 2) {
    const moveNum = i / 2 + 1;
    const white = history[i] || '';
    const black = history[i + 1] || '';
    html += `<div>${moveNum}. ${white} ${black}</div>`;
  }
  historyEl.innerHTML = html;
  historyEl.scrollTop = historyEl.scrollHeight;
}
