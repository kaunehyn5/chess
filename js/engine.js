// Stockfishエンジンのラッパー。難易度(skill level 0-20)を指定して最善手を取得する。
class ChessEngine {
  constructor() {
    this.worker = new Worker('js/vendor/stockfish-18-lite-single.js');
    this.worker.onmessage = (e) => this._onMessage(e.data);
    this.send('uci');
    this._bestMoveCallback = null;
  }

  send(cmd) {
    this.worker.postMessage(cmd);
  }

  _onMessage(line) {
    if (typeof line !== 'string') return;
    if (line.startsWith('bestmove')) {
      const move = line.split(' ')[1];
      if (this._bestMoveCallback) {
        const cb = this._bestMoveCallback;
        this._bestMoveCallback = null;
        cb(move);
      }
    }
  }

  // skillLevel: 0(最弱) ~ 20(最強)
  getBestMove(fen, skillLevel, callback) {
    this._bestMoveCallback = callback;
    this.send('setoption name Skill Level value ' + skillLevel);
    this.send('position fen ' + fen);
    const moveTime = 200 + skillLevel * 60;
    this.send('go movetime ' + moveTime);
  }
}
